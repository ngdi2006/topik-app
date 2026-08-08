import { cn } from "@/lib/utils";

interface IndustrialItemIconProps {
  id: string;
  className?: string;
}

export function IndustrialItemIcon({ id, className }: IndustrialItemIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn("h-14 w-14", className)}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {renderIcon(id)}
    </svg>
  );
}

function renderIcon(id: string) {
  if (id === "wrench") {
    return (
      <>
        <path d="M55 8c-6 1-11 6-12 12l8 8-7 7-8-8c-6 1-11 6-12 12L7 56c-3 3-3 8 0 11s8 3 11 0l17-17c6-1 11-6 12-12l-8-8 7-7 8 8c6-1 11-6 12-12 1-4 0-8-2-11l-9 9-9-9 9-9Z" fill="#cbd5e1" stroke="#334155" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="13" cy="61" r="4" fill="#64748b" />
      </>
    );
  }

  if (id === "adjustable-wrench") {
    return (
      <>
        <path d="M54 9 43 20l7 7 11-11c3 9-2 19-11 22L22 66c-3 3-8 3-11 0s-3-8 0-11l28-28C41 18 46 12 54 9Z" fill="#e2e8f0" stroke="#475569" strokeWidth="3" strokeLinejoin="round" />
        <path d="M44 21 57 34" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
      </>
    );
  }

  if (id === "pliers") {
    return (
      <>
        <path d="M36 32 15 58c-3 4-2 9 2 11s8 1 10-3l16-29" fill="#ef4444" stroke="#7f1d1d" strokeWidth="3" />
        <path d="M44 32 65 58c3 4 2 9-2 11s-8 1-10-3L37 37" fill="#0ea5e9" stroke="#075985" strokeWidth="3" />
        <path d="M33 27 20 11l19 10m8 6 13-16-19 10" stroke="#334155" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="40" cy="33" r="6" fill="#f8fafc" stroke="#334155" strokeWidth="3" />
      </>
    );
  }

  if (id === "hammer") {
    return (
      <>
        <path d="M23 16h35l9 9-8 8H23l-7-7 7-10Z" fill="#64748b" stroke="#1e293b" strokeWidth="3" strokeLinejoin="round" />
        <path d="M31 31 56 62c2 3 1 7-2 9s-7 1-9-2L20 38l11-7Z" fill="#f59e0b" stroke="#92400e" strokeWidth="3" />
      </>
    );
  }

  if (id === "phillips-screwdriver" || id === "flat-screwdriver") {
    const isPhillips = id === "phillips-screwdriver";
    return (
      <>
        <path d="M37 7h6l-2 19h-2L37 7Z" fill="#cbd5e1" stroke="#475569" strokeWidth="3" />
        <rect x="36" y="25" width="8" height="23" rx="3" fill="#94a3b8" />
        <rect x="27" y="46" width="26" height="25" rx="9" fill={isPhillips ? "#f97316" : "#2563eb"} stroke={isPhillips ? "#9a3412" : "#1e3a8a"} strokeWidth="3" />
        {isPhillips ? (
          <path d="M34 13h12M40 7v12" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
        ) : (
          <path d="M35 14h10" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
        )}
      </>
    );
  }

  if (id === "tape-measure") {
    return (
      <>
        <rect x="12" y="25" width="38" height="32" rx="10" fill="#facc15" stroke="#854d0e" strokeWidth="3" />
        <path d="M49 34h18v11H49" fill="#f8fafc" stroke="#64748b" strokeWidth="3" />
        <path d="M55 36v6M62 36v6" stroke="#ef4444" strokeWidth="2" />
        <circle cx="31" cy="41" r="8" fill="#fef9c3" stroke="#a16207" strokeWidth="3" />
      </>
    );
  }

  if (id === "nut") {
    return (
      <>
        <path d="M40 9 66 24v32L40 71 14 56V24L40 9Z" fill="#e5e7eb" stroke="#475569" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="40" cy="40" r="14" fill="#f8fafc" stroke="#64748b" strokeWidth="4" />
        <path d="M24 24 56 56M56 24 24 56" stroke="#cbd5e1" strokeWidth="2" />
      </>
    );
  }

  if (id === "washer") {
    return (
      <>
        <circle cx="40" cy="40" r="28" fill="#d1d5db" stroke="#4b5563" strokeWidth="4" />
        <circle cx="40" cy="40" r="15" fill="#f8fafc" stroke="#64748b" strokeWidth="4" />
      </>
    );
  }

  return (
    <>
      <rect x="35" y="12" width="10" height="42" rx="4" fill="#94a3b8" stroke="#334155" strokeWidth="3" />
      <path d="M27 54h26v12H27z" fill="#cbd5e1" stroke="#334155" strokeWidth="3" />
      <path d="M35 19h10M35 28h10M35 37h10" stroke="#f8fafc" strokeWidth="2" />
    </>
  );
}
