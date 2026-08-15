"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Gift,
  History,
  LayoutDashboard,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react"
import { InterviewSubscriptionDialog } from "@/components/interview/InterviewSubscriptionDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  INDUSTRIES,
  STATUS_ACTION,
  STATUS_LABEL,
  TOPICS,
  topicIdForCategory,
  type IndustryId,
  type InterviewQuestionSummary,
  type LearningStatus,
  type ModuleView,
  type TopicId,
  type TopicProgress,
} from "@/features/second-round-interview/model"
import {
  readMasteredQuestionIds,
  readExamHistory,
  readPreferredIndustry,
  readRecentLearningActivity,
  readReinforcementQuestionIds,
  readTopicDetails,
  needsReinforcement,
  savePreferredIndustry,
  saveRecentLearningActivity,
} from "@/features/second-round-interview/storage"
import { canAccessInterviewTopic, type InterviewAccessSnapshot } from "@/features/interview-access/model"

interface SecondRoundInterviewDashboardProps {
  initialView?: ModuleView
  onBackToDashboard?: () => void
  onMobileBackChange?: (handler: (() => void) | null) => void
  onViewChange?: (view: ModuleView) => void
}

type LaunchMode = "practice" | "mock"

const InterviewPracticeHub = dynamic(
  () => import("@/components/interview/InterviewPracticeHub").then((module) => module.InterviewPracticeHub),
  {
    loading: () => (
      <div className="flex min-h-72 items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <div className="size-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600 motion-reduce:animate-none" />
        <span className="sr-only">Đang mở nội dung luyện tập…</span>
      </div>
    ),
  },
)

const ReinforcementSession = dynamic(
  () => import("@/components/interview/ReinforcementSession").then((module) => module.ReinforcementSession),
  {
    loading: () => (
      <div className="grid min-h-72 place-items-center">
        <div className="size-8 animate-spin rounded-full border-4 border-amber-100 border-t-amber-600 motion-reduce:animate-none" />
        <span className="sr-only">Đang mở phiên củng cố…</span>
      </div>
    ),
  },
)

const NAV_ITEMS = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "practice", label: "Luyện tập", icon: BookOpen },
  { id: "exam", label: "Thi thử", icon: ClipboardCheck },
  { id: "review", label: "Củng cố", icon: RotateCcw },
  { id: "report", label: "Báo cáo", icon: BarChart3 },
] as const satisfies ReadonlyArray<{
  id: ModuleView
  label: string
  icon: typeof LayoutDashboard
}>

const STATUS_STYLE: Record<LearningStatus, string> = {
  "not-started": "border-slate-200 bg-slate-50 text-slate-700",
  learning: "border-blue-200 bg-blue-50 text-blue-700",
  "needs-review": "border-amber-200 bg-amber-50 text-amber-800",
  mastered: "border-emerald-200 bg-emerald-50 text-emerald-700",
}

function formatExpiryDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(value))
}

const TOPIC_STYLE: Record<
  TopicId,
  { icon: string; bar: string; accent: string }
> = {
  introduction: {
    icon: "bg-blue-50 text-blue-700 ring-blue-100",
    bar: "bg-blue-600",
    accent: "from-blue-600 to-violet-500",
  },
  command: {
    icon: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    bar: "bg-indigo-600",
    accent: "from-indigo-500 to-blue-500",
  },
  vocabulary: {
    icon: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
    bar: "bg-fuchsia-600",
    accent: "from-fuchsia-500 to-pink-500",
  },
  math: {
    icon: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    bar: "bg-cyan-600",
    accent: "from-cyan-500 to-blue-500",
  },
  tools: {
    icon: "bg-orange-50 text-orange-700 ring-orange-100",
    bar: "bg-orange-500",
    accent: "from-orange-500 to-amber-500",
  },
  communication: {
    icon: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    bar: "bg-emerald-600",
    accent: "from-emerald-500 to-teal-500",
  },
  situation: {
    icon: "bg-rose-50 text-rose-700 ring-rose-100",
    bar: "bg-rose-600",
    accent: "from-rose-500 to-orange-500",
  },
  safety: {
    icon: "bg-amber-50 text-amber-800 ring-amber-100",
    bar: "bg-amber-500",
    accent: "from-amber-500 to-orange-500",
  },
}

const DEFAULT_TOPIC_STYLE = {
  icon: "bg-slate-50 text-slate-700 ring-slate-200",
  bar: "bg-slate-500",
  accent: "from-slate-500 to-slate-400",
} as const

const INDUSTRY_STYLE: Record<
  IndustryId,
  { icon: string; accent: string; glow: string }
> = {
  "Sản xuất chế tạo": {
    icon: "bg-blue-50 text-blue-700 ring-blue-100",
    accent: "from-blue-600 to-indigo-500",
    glow: "bg-blue-200",
  },
  "Ngư nghiệp": {
    icon: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    accent: "from-cyan-500 to-blue-500",
    glow: "bg-cyan-200",
  },
  "Nông nghiệp": {
    icon: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    accent: "from-emerald-500 to-teal-500",
    glow: "bg-emerald-200",
  },
  "Lâm nghiệp": {
    icon: "bg-green-50 text-green-700 ring-green-100",
    accent: "from-green-600 to-emerald-500",
    glow: "bg-green-200",
  },
  "Xây dựng": {
    icon: "bg-orange-50 text-orange-700 ring-orange-100",
    accent: "from-orange-500 to-amber-500",
    glow: "bg-orange-200",
  },
  "Dịch vụ": {
    icon: "bg-violet-50 text-violet-700 ring-violet-100",
    accent: "from-violet-600 to-fuchsia-500",
    glow: "bg-violet-200",
  },
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5" aria-label="Đang tải dữ liệu">
      <div className="h-44 animate-pulse rounded-3xl bg-slate-200 motion-reduce:animate-none" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            className="h-48 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none"
            key={index}
          />
        ))}
      </div>
      <span className="sr-only">Đang tải…</span>
    </div>
  )
}

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
      <History aria-hidden="true" className="mx-auto mb-3 size-9 text-slate-400" />
      <h3 className="font-bold text-slate-800">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{description}</p>
    </div>
  )
}

