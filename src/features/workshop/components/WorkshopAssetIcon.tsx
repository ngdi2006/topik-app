'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Box } from 'lucide-react'
import { WorkshopToolIcon } from '@/components/interview/WorkshopToolIcon'
import { getWorkshopAsset, resolveWorkshopAssetId } from '../assetRegistry'

type WorkshopAssetIconProps = {
    assetId: string
    className?: string
    size?: number
    draggable?: boolean
    title?: string
}

export function WorkshopAssetIcon({ assetId, className = '', size = 48, draggable = false, title }: WorkshopAssetIconProps) {
    const asset = getWorkshopAsset(assetId)
    const [imageFailed, setImageFailed] = useState(false)
    const label = title || asset?.nameVi || asset?.nameKo || assetId

    if (!asset) {
        return <span role="img" aria-label={title || assetId} title={`Asset cũ: ${assetId}`} className={`inline-grid place-items-center text-slate-400 ${className}`} style={{ width: size, height: size }}><WorkshopToolIcon type={assetId} className="h-full w-full" /></span>
    }

    if (imageFailed) {
        return <span role="img" aria-label={label} title={label} className={`inline-grid place-items-center ${className}`} style={{ width: size, height: size }}>
            {asset.type === 'tool' || asset.type === 'power_tool' || asset.type === 'measuring_tool'
                ? <WorkshopToolIcon type={asset.fallbackIconId || resolveWorkshopAssetId(assetId)} className="h-full w-full" />
                : <Box className="size-2/3 text-slate-400" />}
        </span>
    }

    return <span className={`relative inline-block overflow-hidden ${className}`} style={{ width: size, height: size }} title={label}>
        <Image
            src={asset.image}
            alt={label}
            fill
            draggable={draggable}
            sizes={`${size}px`}
            className="object-contain"
            onError={() => setImageFailed(true)}
        />
    </span>
}
