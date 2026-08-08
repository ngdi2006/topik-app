type WorkshopToolIconProps = {
    type: string
    className?: string
}

const outline = '#334155'
const steel = '#cbd5e1'
const steelDark = '#64748b'
const highlight = '#f8fafc'
const orange = '#f97316'
const orangeDark = '#9a3412'
const red = '#ef4444'
const redDark = '#991b1b'
const blue = '#0ea5e9'
const blueDark = '#075985'

function IconFrame({ children, className }: { children: React.ReactNode; className: string }) {
    return (
        <svg
            aria-hidden="true"
            className={className}
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {children}
        </svg>
    )
}

export function WorkshopToolIcon({ type, className = 'w-10 h-10' }: WorkshopToolIconProps) {
    if (type === 'paint_roller') {
        return (
            <IconFrame className={className}>
                <rect x="8" y="10" width="48" height="20" rx="7" fill="#fde68a" stroke="#92400e" strokeWidth="3" />
                <path d="M56 20h9v22H42v10" stroke={steelDark} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="34" y="48" width="16" height="28" rx="7" fill={orange} stroke={orangeDark} strokeWidth="3" />
                <path d="M14 16h36" stroke="#fff7ed" strokeWidth="3" strokeLinecap="round" opacity=".8" />
            </IconFrame>
        )
    }

    if (type === 'paint_brush') {
        return (
            <IconFrame className={className}>
                <path d="M17 8h46v28H17z" fill="#fef3c7" stroke="#92400e" strokeWidth="3" />
                <path d="M17 25h46v11H17z" fill={orange} opacity=".85" />
                <rect x="31" y="35" width="18" height="12" rx="3" fill={steel} stroke={outline} strokeWidth="3" />
                <path d="M34 47h12l5 28H29l5-28Z" fill="#b45309" stroke="#78350f" strokeWidth="3" />
            </IconFrame>
        )
    }

    if (type === 'spray_gun') {
        return (
            <IconFrame className={className}>
                <path d="M10 20h43v25H10z" fill={blue} stroke={blueDark} strokeWidth="3" />
                <path d="M53 27h18v10H53" fill={steel} stroke={outline} strokeWidth="3" />
                <path d="M28 44h17L40 73H25l3-29Z" fill={orange} stroke={orangeDark} strokeWidth="3" />
                <path d="M47 47c8 4 10 10 8 18" stroke={steelDark} strokeWidth="3" strokeLinecap="round" />
            </IconFrame>
        )
    }

    if (['scale', 'electronic_scale', 'pan_scale', 'industrial_scale'].includes(type)) {
        const isPan = type === 'pan_scale'
        return (
            <IconFrame className={className}>
                {isPan ? <>
                    <path d="M40 10v52M15 27h50" stroke={outline} strokeWidth="4" strokeLinecap="round" />
                    <path d="m19 28-10 22h20L19 28Zm42 0L51 50h20L61 28Z" fill="#facc15" stroke="#854d0e" strokeWidth="3" />
                    <rect x="26" y="60" width="28" height="10" rx="4" fill={steelDark} />
                </> : <>
                    <rect x="10" y="18" width="60" height="49" rx="10" fill={type === 'electronic_scale' ? blue : steel} stroke={outline} strokeWidth="3" />
                    <rect x="20" y="27" width="40" height="19" rx="4" fill="#ecfccb" stroke="#365314" strokeWidth="2.5" />
                    <path d="M28 36h24" stroke="#166534" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="29" cy="56" r="4" fill={orange} /><circle cx="42" cy="56" r="4" fill="#22c55e" />
                </>}
            </IconFrame>
        )
    }

    if (type === 'allen_wrench') {
        return (
            <IconFrame className={className}>
                <path d="M19 12h43v10H29v43H19V12Z" fill={steel} stroke={outline} strokeWidth="3" strokeLinejoin="round" />
                <path d="M25 17h32M24 18v41" stroke={highlight} strokeWidth="2.5" strokeLinecap="round" opacity=".8" />
                <path d="m19 65 5 4 5-4M62 12l5 5-5 5" fill={steelDark} stroke={outline} strokeWidth="2" />
            </IconFrame>
        )
    }

    if (type === 'phillips_screwdriver' || type === 'flat_screwdriver' || type === 'screwdriver') {
        const flat = type === 'flat_screwdriver'
        return (
            <IconFrame className={className}>
                <path d={flat ? 'M35 5h10l-2 11h-6L35 5Z' : 'M40 4l7 8-4 6h-6l-4-6 7-8Z'} fill={steel} stroke={outline} strokeWidth="2.5" />
                {flat
                    ? <path d="M35 10h10" stroke={outline} strokeWidth="3" strokeLinecap="round" />
                    : <path d="M34 11h12M40 5v12" stroke={outline} strokeWidth="2.5" strokeLinecap="round" />}
                <path d="M37 17h6v27h-6z" fill={steelDark} />
                <path d="M39 18h2v24h-2z" fill={highlight} opacity=".7" />
                <rect x="25" y="41" width="30" height="34" rx="11" fill={flat ? blue : orange} stroke={flat ? blueDark : orangeDark} strokeWidth="3" />
                <path d="M32 47v21M40 45v25M48 47v21" stroke={flat ? '#bae6fd' : '#fed7aa'} strokeWidth="2.5" strokeLinecap="round" opacity=".9" />
            </IconFrame>
        )
    }

    if (type === 'hammer') {
        return (
            <IconFrame className={className}>
                <path d="m37 28 8 2-9 45-10-2 11-45Z" fill="#b45309" stroke="#78350f" strokeWidth="3" />
                <path d="M13 14h38l8 7-8 9H13V14Z" fill={steelDark} stroke={outline} strokeWidth="3" strokeLinejoin="round" />
                <path d="M51 14c9 0 15 4 17 11-6-3-11-3-16-1l-5-4 4-6Z" fill={steel} stroke={outline} strokeWidth="3" strokeLinejoin="round" />
                <path d="M18 19h30" stroke={highlight} strokeWidth="2.5" strokeLinecap="round" opacity=".65" />
            </IconFrame>
        )
    }

    if (type === 'pliers' || type === 'long_nose_pliers' || type === 'nipper') {
        const longNose = type === 'long_nose_pliers'
        const nipper = type === 'nipper'
        return (
            <IconFrame className={className}>
                {longNose ? (
                    <>
                        <path d="m36 29-8-25h7l6 24" fill={steel} stroke={outline} strokeWidth="2.5" strokeLinejoin="round" />
                        <path d="m44 29 8-25h-7l-6 24" fill={steel} stroke={outline} strokeWidth="2.5" strokeLinejoin="round" />
                    </>
                ) : nipper ? (
                    <>
                        <path d="M37 30 22 8c9 1 16 6 20 17" fill={steel} stroke={outline} strokeWidth="2.5" />
                        <path d="M43 30 58 8c-9 1-16 6-20 17" fill={steel} stroke={outline} strokeWidth="2.5" />
                    </>
                ) : (
                    <>
                        <path d="M37 30C27 24 23 14 27 6l15 20" fill={steel} stroke={outline} strokeWidth="2.5" strokeLinejoin="round" />
                        <path d="M43 30C53 24 57 14 53 6L38 26" fill={steel} stroke={outline} strokeWidth="2.5" strokeLinejoin="round" />
                        <path d="m29 11 8 5M51 11l-8 5" stroke={steelDark} strokeWidth="2" />
                    </>
                )}
                <circle cx="40" cy="31" r="7" fill={steelDark} stroke={outline} strokeWidth="2.5" />
                <circle cx="40" cy="31" r="2" fill={highlight} />
                <path d="M35 36C28 46 22 60 21 74h11c2-11 6-23 10-34" fill={red} stroke={redDark} strokeWidth="3" strokeLinejoin="round" />
                <path d="M45 36c7 10 13 24 14 38H48c-2-11-6-23-10-34" fill={red} stroke={redDark} strokeWidth="3" strokeLinejoin="round" />
                <path d="M25 65h7M48 65h7" stroke="#fecaca" strokeWidth="2.5" strokeLinecap="round" />
            </IconFrame>
        )
    }

    if (type === 'wrench' || type === 'adjustable_wrench') {
        return (
            <IconFrame className={className}>
                <path d="M58 7c-9 1-15 9-14 18L18 51c-5 5-5 13 0 18s13 5 18 0l26-26c9 1 17-5 18-14L68 37 57 26l8-8 8 8c1-8-5-17-15-19Z" fill={steel} stroke={outline} strokeWidth="3" strokeLinejoin="round" />
                <path d="m27 58 28-28" stroke={highlight} strokeWidth="3" strokeLinecap="round" opacity=".75" />
                <circle cx="26" cy="60" r="4" fill={steelDark} />
            </IconFrame>
        )
    }

    if (type === 'ruler') {
        return (
            <IconFrame className={className}>
                <rect x="10" y="18" width="49" height="45" rx="12" fill="#facc15" stroke="#854d0e" strokeWidth="3" />
                <circle cx="34" cy="40" r="12" fill="#fef3c7" stroke="#a16207" strokeWidth="3" />
                <circle cx="34" cy="40" r="5" fill={orange} />
                <path d="M58 31h15v18H58" fill={highlight} stroke={steelDark} strokeWidth="3" />
                <path d="M63 34v8M68 34v5" stroke={red} strokeWidth="2" />
                <path d="M18 24h22" stroke="#fef9c3" strokeWidth="3" strokeLinecap="round" opacity=".8" />
            </IconFrame>
        )
    }

    if (type === 'saw') {
        return (
            <IconFrame className={className}>
                <path d="M7 22c0-8 6-14 14-14h13v20H21v13H7V22Z" fill={red} stroke={redDark} strokeWidth="3" />
                <path d="M28 16h45L65 51H28V16Z" fill={steel} stroke={outline} strokeWidth="3" strokeLinejoin="round" />
                <path d="m29 51 5 7 5-7 5 7 5-7 5 7 5-7 5 7" stroke={outline} strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M35 22h29" stroke={highlight} strokeWidth="2.5" strokeLinecap="round" opacity=".8" />
                <circle cx="19" cy="24" r="5" fill="#7f1d1d" />
            </IconFrame>
        )
    }

    if (type === 'welder') {
        return (
            <IconFrame className={className}>
                <rect x="7" y="17" width="43" height="46" rx="7" fill={blue} stroke={blueDark} strokeWidth="3" />
                <path d="M15 17V9h27v8" stroke={steelDark} strokeWidth="3" strokeLinecap="round" />
                <circle cx="18" cy="29" r="4" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
                <rect x="27" y="26" width="14" height="24" rx="2" fill="#0f172a" />
                <path d="M50 44c12 0 16 5 18 13" stroke={steelDark} strokeWidth="3" strokeLinecap="round" />
                <path d="m68 55 4 8M65 62h10M70 53v12" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
            </IconFrame>
        )
    }

    if (type === 'bearing_puller') {
        return (
            <IconFrame className={className}>
                <path d="M40 6v49" stroke={steel} strokeWidth="7" strokeLinecap="round" />
                <path d="M27 10h26M31 17h18" stroke={outline} strokeWidth="3" strokeLinecap="round" />
                <path d="M17 23h46" stroke={steelDark} strokeWidth="7" strokeLinecap="round" />
                <path d="M18 25c0 23 3 37 16 43M62 25c0 23-3 37-16 43" stroke={steel} strokeWidth="6" strokeLinecap="round" />
                <path d="m14 62 7 10 9-5M66 62l-7 10-9-5" fill={steel} stroke={outline} strokeWidth="2.5" strokeLinejoin="round" />
                <path d="m36 54 4 13 4-13" fill={orange} stroke={orangeDark} strokeWidth="2" />
            </IconFrame>
        )
    }

    if (type === 'lathe_machine') {
        return (
            <IconFrame className={className}>
                <rect x="5" y="59" width="70" height="9" rx="2" fill={outline} />
                <rect x="9" y="24" width="18" height="35" rx="3" fill={blue} stroke={blueDark} strokeWidth="3" />
                <circle cx="26" cy="41" r="11" fill={steelDark} stroke={outline} strokeWidth="3" />
                <circle cx="26" cy="41" r="4" fill={highlight} />
                <rect x="27" y="36" width="31" height="10" rx="4" fill="#b45309" stroke="#78350f" strokeWidth="2.5" />
                <path d="m58 32 13 9-13 9V32Z" fill={steel} stroke={outline} strokeWidth="2.5" />
                <rect x="43" y="47" width="12" height="12" fill={steelDark} stroke={outline} strokeWidth="2" />
                <path d="M13 30h9" stroke="#bae6fd" strokeWidth="2.5" strokeLinecap="round" />
            </IconFrame>
        )
    }

    if (type === 'switch_tool' || type === 'generic_tool' || type === 'hand') {
        return (
            <IconFrame className={className}>
                <rect x="17" y="12" width="46" height="56" rx="8" fill="#1e293b" stroke={steelDark} strokeWidth="3" />
                <rect x="29" y="21" width="22" height="39" rx="10" fill={steelDark} />
                <path d="M40 48 31 31h18L40 48Z" fill={orange} stroke={orangeDark} strokeWidth="2.5" strokeLinejoin="round" />
                <circle cx="40" cy="27" r="5" fill="#22c55e" />
                <path d="M23 18h34" stroke={highlight} strokeWidth="2" strokeLinecap="round" opacity=".45" />
            </IconFrame>
        )
    }

    if (type === 'rust_preventive_oil') {
        return (
            <IconFrame className={className}>
                <path d="M27 8h26v12H27z" fill={orange} stroke={orangeDark} strokeWidth="3" />
                <path d="M23 20h34l5 10v39c0 4-3 7-7 7H25c-4 0-7-3-7-7V30l5-10Z" fill="#f59e0b" stroke={outline} strokeWidth="3" />
                <rect x="24" y="34" width="32" height="27" rx="5" fill="#f8fafc" stroke={steelDark} strokeWidth="2.5" />
                <path d="M40 39c6 8 9 12 9 16a9 9 0 1 1-18 0c0-4 3-8 9-16Z" fill="#2563eb" />
                <path d="M25 25h30" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" />
            </IconFrame>
        )
    }

    if (type === 'drill') {
        return (
            <IconFrame className={className}>
                <path d="M9 15h38c7 0 11 5 11 12v13H9V15Z" fill={blue} stroke={blueDark} strokeWidth="3" />
                <path d="M20 40h17l-3 34H20V40Z" fill={outline} stroke="#0f172a" strokeWidth="3" />
                <path d="M58 24h11l7 4-7 4H58v-8Z" fill={steel} stroke={outline} strokeWidth="2.5" />
                <circle cx="46" cy="27" r="5" fill={orange} />
                <path d="M15 21h20" stroke="#bae6fd" strokeWidth="2.5" strokeLinecap="round" />
            </IconFrame>
        )
    }

    return <WorkshopToolIcon type="screwdriver" className={className} />
}
