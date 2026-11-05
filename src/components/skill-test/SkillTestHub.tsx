'use client'

import controlStyles from './caliperControls.module.css'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Ruler,
  Cpu,
  Wrench,
  Zap,
  Trophy,
  BookOpen,
  ArrowLeftRight,
} from 'lucide-react'
import { MechanicalCaliperEngine } from './MechanicalCaliperEngine'
import { DigitalCaliperEngine } from './DigitalCaliperEngine'
import { ObjectMeasuringSimulator } from './ObjectMeasuringSimulator'
import { CaliperSpeedDrill } from './CaliperSpeedDrill'
import { MockSkillExamModal } from './MockSkillExamModal'
import { CaliperAnatomy } from './CaliperAnatomy'

export type SkillTestTab =
  | 'anatomy'
  | 'mechanical'
  | 'digital'
  | 'workshop'
  | 'drill'
  | 'exam'

interface SkillTestHubProps {
  initialTab?: SkillTestTab
  initialTool?: 'mechanical' | 'digital'
}

export function SkillTestHub({ initialTab = 'mechanical', initialTool }: SkillTestHubProps) {
  const preferredTool = initialTool ?? (initialTab === 'digital' ? 'digital' : 'mechanical')
  const [activeTab, setActiveTab] = useState<SkillTestTab>(initialTab)
  const [selectedTool, setSelectedTool] = useState<'mechanical' | 'digital'>(preferredTool)
  const [previousRoute, setPreviousRoute] = useState({ tab: initialTab, tool: preferredTool })
  if (previousRoute.tab !== initialTab || previousRoute.tool !== preferredTool) {
    setPreviousRoute({ tab: initialTab, tool: preferredTool })
    setActiveTab(initialTab)
    setSelectedTool(preferredTool)
  }
  const [showToolPicker, setShowToolPicker] = useState(false)
  const [examActive, setExamActive] = useState(false)
  const handleExamActiveChange = useCallback((active: boolean) => {
    setExamActive(active)
    if (active) setShowToolPicker(false)
  }, [])
  const navigationRef = useRef<HTMLDivElement>(null)
  const previousStepRef = useRef<string | null>(null)

  const updateRoute = (tab: SkillTestTab, tool: 'mechanical' | 'digital') => {
    if (window.location.pathname !== '/skill-test') return
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    url.searchParams.set('tool', tool)
    window.history.replaceState(null, '', url)
  }

  useEffect(() => {
    const navigation = navigationRef.current
    const selected = navigation?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
    if (!navigation || !selected) return
    const step = `${selectedTool}-${activeTab}`
    const firstSelection = previousStepRef.current === null
    previousStepRef.current = step
    const revealSelected = (behavior: ScrollBehavior) => {
      const left = selected === navigation.firstElementChild ? 0
        : navigation.scrollLeft + selected.getBoundingClientRect().left - navigation.getBoundingClientRect().left
          - (navigation.clientWidth - selected.clientWidth) / 2
      navigation.scrollTo({ left: Math.max(0, Math.min(left, navigation.scrollWidth - navigation.clientWidth)), behavior })
    }
    revealSelected(firstSelection || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth')
    let width = navigation.clientWidth
    const observer = new ResizeObserver(() => {
      if (width === navigation.clientWidth) return
      width = navigation.clientWidth
      revealSelected('instant')
    })
    observer.observe(navigation)
    return () => observer.disconnect()
  }, [activeTab, selectedTool])

  const tabs = [
    {
      id: 'mechanical',
      label: 'Thước cơ',
      icon: Ruler,
      description: 'Độ chia 0.02mm (ưu tiên), 0.05mm, 0.01mm',
    },
    {
      id: 'digital',
      label: 'Điện tử',
      icon: Cpu,
      description: 'Màn hình LCD, chuẩn hóa phím ZERO',
    },
    {
      id: 'workshop',
      label: 'Đo mẫu',
      icon: Wrench,
      description: 'Đo ngoài, đo trong, đo sâu các chi tiết thực tế',
    },
    {
      id: 'drill',
      label: 'Luyện đọc',
      icon: Zap,
      description: 'Trắc nghiệm phản xạ đọc vạch siêu tốc',
    },
    {
      id: 'exam',
      label: 'Thi thử',
      icon: Trophy,
      description: 'Phòng thi ảo bấm giờ & khẩu lệnh tiếng Hàn',
    },
    {
      id: 'anatomy',
      label: 'Cấu tạo',
      icon: BookOpen,
      description: 'Từ vựng tiếng Hàn về các bộ phận thước',
    },
  ] as const

  return (
    <div className="min-w-0 space-y-3">
      {/* Tab Navigation Pill Bar */}
      <div className="flex min-w-0 items-center gap-2">
      <div ref={navigationRef} aria-label="Các bước luyện tay nghề, vuốt ngang để chọn" className={`${controlStyles.navigation} relative flex min-w-0 flex-1 snap-x snap-proximity gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
        {tabs.filter(tab => (tab.id !== 'mechanical' && tab.id !== 'digital') || tab.id === selectedTool).map((tab, index) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              aria-pressed={isActive}
              aria-current={isActive ? 'step' : undefined}
              onClick={() => {
                setActiveTab(tab.id)
                updateRoute(tab.id, selectedTool)
              }}
              className={`flex min-h-11 min-w-0 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-lg ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <span className="text-[11px] font-bold sm:hidden">{index + 1}</span>
                <Icon className="hidden size-4 sm:block" />
              </span>
              <div className="min-w-0">
                <strong className="block text-xs font-bold leading-tight">
                  {tab.label}
                </strong>
              </div>
            </button>
          )
        })}
      </div>
      <button type="button" aria-label="Đổi thước" title={examActive ? 'Nộp bài trước khi đổi thước' : 'Đổi thước'} disabled={examActive} aria-expanded={showToolPicker} aria-controls="skill-test-tool-picker" onClick={() => setShowToolPicker(open => !open)} className={`${controlStyles.switchTool} flex shrink-0 items-center rounded-lg`}>
        <ArrowLeftRight aria-hidden="true" className="size-4" />
      </button>
      </div>
      {showToolPicker && <div id="skill-test-tool-picker" className={`${controlStyles.toolPicker} grid grid-cols-2 gap-2 border-b border-slate-200 pb-3`} aria-label="Chọn loại thước">
        {(['mechanical', 'digital'] as const).map(tool => <button key={tool} type="button" aria-pressed={selectedTool === tool} onClick={() => {
          setSelectedTool(tool)
          const nextTab = activeTab === 'mechanical' || activeTab === 'digital' ? tool : activeTab
          setActiveTab(nextTab)
          updateRoute(nextTab, tool)
          setShowToolPicker(false)
        }} className={`min-h-11 rounded-lg px-3 text-xs font-semibold ${selectedTool === tool ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700 hover:bg-blue-50'}`}>
          {tool === 'mechanical' ? 'Thước cơ' : 'Điện tử'}
        </button>)}
      </div>}

      {/* Tab Content Panels */}
      <div className="min-w-0">
        {activeTab === 'mechanical' && (
          <div className="space-y-4">
            <MechanicalCaliperEngine
              valueMm={24.32}
              resolution={0.02}
              maxMm={150}
            />
          </div>
        )}

        {activeTab === 'digital' && (
          <div className="space-y-4">
            <DigitalCaliperEngine valueMm={18.5} maxMm={150} />
          </div>
        )}

        {activeTab === 'workshop' && <ObjectMeasuringSimulator key={selectedTool} toolType={selectedTool} />}

        {activeTab === 'drill' && <CaliperSpeedDrill key={selectedTool} toolType={selectedTool} />}

        {activeTab === 'exam' && <MockSkillExamModal key={selectedTool} toolType={selectedTool} onActiveChange={handleExamActiveChange} />}

        {activeTab === 'anatomy' && <CaliperAnatomy />}
      </div>
    </div>
  )
}

