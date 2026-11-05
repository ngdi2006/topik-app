'use client'

import { useId, type KeyboardEvent, type ReactNode } from 'react'

interface Props {
  position: number
  maxMm: number
  mmPx: number
  lcdText: string
  unit: 'mm' | 'in'
  isPowerOn: boolean
  isLocked: boolean
  isHold: boolean
  isRelative: boolean
  onPower: () => void
  onZero: () => void
  onUnit: () => void
  onLock: () => void
  onHold: () => void
}

function DeviceButton({ label, onClick, children, disabled = false }: {
  label: string; onClick: () => void; children: ReactNode; disabled?: boolean
}) {
  const activate = () => { if (!disabled) onClick() }
  return <g role="button" aria-label={label} aria-disabled={disabled} tabIndex={disabled ? -1 : 0}
    className="cursor-pointer outline-none focus:brightness-125"
    onPointerDown={e => e.stopPropagation()}
    onClick={e => { e.stopPropagation(); activate() }}
    onKeyDown={(e: KeyboardEvent<SVGGElement>) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate() }
    }}>{children}</g>
}

/** Front elevation with machined edges, extruded sides and independent sliding assembly. */
export function DigitalCaliperModel(p: Props) {
  const id = useId().replace(/:/g, '')
  const paint = (name: string) => `url(#${id}-${name})`
  const offset = p.position * p.mmPx
  const end = 88 + p.maxMm * p.mmPx + 105
  return <>
    <defs>
      <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="1" y2="0.2">
        <stop stopColor="#71787e" /><stop offset=".08" stopColor="#f3f4f3" />
        <stop offset=".25" stopColor="#b8bdc0" /><stop offset=".48" stopColor="#e0e2e1" />
        <stop offset=".72" stopColor="#969da3" /><stop offset="1" stopColor="#dde0e1" />
      </linearGradient>
      <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#6c7279" /><stop offset=".07" stopColor="#fff" />
        <stop offset=".17" stopColor="#e3e4e3" /><stop offset=".66" stopColor="#c4c8cc" />
        <stop offset=".84" stopColor="#f0f1ef" /><stop offset="1" stopColor="#767f89" />
      </linearGradient>
      <linearGradient id={`${id}-case`} x1="0" y1="0" x2=".85" y2="1">
        <stop stopColor="#fbfcfb" /><stop offset=".18" stopColor="#d7dadc" />
        <stop offset=".45" stopColor="#a2a7ac" /><stop offset=".52" stopColor="#e4e6e6" />
        <stop offset=".9" stopColor="#b7bdc2" /><stop offset="1" stopColor="#707980" />
      </linearGradient>
      <linearGradient id={`${id}-lcd`} x1="0" y1="0" x2=".2" y2="1">
        <stop stopColor="#a5b0a1" /><stop offset=".45" stopColor="#c9d2bb" />
        <stop offset="1" stopColor="#a5b29b" />
      </linearGradient>
      <linearGradient id={`${id}-edge`}><stop stopColor="#474d53" /><stop offset=".45" stopColor="#bfc4c6" /><stop offset="1" stopColor="#666e75" /></linearGradient>
      <pattern id={`${id}-brush`} width="4" height="3" patternUnits="userSpaceOnUse">
        <path d="M0 .5H4 M1 2H3" stroke="#fff" strokeWidth=".35" opacity=".24" />
      </pattern>
      <filter id={`${id}-shadow`} x="-20%" y="-30%" width="150%" height="180%">
        <feDropShadow dx="1" dy="4" stdDeviation="3" floodColor="#28333e" floodOpacity=".22" />
      </filter>
    </defs>
    <ellipse cx={end / 2 + 35} cy="279" rx={end / 2} ry="9" fill="#46515a" opacity=".07" />
    {/* The depth rod extends by exactly the jaw displacement. */}
    <path d={`M${end - 20} 131 H${end + offset} l5 4 h-5 v3 H${end - 20}Z`} fill={paint('edge')} stroke="#777f86" strokeWidth=".7" />
    <g filter={paint('shadow')}>
      <path d={`M48 111 H${end} v36 H48Z`} fill={paint('beam')} stroke="#6d747b" />
      <path d={`M48 147 H${end} l4 -4 V114 l-4 -3 v36Z`} fill="#626d77" />
      <path d={`M49 113 H${end - 2}`} stroke="#fff" strokeWidth="1.2" />
      <rect x="48" y="113" width={end - 49} height="32" fill={paint('brush')} />
      <path d={`M48 139 H${end - 4}`} stroke="#293e58" strokeWidth="5" />
      {Array.from({ length: Math.floor(p.maxMm) + 1 }, (_, mm) => {
        const x = 88 + mm * p.mmPx
        return <g key={mm} fill="#27384b" stroke="#344355">
          <path d={`M${x} 134v-${mm % 10 === 0 ? 9.5 : mm % 5 === 0 ? 6.2 : 3.3}`} strokeWidth={mm % 10 === 0 ? 1.2 : .8} />
          {mm % 10 === 0 && <text x={x} y="122.5" textAnchor="middle" stroke="none" fontSize="7.8" fontWeight="500" fontFamily="Arial, sans-serif">{mm}</text>}
        </g>
      })}
      <text x={end - 83} y="123" fill="#304155" fontSize="7" fontFamily="Arial">mm</text>
      <path d={`M${end - 65} 137q24 -23 53 -21`} fill="none" stroke="#30415a" strokeWidth="2.5" />
      <circle cx={end - 8} cy="119" r="3" fill={paint('edge')} stroke="#eee" strokeWidth=".7" />
      <path d={`M${end - 10} 119h4`} stroke="#515b65" strokeWidth=".7" />
      {/* Fixed jaw: the contact plane is x=88, also the scale origin. */}
      <path d="M49 111V48l7 5 11 34 21 24Z" fill={paint('steel')} stroke="#767c82" />
      <path d="M49 48l-4 3v62l4 -2Z" fill="#626a73" />
      <path d="M49 147v80l15 29 24 12V147Z" fill={paint('steel')} stroke="#757d83" />
      <path d="M49 147l-4 3v79l16 29 3 -2 -15 -29Z" fill="#69747d" />
      <path d="M72 246l16 8v14l-24 -12Z" fill="#f5f5f2" />
      <path d="M88 148v119" stroke="#414a53" strokeWidth="1.5" />
      <path d="M51 151v74l14 28" fill="none" stroke="#f7f8f5" strokeWidth="1" />
    </g>
    <g transform={`translate(${offset},0)`} filter={paint('shadow')}>
      {/* Moving jaw faces the fixed jaw, with matching hardened tips. */}
      <path d="M88 112V49l7 -3 2 36 13 29Z" fill={paint('steel')} stroke="#747c83" />
      <path d="M95 46l5 3 2 32 14 30h-6L97 82Z" fill="#65717c" />
      <path d="M88 147v121l17 -12 17 -48 9 -35h140V108H112Z" fill={paint('steel')} stroke="#747d85" />
      <path d="M88 268l6 2 17 -12 17 -48 9 -31h137v-66l-3 -5v65H131l-9 35 -17 48Z" fill="#727d87" />
      <path d="M88 254l18 -11 -1 13 -17 12Z" fill="#f1f2ef" />
      <path d="M88 149v118" stroke="#3f4750" strokeWidth="1.4" />
      <DeviceButton label={p.isLocked ? 'Mở vít hãm' : 'Khóa vít hãm'} onClick={p.onLock}>
        <rect x="204" y="78" width="8" height="15" fill={paint('edge')} />
        <rect x="199" y="74" width="18" height="8" rx="2" fill={paint('beam')} stroke="#60686e" />
        {Array.from({ length: 7 }, (_, n) => <path key={n} d={`M${201 + n * 2} 75v6`} stroke="#626b73" strokeWidth=".7" />)}
        {p.isLocked && <circle cx="208" cy="78" r="2" fill="#c99238" />}
      </DeviceButton>
      {/* Silver moulded enclosure with a dark inset LCD bezel. */}
      <path d="M114 92l145 -3 14 7 2 65 -13 15H113l-9 -9V103Z" fill="#68737e" stroke="#616a73" />
      <path d="M112 90h143l13 6v65l-10 10H112l-9 -8v-63Z" fill={paint('case')} stroke="#8c949b" />
      <path d="M113 93h140l10 5v60" fill="none" stroke="#fff" strokeWidth="1.5" opacity=".8" />
      <rect x="108" y="101" width="101" height="58" rx="3" fill="#303e53" stroke="#777f88" strokeWidth="1.2" />
      <text x="112" y="108" fill="#e6e6e0" fontSize="6" fontFamily="Arial">Mitutoyo</text>
      <rect x="113" y="112" width="91" height="34" rx="1" fill="#111d28" />
      <rect x="115" y="114" width="87" height="30" rx="1" fill={paint('lcd')} />
      <path d="M116 115h85v7l-85 8Z" fill="#fff" opacity=".09" />
      {p.isPowerOn && <g fill="#2d382e" fontFamily="'Courier New', monospace">
        <text x="193" y="138" textAnchor="end" fontSize={p.unit === 'in' ? 20 : 23} fontStyle="italic" letterSpacing="-1.5">{p.lcdText.trim()}</text>
        <text x="199" y="140" fontSize="4.5" textAnchor="end">{p.unit}</text>
        {p.isRelative && <text x="117" y="120" fontSize="4.5">INC</text>}
        {p.isHold && <text x="140" y="120" fontSize="4.5">HOLD</text>}
      </g>}
      <text x="148" y="153" fill="#d3d7d7" fontSize="5" textAnchor="middle">ORIGIN</text>
      <DeviceButton label="Đặt ZERO" onClick={p.onZero} disabled={!p.isPowerOn}>
        <rect x="137" y="155" width="20" height="5" rx="2" fill="#6c9dbd" stroke="#b0c8d6" strokeWidth=".6" />
      </DeviceButton>
      <ellipse cx="237" cy="130" rx="23" ry="29" fill={paint('case')} stroke="#949da4" />
      <path d="M217 130h40" stroke="#8d969e" strokeWidth=".7" />
      <DeviceButton label="Đổi mm / inch" onClick={p.onUnit} disabled={!p.isPowerOn}>
        <path d="M219 126q0 -22 18 -22t18 22Z" fill="#c5cace" fillOpacity=".45" />
        <text x="237" y="119" textAnchor="middle" fill="#69757e" fontSize="5.5">ABSOLUTE</text>
        <text x="237" y="126" textAnchor="middle" fill="#78838a" fontSize="4.5">mm / inch</text>
      </DeviceButton>
      <DeviceButton label="Bật / tắt màn hình" onClick={p.onPower}>
        <path d="M219 134h36q-2 20 -18 20t-18 -20Z" fill="#c4c9cd" fillOpacity=".4" />
        <text x="237" y="144" textAnchor="middle" fill="#69757e" fontSize="6">ON / OFF</text>
      </DeviceButton>
      <DeviceButton label="Giữ số đo HOLD" onClick={p.onHold} disabled={!p.isPowerOn}>
        <rect x="218" y="163" width="37" height="17" rx="3" fill={paint('edge')} stroke="#727c84" />
        {Array.from({ length: 10 }, (_, n) => <path key={n} d={`M${221 + n * 3.3} 164v14`} stroke="#e3e5e4" strokeWidth="1.2" />)}
      </DeviceButton>
      {/* Knurled thumb roller underneath the beam. */}
      <circle cx="279" cy="164" r="13" fill={paint('steel')} stroke="#8b9399" />
      <circle cx="279" cy="164" r="10.5" fill="none" stroke="#e3e5e4" strokeWidth=".8" />
      {Array.from({ length: 19 }, (_, n) => {
        const angle = n * Math.PI * 2 / 19
        return <path key={n} d={`M${279 + Math.cos(angle) * 10.5} ${164 + Math.sin(angle) * 10.5}l${Math.cos(angle) * 2} ${Math.sin(angle) * 2}`} stroke="#747e87" strokeWidth=".7" />
      })}
    </g>
    {p.position > 0 && <g fill="#059669" stroke="#059669" opacity=".8">
      <path d={`M89 227H${88 + offset}`} strokeDasharray="3 3" strokeWidth=".8" />
      <path d={`M89 227l5 -2v4Z M${87 + offset} 227l-5 -2v4Z`} stroke="none" />
    </g>}
  </>
}