export function SecondRoundInterviewDashboard({
  initialView = "overview",
  onBackToDashboard,
  onMobileBackChange,
  onViewChange,
}: SecondRoundInterviewDashboardProps) {
  const [industry, setIndustry] = useState<IndustryId | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [view, setView] = useState<ModuleView>(initialView)
  const [isChangingIndustry, setIsChangingIndustry] = useState(false)
  const [questions, setQuestions] = useState<InterviewQuestionSummary[]>([])
  const [catalogTotals, setCatalogTotals] = useState<Partial<Record<TopicId, number>> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [launchMode, setLaunchMode] = useState<LaunchMode | null>(null)
  const [launchTopicId, setLaunchTopicId] = useState<TopicId | null>(null)
  const [reinforcementTopicId, setReinforcementTopicId] = useState<TopicId | null>(null)
  const [storageRevision, setStorageRevision] = useState(0)
  const [access, setAccess] = useState<InterviewAccessSnapshot | null>(null)
  const [showSubscription, setShowSubscription] = useState(false)

  useEffect(() => {
    setIndustry(readPreferredIndustry())
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    setView(initialView)
  }, [initialView])

  useEffect(() => {
    if (reinforcementTopicId) {
      onMobileBackChange?.(() => setReinforcementTopicId(null))
    } else if (!launchMode) {
      onMobileBackChange?.(null)
    }
  }, [launchMode, onMobileBackChange, reinforcementTopicId])

  const loadQuestions = useCallback(async (selectedIndustry: IndustryId) => {
    setIsLoading(true)
    setError(null)
    setCatalogTotals(null)

    try {
      const response = await fetch(
        `/api/interview-questions?industry=${encodeURIComponent(selectedIndustry)}&summary=1`,
        { cache: "no-store" },
      )

      if (response.status === 401) {
        const nextPath = `${window.location.pathname}${window.location.search}`
        window.location.replace(`/login?next=${encodeURIComponent(nextPath)}`)
        return
      }

      const payload = (await response.json()) as {
        success: boolean
        data?: InterviewQuestionSummary[]
        catalogTotals?: Partial<Record<TopicId, number>>
        access?: InterviewAccessSnapshot
        error?: string
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Không thể tải dữ liệu")
      }

      setQuestions(payload.data ?? [])
      setCatalogTotals(payload.catalogTotals ?? null)
      setAccess(payload.access ?? null)
    } catch {
      setError("Không thể tải dữ liệu học tập. Vui lòng thử lại.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (industry) void loadQuestions(industry)
  }, [industry, loadQuestions])

  const progress = useMemo<TopicProgress[]>(() => {
    if (!isHydrated) return []
    void storageRevision

    const masteredByTopic = readMasteredQuestionIds()

    return TOPICS.map((topic) => {
      const topicQuestions = topic.apiCategory
        ? questions.filter(
            (question) => topicIdForCategory(question.category) === topic.id,
          )
        : []
      const details = readTopicDetails(topic.id)
      const topicQuestionIds = new Set(topicQuestions.map((question) => question.id))
      const relevantDetails = topic.id === "introduction"
        ? Object.values(details)
        : Object.values(details).filter((detail) => topicQuestionIds.has(detail.id))
      const masteredIds = new Set(masteredByTopic[topic.id] ?? [])
      const attemptedIds = new Set(relevantDetails.map((detail) => detail.id))
      const rawIncorrect = relevantDetails.filter(needsReinforcement).length
      const correctCount = relevantDetails.reduce(
        (total, detail) => total + (detail.correctCount || 0),
        0,
      )
      const incorrectCount = relevantDetails.reduce(
        (total, detail) => total + (detail.incorrectCount || 0),
        0,
      )
      const answerCount = correctCount + incorrectCount
      const total = topic.id === "introduction"
        ? 1
        : catalogTotals?.[topic.id] ?? topicQuestions.length
      const mastered = topic.id === "introduction"
        ? Number(masteredIds.has("self-introduction-40-seconds"))
        : Math.min(masteredIds.size, total)
      const attempted = topic.id === "introduction"
        ? Number(attemptedIds.has("self-introduction-40-seconds"))
        : Math.min(attemptedIds.size, total)
      const incorrect = Math.min(rawIncorrect, total)
      let status: LearningStatus = "not-started"

      if (incorrect > 0) status = "needs-review"
      else if (total > 0 && mastered >= total) status = "mastered"
      else if (attempted > 0 || mastered > 0) status = "learning"

      return {
        topicId: topic.id,
        total,
        attempted,
        mastered,
        incorrect,
        accuracy:
          answerCount > 0 ? Math.round((correctCount / answerCount) * 100) : null,
        status,
      }
    })
  }, [catalogTotals, isHydrated, questions, storageRevision])

  const recentActivity = useMemo(() => {
    if (!isHydrated) return null
    void storageRevision
    return readRecentLearningActivity()
  }, [isHydrated, storageRevision])

  const examHistory = useMemo(() => {
    if (!isHydrated || !industry) return []
    void storageRevision
    return readExamHistory(industry)
  }, [industry, isHydrated, storageRevision])

  const progressByTopic = useMemo(
    () => new Map(progress.map((item) => [item.topicId, item])),
    [progress],
  )
  const totalQuestions = progress.reduce((total, item) => total + item.total, 0)
  const totalMastered = progress.reduce((total, item) => total + item.mastered, 0)
  const reviewCount = progress.reduce((total, item) => total + item.incorrect, 0)
  const completion =
    totalQuestions > 0 ? Math.round((totalMastered / totalQuestions) * 100) : 0
  const isProgressUnavailable = isLoading || Boolean(error)
  const nextTopic =
    progress.find((item) => item.status === "learning") ??
    progress.find((item) => item.status === "needs-review") ??
    progress.find((item) => item.total > 0 && item.status === "not-started")
  const weakTopic = progress
    .filter((item) => item.incorrect > 0)
    .sort((a, b) => b.incorrect - a.incorrect)[0]
  const reinforcementTopics = useMemo(() => {
    if (!isHydrated) return []
    void storageRevision
    const now = Date.now()
    const recentThreshold = now - 7 * 24 * 60 * 60 * 1000

    return TOPICS.flatMap((topic) => {
      if (!topic.apiCategory) return []
      const availableIds = new Set(
        questions
          .filter((question) => topicIdForCategory(question.category) === topic.id)
          .map((question) => question.id),
      )
      const details = Object.values(readTopicDetails(topic.id))
        .filter((detail) => availableIds.has(detail.id) && needsReinforcement(detail))
      if (details.length === 0) return []
      return [{
        topic,
        count: details.length,
        repeated: details.filter((detail) => (detail.consecutiveIncorrect ?? Math.max(0, detail.incorrectCount - detail.correctCount)) >= 2).length,
        recent: details.filter((detail) => detail.lastSeen >= recentThreshold).length,
        due: details.filter((detail) => !detail.nextReviewAt || detail.nextReviewAt <= now).length,
      }]
    }).sort((a, b) => b.repeated - a.repeated || b.recent - a.recent || b.count - a.count)
  }, [isHydrated, questions, storageRevision])
  const repeatedReviewCount = reinforcementTopics.reduce((total, item) => total + item.repeated, 0)
  const recentReviewCount = reinforcementTopics.reduce((total, item) => total + item.recent, 0)
  const dueReviewCount = reinforcementTopics.reduce((total, item) => total + item.due, 0)
  const currentIndustry = INDUSTRIES.find((item) => item.id === industry)
  const isExamLocked = access?.hasFullAccess !== true

  const chooseIndustry = (selectedIndustry: IndustryId) => {
    savePreferredIndustry(selectedIndustry)
    setIndustry(selectedIndustry)
    setIsChangingIndustry(false)
    setView("overview")
    onViewChange?.("overview")
  }

  const selectView = (nextView: ModuleView) => {
    setLaunchMode(null)
    setLaunchTopicId(null)
    setView(nextView)
    onViewChange?.(nextView)
  }

  const launchPractice = (topicId?: TopicId) => {
    if (topicId && access && !canAccessInterviewTopic(access, topicId)) {
      setShowSubscription(true)
      return
    }
    if (industry && topicId) {
      saveRecentLearningActivity({ industry, topicId })
    }
    setLaunchTopicId(topicId ?? null)
    setLaunchMode("practice")
  }

  const launchMockExam = () => {
    if (isExamLocked) {
      setShowSubscription(true)
      return
    }
    setLaunchTopicId(null)
    setLaunchMode("mock")
  }

  const launchReinforcement = (topicId: TopicId) => {
    if (access && !canAccessInterviewTopic(access, topicId)) {
      setShowSubscription(true)
      return
    }
    setReinforcementTopicId(topicId)
  }

  if (!isHydrated) {
    return <LoadingSkeleton />
  }

  if (!industry || isChangingIndustry) {
    return (
      <section className="relative mx-auto max-w-6xl bg-transparent px-3 py-2 shadow-none md:px-6 md:py-4 lg:px-7">
        <div className="relative">
          <div className="mb-3 flex items-center justify-between gap-2 sm:mb-5">
            <div className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 sm:px-3 sm:py-1.5 sm:text-xs">
              <Sparkles aria-hidden="true" className="size-3.5" />
              Cá nhân hoá lộ trình
            </div>
            {isChangingIndustry ? (
              <Button
                className="min-h-8 rounded-xl border-slate-200 bg-white px-2.5 text-[11px] font-bold shadow-sm hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 sm:min-h-9 sm:px-3 sm:text-xs"
                onClick={() => setIsChangingIndustry(false)}
                variant="outline"
              >
                <ArrowLeft aria-hidden="true" className="size-3.5" />
                <span className="sm:hidden">Giữ ngành</span>
                <span className="hidden sm:inline">Giữ ngành hiện tại</span>
              </Button>
            ) : null}
          </div>

          <div className="mx-auto mb-4 max-w-2xl text-center sm:mb-6">
            <Badge className="mb-1.5 border border-blue-100 bg-white px-2 py-0.5 text-[10px] text-blue-700 shadow-sm hover:bg-white sm:mb-2">
              Phỏng vấn vòng 2
            </Badge>
            <h1 className="text-balance text-xl font-black tracking-[-0.03em] text-slate-950 sm:text-2xl md:text-3xl">
              Chọn ngành phỏng vấn
            </h1>
            <p className="mx-auto mt-1.5 max-w-xl text-pretty text-xs leading-5 text-slate-600 sm:mt-2 sm:text-sm">
              Chọn đúng ngành đã đăng ký để nhận lộ trình phù hợp.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
          {INDUSTRIES.map((item) => {
            const Icon = item.icon
            const visual = INDUSTRY_STYLE[item.id]
            const isCurrent = industry === item.id
            return (
              <Card
                className={`group relative min-w-0 overflow-hidden border bg-white p-0 shadow-[0_8px_28px_rgba(15,23,42,0.06)] transition-[border-color,box-shadow,transform] hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(15,23,42,0.12)] motion-reduce:transform-none ${
                  isCurrent
                    ? "border-blue-400 ring-2 ring-blue-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
                key={item.id}
              >
                <div
                  aria-hidden="true"
                  className={`h-1 w-full bg-gradient-to-r ${visual.accent}`}
                />
                <div
                  aria-hidden="true"
                  className={`absolute -right-12 -top-10 size-32 rounded-full opacity-30 blur-3xl ${visual.glow}`}
                />
                <div className="relative flex h-full flex-col p-3 sm:p-5">
                  <div className="flex items-start justify-between gap-1.5 sm:gap-3">
                    <div
                      className={`flex size-9 items-center justify-center rounded-xl ring-1 sm:size-11 sm:rounded-2xl ${visual.icon}`}
                    >
                      <Icon aria-hidden="true" className="size-4.5 sm:size-5" />
                    </div>
                    {isCurrent ? (
                      <Badge className="border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] text-blue-700 hover:bg-blue-50 sm:px-2 sm:text-[10px]">
                        <CheckCircle2 aria-hidden="true" className="size-3" />
                        <span className="hidden sm:inline">Đang sử dụng</span>
                        <span className="sm:hidden">Đã chọn</span>
                      </Badge>
                    ) : null}
                  </div>

                  <h2 className="mt-2.5 min-h-9 text-sm font-black leading-[1.15] tracking-tight text-slate-950 sm:mt-4 sm:min-h-0 sm:text-lg">
                    {item.id}
                  </h2>
                  <p className="mt-1 hidden min-h-10 text-sm leading-5 text-slate-600 sm:block">
                    {item.description}
                  </p>

                  <div className="mt-4 hidden items-center gap-2 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500 sm:flex">
                    <BookOpen aria-hidden="true" className="size-4 text-blue-600" />
                    {TOPICS.length} chủ đề luyện tập
                  </div>

                  <Button
                    className={`mt-auto min-h-9 w-full rounded-lg px-1 text-[11px] font-bold focus-visible:ring-2 focus-visible:ring-blue-600 sm:mt-4 sm:min-h-10 sm:rounded-xl sm:px-3 sm:text-sm ${
                      isCurrent
                        ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                        : "bg-slate-950 text-white hover:bg-blue-700"
                    }`}
                    onClick={() => chooseIndustry(item.id)}
                    variant={isCurrent ? "outline" : "default"}
                  >
                    <span className="hidden sm:inline">{isCurrent ? "Tiếp tục ngành này" : "Chọn ngành này"}</span>
                    <span className="sm:hidden">{isCurrent ? "Tiếp tục" : "Chọn"}</span>
                    <ChevronRight aria-hidden="true" className="size-3.5 sm:size-4" />
                  </Button>
                </div>
              </Card>
            )
          })}
          </div>
        </div>
      </section>
    )
  }

  if (reinforcementTopicId && industry) {
    const topic = TOPICS.find((item) => item.id === reinforcementTopicId)
    const questionIds = readReinforcementQuestionIds(reinforcementTopicId)
    if (topic?.apiCategory) {
      return (
        <ReinforcementSession
          topicId={topic.id}
          topicName={topic.name}
          apiCategory={topic.apiCategory}
          industry={industry}
          questionIds={questionIds}
          onBack={() => setReinforcementTopicId(null)}
          onComplete={() => {
            setReinforcementTopicId(null)
            setStorageRevision((revision) => revision + 1)
          }}
        />
      )
    }
  }

  if (launchMode) {
    return (
      <InterviewPracticeHub
        initialIndustry={industry}
        initialMode={launchMode}
        initialTopicId={launchTopicId ?? undefined}
        onMobileBackChange={onMobileBackChange}
        onBackToDashboard={() => {
          setLaunchMode(null)
          setLaunchTopicId(null)
          setStorageRevision((revision) => revision + 1)
        }}
      />
    )
  }

  const renderTopicCards = (onlyReview = false) => {
    const visibleTopics = onlyReview
      ? TOPICS.filter(
          (topic) => (progressByTopic.get(topic.id)?.incorrect ?? 0) > 0,
        )
      : TOPICS

    if (visibleTopics.length === 0) {
      return (
        <EmptyState
          description="Khi bạn trả lời sai, các chủ đề cần củng cố sẽ xuất hiện tại đây."
          title="Chưa có câu nào cần ôn lại"
        />
      )
    }

    return (
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-2">
        {visibleTopics.map((topic) => {
          const item = progressByTopic.get(topic.id)
          const Icon = topic.icon
          const percent =
            item && item.total > 0
              ? Math.round((item.mastered / item.total) * 100)
              : 0
          const status = item?.status ?? "not-started"
          const visual = TOPIC_STYLE[topic.id] ?? DEFAULT_TOPIC_STYLE
          const isLocked = Boolean(access && !canAccessInterviewTopic(access, topic.id))
          const freeLabel = topic.id === "introduction"
            ? "Miễn phí"
            : topic.id === "command"
              ? "5 câu miễn phí"
              : topic.id === "vocabulary"
                ? "5 từ + 5 biển báo"
                : null

          return (
            <Card
              className="group relative h-full min-w-0 cursor-pointer overflow-hidden border-slate-200/80 bg-white p-0 shadow-[0_6px_24px_rgba(15,23,42,0.05)] transition-[transform,box-shadow,border-color] hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_16px_36px_rgba(37,99,235,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transform-none"
              key={topic.id}
              onClick={() => launchPractice(topic.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  launchPractice(topic.id)
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div aria-hidden="true" className="h-1 w-full bg-blue-600 sm:h-1.5" />
              <div aria-hidden="true" className="absolute -right-12 -top-12 size-28 rounded-full bg-blue-500 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-10 motion-reduce:transition-none" />
              <span className="absolute left-1/2 top-1 z-10 -translate-x-1/2 rounded-b-md bg-blue-600 px-2 py-0.5 text-[10px] font-black leading-4 text-white shadow-sm sm:hidden" translate="no">
                {topic.code}
              </span>
              <div className="relative flex h-full flex-col p-2 pt-3.5 sm:p-5">
                <div className="flex min-h-[58px] items-start gap-1.5 sm:min-h-0 sm:gap-3">
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none sm:size-11 sm:rounded-2xl"
                  >
                    <Icon aria-hidden="true" className="size-4 sm:size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-1.5 sm:gap-2">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 sm:gap-1.5">
                        <span className="hidden rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-black text-blue-700 ring-1 ring-blue-100 sm:inline-flex" translate="no">{topic.code}</span>
                        <h3 className="line-clamp-2 min-w-0 text-pretty break-words text-[12px] font-extrabold leading-4 text-slate-950 sm:text-base sm:leading-normal">
                          {topic.name}
                        </h3>
                        {topic.usesAI ? (
                          <span className="inline-flex h-4 shrink-0 items-center justify-center gap-0.5 rounded-full border border-violet-200 bg-violet-50 px-1.5 text-[8px] font-extrabold uppercase tracking-wide text-violet-700 sm:h-auto sm:gap-1 sm:px-2 sm:py-0.5 sm:text-[10px] sm:font-black" title="Nội dung có sử dụng AI">
                            <Sparkles aria-hidden="true" className="size-3" />
                            <span>AI</span>
                          </span>
                        ) : null}
                        {freeLabel ? (
                          <span className="inline-flex h-4 shrink-0 items-center justify-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 text-[8px] font-extrabold uppercase tracking-wide text-emerald-700 sm:h-auto sm:gap-1 sm:px-2 sm:py-0.5 sm:text-[9px] sm:font-black" title="Nội dung có thể học miễn phí">
                            <Gift aria-hidden="true" className="size-3" />
                            <span>{topic.id === "introduction" ? "Free" : topic.id === "command" ? "5 free" : "5+5 free"}</span>
                          </span>
                        ) : null}
                      </div>
                      <Badge className={`hidden sm:inline-flex ${STATUS_STYLE[status]}`} variant="outline">
                        {isLocked ? <LockKeyhole aria-hidden="true" className="size-3.5" /> : status === "mastered" ? (
                          <CheckCircle2 aria-hidden="true" className="size-3.5" />
                        ) : status === "needs-review" ? (
                          <AlertCircle aria-hidden="true" className="size-3.5" />
                        ) : (
                          <Clock3 aria-hidden="true" className="size-3.5" />
                        )}
                        {isLocked ? 'Cần mở khóa' : STATUS_LABEL[status]}
                      </Badge>
                    </div>
                    <p className="mt-1 hidden line-clamp-2 text-xs leading-5 text-slate-600 sm:block sm:text-sm">
                      {topic.description}
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex min-h-[48px] items-center justify-between gap-2 rounded-xl bg-slate-50 px-2 py-1.5 ring-1 ring-slate-100 sm:hidden">
                  <div
                    aria-label={`Tiến độ ${percent}%`}
                    className="relative grid size-10 shrink-0 place-items-center rounded-full"
                    role="progressbar"
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={percent}
                  >
                    <svg aria-hidden="true" className="absolute inset-0 size-full -rotate-90" viewBox="0 0 44 44">
                      <circle className="fill-none stroke-slate-200" cx="22" cy="22" r="18" strokeWidth="4" />
                      <circle
                        className="fill-none stroke-blue-600 transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
                        cx="22"
                        cy="22"
                        r="18"
                        strokeDasharray={113.1}
                        strokeDashoffset={113.1 * (1 - percent / 100)}
                        strokeLinecap="round"
                        strokeWidth="4"
                      />
                    </svg>
                    <strong className="text-[11px] font-black tabular-nums text-slate-900">{percent}%</strong>
                  </div>
                  <div className="min-w-0 text-right">
                    <strong className="block text-sm font-extrabold tabular-nums text-slate-950">
                      {item?.total ?? 0} câu
                    </strong>
                    <span className="block truncate text-[10px] text-slate-500">
                      {item?.mastered ?? 0} đã thuộc
                    </span>
                  </div>
                </div>

                <div className="mt-4 hidden rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-100 sm:block">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 shrink-0 text-center text-sm font-bold tabular-nums text-slate-800 sm:w-10 sm:text-base">
                      {percent}%
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] leading-none sm:text-xs">
                        <span className="font-semibold text-slate-500">Tiến độ</span>
                        <strong className="truncate tabular-nums text-slate-700">
                          {item?.total
                            ? `${item.mastered}/${item.total} câu`
                            : topic.id === "vocabulary"
                              ? "Ngân hàng từ vựng"
                              : "Chưa có nội dung"}
                        </strong>
                      </div>
                      <div
                        aria-label={`Tiến độ ${percent}%`}
                        className="h-1.5 overflow-hidden rounded-full bg-slate-200"
                        role="progressbar"
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={percent}
                      >
                        <div
                          className={`h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${visual.bar}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2.5 border-t border-slate-200/80 pt-2 text-[10px] text-slate-500 sm:text-xs">
                    <span className="min-w-0">Chính xác <strong className="text-slate-800">{item?.accuracy === null || item?.accuracy === undefined ? "Chưa có" : `${item.accuracy}%`}</strong></span>
                    <span aria-hidden="true" className="h-3 w-px bg-slate-200" />
                    <span className="min-w-0">Ôn lại <strong className={item?.incorrect ? "text-amber-700" : "text-slate-800"}>{item?.incorrect ?? 0} câu</strong></span>
                  </div>
                </div>
                <Button
                  className={`hidden mt-auto min-h-8 w-full rounded-lg px-2 text-[11px] font-bold focus-visible:ring-2 focus-visible:ring-blue-600 sm:mt-3 sm:min-h-10 sm:rounded-xl sm:text-sm ${
                    status === "needs-review"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border-slate-300 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                  onClick={() => launchPractice(topic.id)}
                  variant={status === "needs-review" ? "default" : "outline"}
                >
                  {isLocked ? 'Mở khóa toàn bộ' : STATUS_ACTION[status]}
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    )
  }

  const renderTopicTimeline = () => (
    <div className="relative mx-auto max-w-5xl py-1 sm:py-3">
      <div aria-hidden="true" className="absolute bottom-5 left-[27px] top-5 w-px bg-gradient-to-b from-blue-200 via-violet-300 to-amber-200 sm:left-1/2 sm:-translate-x-1/2" />
      <ol className="relative space-y-3 sm:space-y-5">
        {TOPICS.map((topic, index) => {
          const item = progressByTopic.get(topic.id)
          const Icon = topic.icon
          const percent = item && item.total > 0 ? Math.round((item.mastered / item.total) * 100) : 0
          const status = item?.status ?? "not-started"
          const visual = TOPIC_STYLE[topic.id] ?? DEFAULT_TOPIC_STYLE
          const isLocked = Boolean(access && !canAccessInterviewTopic(access, topic.id))
          const isLeft = index % 2 === 0

          return (
            <li className="grid grid-cols-[56px_minmax(0,1fr)] items-center sm:grid-cols-[minmax(0,1fr)_76px_minmax(0,1fr)]" key={topic.id}>
              <button
                aria-label={`${topic.code}. ${topic.name}. Tiến độ ${percent}%`}
                className={`group relative col-start-2 row-start-1 min-w-0 rounded-2xl border border-slate-200/90 bg-white p-2.5 text-left shadow-[0_8px_28px_rgba(15,23,42,0.06)] transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_14px_34px_rgba(37,99,235,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transform-none sm:p-3.5 ${isLeft ? "sm:col-start-1 sm:mr-1" : "sm:col-start-3 sm:ml-1"}`}
                onClick={() => launchPractice(topic.id)}
                type="button"
              >
                <span aria-hidden="true" className={`absolute top-1/2 hidden h-px w-5 -translate-y-1/2 bg-slate-300 sm:block ${isLeft ? "-right-5" : "-left-5"}`} />
                <div className="flex items-center gap-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-black text-blue-700 ring-1 ring-blue-100" translate="no">{topic.code}</span>
                      <strong className="text-sm font-extrabold leading-5 text-slate-950 sm:text-base">{topic.name}</strong>
                      {topic.usesAI ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-black text-violet-700"><Sparkles aria-hidden="true" className="size-3" /> AI</span>
                      ) : null}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-500 sm:text-xs">
                      <span>{item?.mastered ?? 0}/{item?.total ?? 0} câu đã thuộc</span>
                      <span className={item?.incorrect ? "text-amber-700" : "text-slate-500"}>{item?.incorrect ?? 0} câu cần ôn</span>
                      <span className={isLocked ? "text-amber-700" : status === "mastered" ? "text-emerald-700" : "text-slate-500"}>{isLocked ? "Cần mở khóa" : STATUS_LABEL[status]}</span>
                    </span>
                  </span>
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-105 ${visual.icon}`}>
                    <Icon aria-hidden="true" className="size-[18px]" />
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>

              <div
                aria-label={`Tiến độ ${topic.name}: ${percent}%`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={percent}
                className="relative col-start-1 row-start-1 grid size-14 place-items-center justify-self-start rounded-full bg-white shadow-[0_5px_18px_rgba(37,99,235,0.16)] sm:col-start-2 sm:size-16 sm:justify-self-center"
                role="progressbar"
                style={{ background: `conic-gradient(rgb(37 99 235) ${percent * 3.6}deg, rgb(226 232 240) 0deg)` }}
              >
                <span className="grid size-[46px] place-items-center rounded-full bg-white text-xs font-black tabular-nums text-blue-700 sm:size-14 sm:text-sm">{percent}%</span>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )

  return (
    <section className="mx-auto max-w-7xl pb-8 md:pb-12">
      <InterviewSubscriptionDialog open={showSubscription} onOpenChange={setShowSubscription} />
      <header className="relative mb-2 overflow-visible border-0 bg-transparent px-0 pb-1 pl-11 pt-1 shadow-none md:mb-5 md:overflow-hidden md:rounded-[28px] md:border md:border-blue-100 md:bg-gradient-to-br md:from-white md:via-white md:to-blue-50 md:p-6 md:shadow-[0_12px_40px_rgba(30,64,175,0.08)] lg:p-5">
        <div
          aria-hidden="true"
          className="absolute -right-16 -top-20 hidden size-64 rounded-full bg-blue-100/70 blur-3xl md:block"
        />
        <div className="relative -ml-11 flex flex-col justify-between gap-2 md:ml-0 md:gap-4 lg:flex-row lg:items-center lg:gap-5">
          <div className="min-w-0 md:text-left">
            <div className="flex items-center justify-between gap-3">
              <div className="hidden min-w-0 flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 md:flex">
                {onBackToDashboard ? (
                  <button
                    className="rounded-md font-semibold hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    onClick={onBackToDashboard}
                    type="button"
                  >
                    Trang chủ
                  </button>
                ) : null}
                {onBackToDashboard ? <span aria-hidden="true">/</span> : null}
                <span className="text-blue-700">Phỏng vấn vòng 2</span>
              </div>
              {view === "overview" ? (
                <Button
                  className="absolute right-0 top-0 h-8 min-h-8 shrink-0 rounded-lg border-blue-200 bg-white px-2.5 text-xs font-bold text-blue-700 shadow-sm hover:border-blue-300 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-600 md:static md:h-9 md:min-h-9 md:px-3"
                  onClick={() => setIsChangingIndustry(true)}
                  variant="outline"
                >
                  Đổi ngành
                </Button>
              ) : null}
            </div>
            <div className="mt-0 flex items-center justify-center gap-2.5 pt-0 text-center md:mt-3 md:justify-start md:gap-3 md:text-left">
              <div className="hidden size-11 shrink-0 items-center justify-center rounded-[14px] bg-blue-600 text-white shadow-md shadow-blue-200 sm:flex md:size-12 md:rounded-2xl">
                <Target aria-hidden="true" className="size-5 md:size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-extrabold uppercase leading-none tracking-[0.12em] text-blue-600 md:text-xs md:tracking-[0.16em]">
                  Lộ trình cá nhân hoá
                </p>
                <h1 className="mt-1 text-pretty font-[ui-rounded,'Arial_Rounded_MT_Bold',system-ui,sans-serif] text-lg font-extrabold leading-tight tracking-[-0.015em] text-slate-950 sm:text-[1.5rem] lg:text-[1.6rem]">
                  {currentIndustry?.id}
                </h1>
              </div>
            </div>
          </div>
          {view === "overview" ? <div className="self-stretch lg:min-w-[430px]">
            <div className="mx-auto flex w-[88%] max-w-[300px] items-center justify-center gap-2.5 rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-blue-100 md:hidden">
              <div className="relative grid size-12 shrink-0 place-items-center" aria-label={`Tiến độ lộ trình ${isProgressUnavailable ? 0 : completion}%`}>
                <svg aria-hidden="true" className="absolute inset-0 size-full -rotate-90" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" fill="none" r="18" stroke="#dbeafe" strokeWidth="4" />
                  <circle cx="22" cy="22" fill="none" r="18" stroke="#6366f1" strokeDasharray={`${Math.max(0, Math.min(100, isProgressUnavailable ? 0 : completion)) * 1.131} 113.1`} strokeLinecap="round" strokeWidth="4" />
                </svg>
                <strong className="text-xs font-black tabular-nums text-blue-700">{isProgressUnavailable ? "--" : `${completion}%`}</strong>
              </div>
              <div className="min-w-0 md:flex-1">
                <span className="block text-[10px] font-black uppercase tracking-wide text-blue-600">Tiến độ lộ trình</span>
                {access?.expiresAt ? (
                  <div className={`mt-1 flex items-center gap-1.5 text-xs font-bold ${!access.hasFullAccess ? 'text-red-700' : access.daysRemaining <= 7 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    <CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
                    <span className="truncate">{!access.hasFullAccess ? 'Gói đã hết hạn' : `Gói Vòng 2 · còn ${access.daysRemaining} ngày`}</span>
                  </div>
                ) : <span className="mt-1 block text-xs text-slate-500">Bắt đầu học để ghi nhận tiến độ</span>}
              </div>
              {access?.expiresAt && (!access.hasFullAccess || access.daysRemaining <= 7) ? (
                <button className="shrink-0 text-[11px] font-bold text-blue-700" onClick={() => setShowSubscription(true)} type="button">Gia hạn</button>
              ) : null}
            </div>
            <div className="hidden min-w-0 rounded-2xl border border-blue-100 bg-white/95 p-3 shadow-md shadow-blue-100/50 md:block lg:p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 ring-1 ring-blue-100 sm:size-12">
                  <span className="text-sm font-black tabular-nums text-blue-700">
                    {isProgressUnavailable ? "--" : `${completion}%`}
                  </span>
                  <span aria-hidden="true" className="absolute inset-1 animate-pulse rounded-full ring-2 ring-blue-200/60 motion-reduce:animate-none" />
                </div>
              <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div><span className="block text-[10px] font-black uppercase tracking-wide text-blue-600">Tiến độ lộ trình</span><strong className="block text-xs text-slate-900 sm:text-sm">{isProgressUnavailable ? "Chưa tải dữ liệu" : `${totalMastered}/${totalQuestions} câu đã thuộc`}</strong></div>
                    <TrendingUp aria-hidden="true" className="size-4 shrink-0 text-blue-500" />
                  </div>
                  <div
                aria-label={
                  isProgressUnavailable
                    ? "Tiến độ tổng thể chưa tải dữ liệu"
                    : `Tiến độ tổng thể ${completion}%`
                }
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={isProgressUnavailable ? 0 : completion}
                className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100"
                role="progressbar"
              >
                <div
                  className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 transition-[width] duration-700 after:absolute after:inset-0 after:animate-pulse after:bg-white/20 motion-reduce:transition-none motion-reduce:after:animate-none"
                  style={{ width: `${isProgressUnavailable ? 0 : completion}%` }}
                />
              </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 divide-x divide-slate-200 border-t border-slate-100 pt-2.5 text-center">
                {[
                  ["Chủ đề", `${progress.filter((item) => item.status === "mastered").length}/${TOPICS.length}`, CheckCircle2, "text-emerald-600"],
                  ["Cần ôn", `${reviewCount}`, RotateCcw, "text-amber-600"],
                  ["Đã thuộc", `${totalMastered}`, Target, "text-indigo-600"],
                ].map(([label, value, Icon, color]) => (
                  <div className="min-w-0 px-1.5" key={String(label)}>
                    <div className="flex items-center justify-center gap-1"><Icon aria-hidden="true" className={`size-3 ${String(color)}`} /><strong className="text-sm font-black tabular-nums text-slate-950">{String(value)}</strong></div>
                    <span className="mt-0.5 block truncate text-[9px] font-semibold text-slate-500 sm:text-[10px]">{String(label)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div> : null}
        </div>
        {access?.expiresAt ? (
          <div className={`relative mt-4 hidden flex-col gap-2 rounded-xl border px-3 py-2.5 text-xs md:flex md:flex-row md:items-center md:justify-between ${!access.hasFullAccess ? 'border-red-200 bg-red-50 text-red-800' : access.daysRemaining <= 7 ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            <div className="flex min-w-0 items-center gap-2">
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${!access.hasFullAccess ? 'bg-red-100' : access.daysRemaining <= 7 ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                <CalendarClock aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0">
                <strong className="block font-extrabold">
                  {!access.hasFullAccess ? 'Gói Vòng 2 đã hết hạn' : access.daysRemaining <= 7 ? `Gói sắp hết hạn · còn ${access.daysRemaining} ngày` : `Gói Vòng 2 · còn ${access.daysRemaining} ngày`}
                </strong>
                <span className="block text-[11px] opacity-80">Hạn sử dụng: {formatExpiryDate(access.expiresAt)}</span>
              </div>
            </div>
            {(!access.hasFullAccess || access.daysRemaining <= 7) ? (
              <Button className="h-8 shrink-0 rounded-lg px-3 text-xs font-bold" onClick={() => setShowSubscription(true)} size="sm" variant={access.hasFullAccess ? 'outline' : 'default'}>
                {access.hasFullAccess ? 'Gia hạn ngay' : 'Mở lại gói'}
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      <nav
        aria-label="Điều hướng Phỏng vấn vòng 2"
        className="mb-5 grid grid-cols-5 gap-0.5 rounded-2xl border border-slate-200/80 bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.04)] md:mb-7 md:gap-1.5 md:p-1.5"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = view === item.id
          return (
            <button
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 text-[10px] font-bold leading-tight transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 md:min-h-11 md:flex-row md:gap-1.5 md:px-2 md:py-2 md:text-xs lg:min-h-10 lg:gap-2 lg:px-4 lg:text-sm ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
              key={item.id}
              onClick={() => selectView(item.id)}
              type="button"
            >
              <Icon aria-hidden="true" className="size-3.5 shrink-0 md:size-4" />
              <span className="whitespace-nowrap">{item.label}</span>
              {item.id === "exam" && isExamLocked ? <LockKeyhole aria-label="Thuộc gói Phỏng vấn Vòng 2" className="size-3 shrink-0" /> : null}
            </button>
          )
        })}
      </nav>

      {isLoading ? <LoadingSkeleton /> : null}
      {!isLoading && error ? (
        <div
          aria-live="polite"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
        >
          <AlertCircle
            aria-hidden="true"
            className="mx-auto mb-2 size-8 text-red-600"
          />
          <h2 className="font-bold text-red-900">Không thể tải dữ liệu</h2>
          <p className="mt-1 text-sm text-red-800">{error}</p>
          <Button
            className="mt-4 min-h-11"
            onClick={() => void loadQuestions(industry)}
            variant="outline"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Thử lại
          </Button>
        </div>
      ) : null}

      {!isLoading && !error && view === "overview" ? (
        <div className="space-y-3 sm:space-y-5">
          <Card className="relative overflow-hidden border-slate-200/80 bg-white p-3 shadow-[0_10px_32px_rgba(15,23,42,0.07)] sm:p-4">
            <div aria-hidden="true" className="absolute -right-10 -top-14 size-36 rounded-full bg-blue-100/60 blur-3xl" />
            <div className="relative mb-3 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Lộ trình đề xuất</p>
                <h2 className="mt-0.5 text-base font-extrabold text-slate-950 sm:text-lg">Việc nên làm tiếp theo</h2>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 ring-1 ring-blue-100">Theo tiến độ của bạn</span>
            </div>

            <div className="relative space-y-2.5">
              <div aria-hidden="true" className="absolute bottom-7 left-[22px] top-7 w-px bg-gradient-to-b from-blue-300 to-amber-300" />
              <button
                className="group relative grid w-full grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 p-2.5 text-left text-white shadow-md shadow-blue-200/60 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transform-none sm:p-3"
                onClick={() => launchPractice(nextTopic?.topicId)}
                type="button"
              >
                <span className="relative z-10 grid size-11 place-items-center rounded-full border border-white/25 bg-white/15 text-sm font-black shadow-inner backdrop-blur-sm">1</span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-100">Ưu tiên học</span>
                  <strong className="mt-0.5 block truncate text-base font-extrabold sm:text-lg">
                    {nextTopic ? TOPICS.find((topic) => topic.id === nextTopic.topicId)?.name : "Bắt đầu lộ trình"}
                  </strong>
                  <span className="mt-0.5 line-clamp-1 block text-xs text-blue-100 sm:text-sm">
                    {nextTopic?.status === "needs-review"
                      ? `${nextTopic.incorrect} câu đang chờ bạn ôn lại`
                      : nextTopic?.attempted
                        ? `Đã luyện ${nextTopic.attempted}/${nextTopic.total} câu`
                        : "Bắt đầu từ phần phù hợp nhất với bạn"}
                  </span>
                </span>
                <span className="grid size-9 place-items-center rounded-full bg-white text-blue-700 shadow-sm transition-transform group-hover:translate-x-0.5">
                  <ChevronRight aria-hidden="true" className="size-4" />
                </span>
              </button>

              {weakTopic ? (
                <button
                  className="group relative grid w-full grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-white p-2.5 text-left transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 motion-reduce:transform-none sm:p-3"
                  onClick={() => {
                    saveRecentLearningActivity({ industry, topicId: weakTopic.topicId })
                    launchPractice(weakTopic.topicId)
                  }}
                  type="button"
                >
                  <span className="relative z-10 grid size-11 place-items-center rounded-full border-4 border-white bg-amber-100 text-sm font-black text-amber-700 shadow-sm">2</span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700">Cần củng cố</span>
                    <strong className="mt-0.5 block truncate text-sm font-extrabold text-slate-950 sm:text-base">
                      {TOPICS.find((topic) => topic.id === weakTopic.topicId)?.name}
                    </strong>
                    <span className="mt-0.5 block text-xs text-slate-600 sm:text-sm">Ôn lại {weakTopic.incorrect} câu chưa chính xác</span>
                  </span>
                  <span className="grid size-9 place-items-center rounded-full bg-white text-amber-700 shadow-sm ring-1 ring-amber-200 transition-transform group-hover:translate-x-0.5">
                    <RotateCcw aria-hidden="true" className="size-4" />
                  </span>
                </button>
              ) : (
                <div className="relative grid grid-cols-[46px_minmax(0,1fr)] items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-2.5 sm:p-3">
                  <span className="relative z-10 grid size-11 place-items-center rounded-full border-4 border-white bg-emerald-100 text-sm font-black text-emerald-700 shadow-sm">2</span>
                  <span className="min-w-0"><strong className="block text-sm font-extrabold text-emerald-900">Chưa có điểm yếu</strong><span className="mt-0.5 block text-xs text-emerald-700">Tiếp tục duy trì nhịp học hiện tại.</span></span>
                </div>
              )}
            </div>
          </Card>

          <div>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950 sm:text-xl">
                  Lộ trình 8 phần Vòng 2
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  Học lần lượt từ P1 đến P8 hoặc chọn phần cần luyện.
                </p>
              </div>
              <Button onClick={() => selectView("practice")} variant="ghost">
                Xem tất cả
                <ChevronRight aria-hidden="true" className="size-4" />
              </Button>
            </div>
            {renderTopicTimeline()}
          </div>
        </div>
      ) : null}

      {!isLoading && !error && view === "practice" ? (
        <div>
          {renderTopicCards()}
        </div>
      ) : null}

      {!isLoading && !error && view === "review" ? (
        <div className="space-y-3 sm:space-y-5">
          {reinforcementTopics.length > 0 ? (
            <>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(250px,.35fr)] lg:gap-4">
              <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.06)] sm:p-5">
                <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-400" />
                <div aria-hidden="true" className="absolute -right-16 -top-20 size-48 rounded-full bg-blue-100/70 blur-3xl" />
                <div className="relative flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 sm:size-11">
                    <Target aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">Hàng đợi cá nhân hóa</p>
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-800 ring-1 ring-amber-200">{reviewCount} câu cần xử lý</span>
                    </div>
                    <h2 className="mt-1.5 text-balance text-lg font-black leading-tight text-slate-950 sm:text-2xl">Khắc phục từng điểm yếu, không học lại từ đầu</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Phiên ngắn 5 câu theo lộ trình: nghe lại → hiểu lỗi → ghi nhớ → kiểm tra xác nhận.</p>
                  </div>
                </div>
                <Button
                  onClick={() => launchReinforcement(reinforcementTopics[0].topic.id)}
                  className="relative mt-4 min-h-11 w-full bg-blue-600 font-black text-white shadow-md shadow-blue-200 hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 sm:w-auto sm:px-6"
                >
                  Bắt đầu củng cố 5 câu ưu tiên <ChevronRight aria-hidden="true" className="ml-1 size-4" />
                </Button>
              </section>

              <section className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-2.5" aria-label="Tổng quan hàng đợi củng cố">
                {([
                  ["Sai gần đây", recentReviewCount, History, "text-blue-700 bg-blue-50"],
                  ["Sai lặp lại", repeatedReviewCount, AlertCircle, "text-rose-700 bg-rose-50"],
                  ["Đến hạn", dueReviewCount, CalendarClock, "text-amber-700 bg-amber-50"],
                ] as const).map(([label, value, Icon, style]) => (
                  <div key={String(label)} className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3.5 lg:flex-row lg:items-center lg:gap-3">
                    <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${String(style)}`}><Icon aria-hidden="true" className="size-3.5" /></span>
                    <span className="min-w-0"><strong className="mt-2 block text-lg font-black tabular-nums text-slate-950 sm:text-2xl lg:mt-0 lg:text-xl">{String(value)}</strong>
                    <span className="block truncate text-[10px] font-semibold text-slate-600 sm:text-xs">{String(label)}</span></span>
                  </div>
                ))}
              </section>
              </div>

              <section aria-labelledby="reinforcement-topics-title">
                <div className="mb-2.5 flex items-end justify-between gap-3">
                  <div>
                    <h2 id="reinforcement-topics-title" className="text-base font-black text-slate-950 sm:text-lg">Kiến thức cần củng cố</h2>
                    <p className="text-xs text-slate-600">Sắp xếp theo lỗi lặp lại và lỗi gần nhất.</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-black tabular-nums text-slate-700 shadow-sm ring-1 ring-slate-200 sm:text-xs">{reinforcementTopics.length} chủ đề</span>
                </div>
                <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {reinforcementTopics.map(({ topic, count, repeated, recent, due }) => {
                    const Icon = topic.icon
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => launchReinforcement(topic.id)}
                        className="group flex min-h-[76px] w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 sm:p-4"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 ring-1 ring-blue-100 shadow-sm sm:size-11"><Icon aria-hidden="true" className="size-5" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <strong className="text-sm font-extrabold text-slate-950 sm:text-base">{topic.name}</strong>
                            {repeated > 0 ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-black text-rose-700 ring-1 ring-rose-100">{repeated >= 3 ? 'Ưu tiên cao' : 'Cần chú ý'} · {repeated} lỗi lặp</span> : null}
                          </span>
                          <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-600 sm:text-xs">
                            <span>{count} câu cần xử lý</span><span>{recent} sai gần đây</span><span>{due} đến hạn</span>
                          </span>
                        </span>
                        <span className="hidden shrink-0 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition-colors group-hover:border-blue-300 group-hover:bg-blue-600 group-hover:text-white sm:inline-flex">Củng cố 5 câu <ChevronRight aria-hidden="true" className="ml-1 size-3.5" /></span>
                        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-slate-400 sm:hidden" />
                      </button>
                    )
                  })}
                </div>
              </section>
            </>
          ) : (
            <EmptyState
              description="Khi bạn trả lời sai, hệ thống sẽ đưa đúng câu đó vào lộ trình nghe lại và kiểm tra riêng."
              title="Chưa có điểm yếu cần củng cố"
            />
          )}
        </div>
      ) : null}

      {!isLoading && !error && view === "exam" ? (
        <div className="space-y-4 sm:space-y-5">
          <Card className="group relative overflow-hidden border border-blue-200 bg-white p-0 shadow-lg shadow-blue-900/10">
            <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-blue-600" />
            <div className="relative grid gap-4 p-4 sm:p-6 md:grid-cols-[1fr_auto] md:items-center md:p-7">
              <div>
                <Badge className="border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">
                  {isExamLocked ? <LockKeyhole aria-hidden="true" className="size-3.5" /> : <Award aria-hidden="true" className="size-3.5" />}
                  {isExamLocked ? 'Thuộc gói Phỏng vấn Vòng 2' : 'Bài thi chính thức'}
                </Badge>
                <h3 className="mt-3 tracking-tight">
                  <span className="block text-sm font-bold text-blue-600 sm:text-base">Thi thử</span>
                  <span className="mt-0.5 block whitespace-nowrap text-[22px] font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">PHỎNG VẤN VÒNG 2</span>
                </h3>
                <p className="mt-1.5 whitespace-nowrap text-xs leading-5 text-slate-600 sm:text-base sm:leading-6">
                  24 câu mô phỏng bài thi thực tế.
                </p>
                <div className="mt-4 grid max-w-sm grid-cols-2 gap-2 sm:gap-3">
                  {[
                    ["24", "Câu hỏi"],
                    ["50", "Điểm tối đa"],
                  ].map(([value, label]) => (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-1.5 py-2 text-center sm:rounded-2xl sm:px-4 sm:py-3" key={label}>
                      <strong className="block text-lg font-black tabular-nums text-slate-950 sm:text-2xl">{value}</strong>
                      <span className="mt-0.5 block truncate text-[9px] font-semibold text-slate-500 sm:text-xs">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                className="min-h-11 w-full rounded-xl bg-blue-600 px-6 font-black text-white shadow-md shadow-blue-200 transition-[background-color,transform,box-shadow] hover:scale-[1.02] hover:bg-blue-700 hover:shadow-lg motion-reduce:transform-none md:w-auto"
                onClick={launchMockExam}
              >
                {isExamLocked ? 'Mở khóa để thi' : 'Bắt đầu thi ngay'}
                <ChevronRight aria-hidden="true" className="size-5" />
              </Button>
            </div>
          </Card>

          <section aria-labelledby="exam-experiences-title">
            <div className="mb-3">
              <h3 id="exam-experiences-title" className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Trải nghiệm thi thử</h3>
              <p className="mt-0.5 text-xs text-slate-500">Luyện đúng mục tiêu trước và sau mỗi lượt thi.</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
              {[
                { title: "Kiểm tra nhanh", description: "10 câu để khởi động.", badge: "Sắp có", icon: Clock3, disabled: true },
                { title: "Thi theo kỹ năng", description: "Chọn riêng 1 phần thi.", badge: "Sắp có", icon: Target, disabled: true },
                { title: "Thi lại câu sai", description: "Làm lại lỗi của lần trước.", badge: reviewCount > 0 ? `${reviewCount} câu` : "Chưa có lỗi", icon: RotateCcw, disabled: reviewCount === 0, onClick: () => selectView("review") },
                { title: "Lịch sử thi", description: "Xem điểm và tiến bộ.", badge: examHistory.length > 0 ? `${examHistory.length} lượt` : "Chưa có lượt", icon: History, disabled: examHistory.length === 0, onClick: () => selectView("report") },
              ].map((option) => {
                const Icon = option.icon
                return (
                  <button
                    className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:border-slate-200 disabled:hover:shadow-sm motion-reduce:transform-none sm:p-4"
                    disabled={option.disabled}
                    key={option.title}
                    onClick={option.onClick}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                        <Icon aria-hidden="true" className="size-4.5" />
                      </span>
                      <Badge className="max-w-[88px] truncate text-[9px]" variant="secondary">{option.badge}</Badge>
                    </div>
                    <h4 className="mt-3 text-sm font-black leading-tight text-slate-900">{option.title}</h4>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">{option.description}</p>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      ) : null}

      {!isLoading && !error && view === "report" ? (
        <div className="space-y-3 sm:space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 sm:size-10 sm:rounded-2xl">
                <BarChart3 aria-hidden="true" className="size-4.5 sm:size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-black tracking-tight text-slate-950 sm:text-lg">Báo cáo học tập</h2>
                <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">Theo dõi tiến độ luyện tập và thi thử.</p>
              </div>
            </div>
            <span className="ml-auto rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700 sm:text-xs">{currentIndustry?.id}</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            {[
              ["Tiến độ", `${completion}%`, TrendingUp, "bg-blue-50 text-blue-700"],
              ["Đã thành thạo", `${totalMastered}/${totalQuestions}`, Target, "bg-indigo-50 text-indigo-700"],
              ["Cần ôn lại", `${reviewCount}`, RotateCcw, "bg-amber-50 text-amber-700"],
              ["Chủ đề hoàn thành", `${progress.filter((item) => item.status === "mastered").length}/${TOPICS.length}`, CheckCircle2, "bg-emerald-50 text-emerald-700"],
            ].map(([label, value, Icon, iconStyle]) => (
              <Card className="group min-w-0 overflow-hidden border-slate-200 p-3.5 shadow-sm transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md motion-reduce:transform-none sm:p-4" key={String(label)}>
                <div className={`flex size-8 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none ${String(iconStyle)}`}>
                  <Icon aria-hidden="true" className="size-4" />
                </div>
                <p className="mt-3 truncate text-[11px] font-semibold text-slate-500 sm:text-xs">{String(label)}</p>
                <p className="mt-1 text-xl font-black tabular-nums leading-none text-slate-950 sm:text-2xl">{String(value)}</p>
              </Card>
            ))}
          </div>
          {recentActivity || examHistory.length > 0 ? (
            <Card className="overflow-hidden border-slate-200 p-0 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-2">
                  <History aria-hidden="true" className="size-4 text-blue-600" />
                  <h3 className="font-black text-slate-900">Lịch sử</h3>
                </div>
                <Badge variant="secondary">{examHistory.length} lượt thi</Badge>
              </div>
              {recentActivity ? (
                <div className="m-4 flex items-center justify-between gap-3 rounded-xl bg-blue-50 px-3.5 py-3 ring-1 ring-blue-100 sm:mx-5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wide text-blue-600">Học gần nhất</p>
                    <p className="mt-0.5 truncate text-sm font-bold text-slate-900">
                      {TOPICS.find((topic) => topic.id === recentActivity.topicId)?.name}
                    </p>
                  </div>
                  <time className="shrink-0 text-right text-[10px] font-semibold text-slate-500 sm:text-xs" dateTime={recentActivity.updatedAt}>
                    {new Intl.DateTimeFormat("vi-VN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(recentActivity.updatedAt))}
                  </time>
                </div>
              ) : null}
              {examHistory.length > 0 ? (
                <div className="divide-y divide-slate-100 border-t border-slate-100 px-4 sm:px-5">
                  {examHistory.slice(0, 5).map((result) => (
                    <div className="flex items-center justify-between gap-3 py-3.5" key={result.id}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800">THI THỬ PHỎNG VẤN VÒNG 2</p>
                        <time className="text-xs text-slate-500" dateTime={result.completedAt}>
                          {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(result.completedAt))}
                        </time>
                      </div>
                      <Badge className="flex shrink-0 flex-col items-end gap-0 bg-blue-100 px-2.5 py-1 text-blue-800 hover:bg-blue-100">
                        <span className="text-[10px] font-black tabular-nums">{result.score}/{result.totalScore} điểm</span>
                        <span className="text-[9px] font-bold">{typeof result.correctCount === "number" ? result.correctCount : "—"} đúng · {typeof result.incorrectCount === "number" ? result.incorrectCount : "—"} sai</span>
                      </Badge>
                    </div>
                  ))}
                  </div>
              ) : null}
            </Card>
          ) : (
            <EmptyState
              description="Hoàn thành một phiên luyện tập hoặc thi thử để xem lịch sử."
              title="Chưa có kết quả"
            />
          )}
        </div>
      ) : null}
    </section>
  )
}
