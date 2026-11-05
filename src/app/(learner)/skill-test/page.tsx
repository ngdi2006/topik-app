'use client'

import React, { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { LearnerSidebar } from '@/components/shared/LearnerSidebar'
import { LearnerTopbar } from '@/components/shared/LearnerTopbar'
import { SkillTestHub, SkillTestTab } from '@/components/skill-test/SkillTestHub'

function SkillTestContent() {
  const searchParams = useSearchParams()
  const tabParam = (searchParams?.get('tab') as SkillTestTab) || 'mechanical'
  const toolParam = searchParams?.get('tool')

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
      <h1 className="sr-only">Luyện đo và đọc thước kẹp</h1>

      {/* Main Hub Component */}
      <SkillTestHub initialTab={tabParam} initialTool={toolParam === 'digital' || tabParam === 'digital' ? 'digital' : 'mechanical'} />
    </main>
  )
}

export default function SkillTestPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(true)

  return (
    <div className="flex min-h-screen bg-[#f4f6f8]">
      {/* Standard Learner Sidebar */}
      <LearnerSidebar
        desktopOpen={desktopOpen}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="min-w-0 flex-1 flex flex-col">
        <LearnerTopbar
          title="Tay nghề Vòng 2"
          onOpenMobileMenu={() => setMobileOpen(true)}
          onToggleDesktopMenu={() => setDesktopOpen((open) => !open)}
        />

        <Suspense
          fallback={
            <div className="p-8 text-center text-sm text-slate-500">
              Đang tải modul Tay nghề Vòng 2...
            </div>
          }
        >
          <SkillTestContent />
        </Suspense>
      </div>
    </div>
  )
}

