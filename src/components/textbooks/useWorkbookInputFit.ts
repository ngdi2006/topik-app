"use client"

import { useLayoutEffect, type RefObject } from "react"

type AnswerControl = HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement

// Measure the rendered text, including Korean IME output, rather than guessing
// its width from a character count. Keep the unscaled CSS value for zoom/resize.
export function useWorkbookInputFit(root: RefObject<HTMLDivElement | null>, content: unknown) {
  useLayoutEffect(() => {
    const container = root.current
    if (!container) return
    const controls = Array.from(container.querySelectorAll<AnswerControl>("[data-input-fit]"))
    const originals = new Map(controls.map(node => [node, node.dataset.inputFitBase || node.style.fontSize]))
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    const fit = () => {
      for (const node of controls) {
        const original = originals.get(node) || ""
        node.dataset.inputFitBase = original
        node.style.fontSize = original
        if (!node.clientWidth || !context) continue
        const css = getComputedStyle(node)
        const base = parseFloat(css.fontSize)
        const text = node instanceof HTMLButtonElement ? node.textContent || "" : node.value
        if (!text) continue
        const width = node.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight) - 2
        const fits = (size: number) => {
          node.style.fontSize = `${size}px`
          if (node instanceof HTMLInputElement) {
            context.font = `${css.fontWeight} ${size}px ${css.fontFamily}`
            return context.measureText(text).width <= width
          }
          return node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1
        }
        if (fits(base)) continue
        // Prefer readable text; exceptionally long answers can still be opened
        // in the full editor instead of being reduced to unreadable pixels.
        let lower = Math.min(base, width < 140 ? 6 : 8)
        let upper = base
        for (let step = 0; step < 10; step++) {
          const size = (lower + upper) / 2
          if (fits(size)) lower = size
          else upper = size
        }
        node.style.fontSize = `${lower}px`
      }
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(container)
    let active = true
    void document.fonts.ready.then(() => { if (active) fit() })
    return () => { active = false; observer.disconnect() }
  }, [root, content])
}
