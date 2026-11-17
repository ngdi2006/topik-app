"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { answerKey, fieldAnswered, fieldTotal, workbookAnswerFields, type WorkbookAnswer, type WorkbookPage, type WorkbookUnitProgress, type WorkbookValue } from "@/lib/textbooks/workbook"

type Page = { pageNumber: number; workbook: WorkbookPage | null }
type Pending = { answer: WorkbookAnswer; revision: number }
type ResponseData = { userId: string; canEdit: boolean; canManageAnswerKeys?: boolean; pages: Page[]; answers: WorkbookAnswer[]; progress: WorkbookUnitProgress[] }
export type WorkbookSaveStatus = "loading" | "saved" | "saving" | "offline" | "error"

export function useWorkbook(bookId: string, unitId: string | undefined, enabled: boolean) {
  const [pages, setPages] = useState<Page[]>([])
  const [answers, setAnswers] = useState<Record<string, WorkbookValue>>({})
  const [status, setStatus] = useState<WorkbookSaveStatus>("loading")
  const [error, setError] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [canManageAnswerKeys, setCanManageAnswerKeys] = useState(false)
  const [loadedUnit, setLoadedUnit] = useState<string>()
  const [reload, setReload] = useState(0)
  const [serverProgress, setServerProgress] = useState<WorkbookUnitProgress[]>([])
  const pending = useRef(new Map<string, Pending>())
  const unitCache = useRef(new Map<string, Page[]>())
  const userId = useRef<string | null>(null)
  const sequence = useRef(0)
  const saving = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const storageKey = useCallback(() => userId.current ? `workbook-pending:v1:${userId.current}:${bookId}` : null, [bookId])
  const persist = useCallback(() => {
    const key = storageKey()
    if (!key) return
    try {
      if (pending.current.size) localStorage.setItem(key, JSON.stringify([...pending.current.values()].map(item => item.answer)))
      else localStorage.removeItem(key)
    } catch { /* Server save remains available if browser storage is full. */ }
  }, [storageKey])

  const flush = useCallback(async () => {
    if (saving.current || !pending.current.size || !userId.current) return
    saving.current = true
    setStatus("saving")
    try {
      while (pending.current.size) {
        const snapshot: Array<[string, Pending]> = []
        let bytes = 0
        for (const entry of pending.current.entries()) {
          const size = new TextEncoder().encode(JSON.stringify(entry[1].answer)).length
          if (snapshot.length && (snapshot.length >= 10 || bytes + size > 50000)) break
          snapshot.push(entry); bytes += size
        }
        const response = await fetch(`/api/textbooks/${bookId}/workbook`, {
          method: "POST", headers: { "content-type": "application/json" }, keepalive: true,
          body: JSON.stringify({ userId: userId.current, answers: snapshot.map(([, item]) => ({ pageNumber: item.answer.pageNumber, fieldId: item.answer.fieldId, value: item.answer.value })) }),
        })
        if (!response.ok) {
          const result = await response.json().catch(() => null)
          throw new Error(result?.error || "Chưa lưu được câu trả lời")
        }
        for (const [key, item] of snapshot) if (pending.current.get(key)?.revision === item.revision) pending.current.delete(key)
        persist()
      }
      setStatus("saved")
      setError(null)
    } catch (cause) {
      persist()
      setStatus(navigator.onLine ? "error" : "offline")
      setError(cause instanceof Error ? cause.message : "Chưa lưu được câu trả lời")
    } finally { saving.current = false }
  }, [bookId, persist])

  useEffect(() => {
    if (!enabled || !unitId) return
    const controller = new AbortController()
    setLoadedUnit(undefined)
    setPages([])
    setError(null)
    void fetch(`/api/textbooks/${bookId}/workbook?unitId=${unitId}`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Không tải được bài tập tương tác. Hãy thử lại.")
        return response.json() as Promise<ResponseData>
      }).then(data => {
        if (controller.signal.aborted) return
        if (userId.current !== data.userId) {
          pending.current.clear()
          unitCache.current.clear()
          userId.current = data.userId
          setAnswers({})
          try {
            const recovered = JSON.parse(localStorage.getItem(storageKey()!) || "[]") as WorkbookAnswer[]
            if (Array.isArray(recovered)) for (const answer of recovered) {
              if (Number.isInteger(answer.pageNumber) && typeof answer.fieldId === "string" && typeof answer.updatedAt === "string") {
                pending.current.set(answerKey(answer.pageNumber, answer.fieldId), { answer, revision: ++sequence.current })
              }
            }
          } catch { /* A malformed local backup must not break the book. */ }
        }
        for (const answer of data.answers) {
          const key = answerKey(answer.pageNumber, answer.fieldId)
          const local = pending.current.get(key)
          // A server timestamp can be newer than a still-pending edit made while
          // an earlier save was in flight. Only discard an identical answer.
          if (local && JSON.stringify(local.answer.value) === JSON.stringify(answer.value)) pending.current.delete(key)
        }
        setAnswers(current => {
          const next = { ...current }
          for (const answer of data.answers) next[answerKey(answer.pageNumber, answer.fieldId)] = answer.value
          for (const [key, item] of pending.current) next[key] = item.answer.value
          return next
        })
        const answerPages = data.pages.map(page => ({ ...page, workbook: page.workbook ? { ...page.workbook, fields: workbookAnswerFields(page.workbook.fields) } : null }))
        unitCache.current.set(unitId, answerPages)
        setPages(answerPages)
        setCanEdit(data.canEdit)
        setCanManageAnswerKeys(data.canManageAnswerKeys === true)
        setLoadedUnit(unitId)
        setStatus(pending.current.size ? "saving" : "saved")
        persist()
        void flush()
      }).catch(cause => { if (!controller.signal.aborted) { setStatus("error"); setError(cause.message) } })
    return () => controller.abort()
  }, [bookId, enabled, flush, persist, reload, storageKey, unitId])

  useEffect(() => {
    if (!enabled) return
    let active = true
    void fetch(`/api/textbooks/${bookId}/workbook?summary=1`, { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(data => { if (active && data) setServerProgress(data.progress || []) }).catch(() => undefined)
    return () => { active = false }
  }, [bookId, enabled])

  useEffect(() => {
    if (!enabled) return
    const retry = () => { void flush() }
    const onHidden = () => { if (document.visibilityState === "hidden") { persist(); void flush() } }
    window.addEventListener("online", retry)
    window.addEventListener("pagehide", retry)
    document.addEventListener("visibilitychange", onHidden)
    const interval = setInterval(retry, 15000)
    return () => {
      if (timer.current) clearTimeout(timer.current)
      window.removeEventListener("online", retry)
      window.removeEventListener("pagehide", retry)
      document.removeEventListener("visibilitychange", onHidden)
      clearInterval(interval)
      persist()
      void flush()
    }
  }, [enabled, flush, persist])

  const change = useCallback((pageNumber: number, fieldId: string, value: WorkbookValue) => {
    if (!userId.current) return
    const key = answerKey(pageNumber, fieldId)
    const answer = { pageNumber, fieldId, value, updatedAt: new Date().toISOString() }
    pending.current.set(key, { answer, revision: ++sequence.current })
    setAnswers(current => ({ ...current, [key]: value }))
    persist()
    setStatus("saving")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flush() }, 600)
  }, [flush, persist])

  const progress = useMemo(() => {
    const result = new Map(serverProgress.map(item => [item.unitId, item]))
    const cached = new Map(unitCache.current)
    if (loadedUnit) cached.set(loadedUnit, pages)
    for (const [id, definitions] of cached) {
      let total = 0; let answered = 0
      for (const page of definitions) for (const field of page.workbook?.fields || []) {
        total += fieldTotal(field)
        answered += fieldAnswered(field, answers[answerKey(page.pageNumber, field.id)])
      }
      result.set(id, { unitId: id, total, answered })
    }
    return result
  }, [answers, loadedUnit, pages, serverProgress])

  return { pages, answers, status, error, canEdit, canManageAnswerKeys, userId: userId.current, progress, ready: loadedUnit === unitId && !!unitId, change, refresh: () => setReload(value => value + 1), retry: () => { if (loadedUnit !== unitId) setReload(value => value + 1); else void flush() } }
}
