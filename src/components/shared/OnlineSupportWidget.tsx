'use client'

import { Phone } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function OnlineSupportWidget() {
    const pathname = usePathname()

    if (pathname !== '/dashboard') {
        return null
    }

    return (
        <a
            href="tel:0965577882"
            className="fixed bottom-4 left-4 z-50 hidden w-[204px] flex-col items-center justify-center gap-3 rounded border border-white/70 bg-transparent px-5 py-6 text-white shadow-sm transition-colors hover:border-white md:flex"
            aria-label="Gọi hotline hỗ trợ 0965577882"
        >
            <span className="flex items-center gap-1.5 text-sm font-semibold">
                <Phone className="h-4 w-4" />
                Hotline hỗ trợ
            </span>
            <span className="text-base font-medium">0965577882</span>
        </a>
    )
}
