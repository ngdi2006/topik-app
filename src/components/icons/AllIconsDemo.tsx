import React from 'react';
import { IconWrapper } from './base/IconWrapper';
import { IconProps } from './base/IconProps';

// ============ DEMO ICONS - EDMICRO STYLE ============
// Style constraints applied:
// - Flat canvas, no gradients
// - Primary: #04004d (Dark Navy)
// - Secondary/Accent: #bf1f2b (Topik Red)
// - Background/Surface: #f1faee (Light Cream)
// - Inner fills: #ffffff (White)
// - Shapes: 2px consistent strokes, rounded caps and joins
// - Elevation: Soft rgba shadows for depth (Level 1)

const SharedDefs = () => (
    <defs>
        <filter id="edmicro-shadow-red" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="#bf1f2b" floodOpacity="0.1" />
        </filter>
        <filter id="edmicro-shadow-navy" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="#04004d" floodOpacity="0.1" />
        </filter>
    </defs>
);

// ============ NAVIGATION ICONS ============
export const HomeIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Home" strokeWidth={2} className={`transition-all duration-300 hover:-translate-y-1 ${props.className || ''}`}>
        <SharedDefs />
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#f1faee" stroke="none" filter="url(#edmicro-shadow-navy)" />
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="#04004d" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M9 22V12h6v10" fill="#ffffff" stroke="#bf1f2b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </IconWrapper>
);

export const MenuIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Menu" strokeWidth={2.5} className={`transition-all duration-300 hover:scale-105 ${props.className || ''}`}>
        <SharedDefs />
        <line x1="4" y1="12" x2="20" y2="12" stroke="#bf1f2b" strokeLinecap="round" />
        <line x1="4" y1="6" x2="20" y2="6" stroke="#04004d" strokeLinecap="round" />
        <line x1="4" y1="18" x2="14" y2="18" stroke="#04004d" strokeLinecap="round" />
    </IconWrapper>
);

export const SearchIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Search" strokeWidth={2} className={`transition-all duration-300 hover:scale-105 ${props.className || ''}`}>
        <SharedDefs />
        <circle cx="11" cy="11" r="8" fill="#f1faee" stroke="#04004d" filter="url(#edmicro-shadow-navy)" />
        <path d="M16.5 16.5l5 5" stroke="#bf1f2b" strokeLinecap="round" strokeWidth={2.5} />
    </IconWrapper>
);

export const ArrowLeftIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Back" strokeWidth={2.5} className={`transition-all duration-300 hover:-translate-x-1 ${props.className || ''}`}>
        <SharedDefs />
        <path d="M19 12H5" stroke="#04004d" strokeLinecap="round" />
        <path d="M12 19l-7-7 7-7" stroke="#bf1f2b" strokeLinecap="round" strokeLinejoin="round" />
    </IconWrapper>
);

export const ArrowRightIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Forward" strokeWidth={2.5} className={`transition-all duration-300 hover:translate-x-1 ${props.className || ''}`}>
        <SharedDefs />
        <path d="M5 12h14" stroke="#04004d" strokeLinecap="round" />
        <path d="M12 5l7 7-7 7" stroke="#bf1f2b" strokeLinecap="round" strokeLinejoin="round" />
    </IconWrapper>
);

export const SettingsIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Settings" strokeWidth={2} className={`transition-all duration-500 hover:rotate-90 ${props.className || ''}`}>
        <SharedDefs />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" stroke="#04004d" strokeLinecap="round" />
        <circle cx="12" cy="12" r="4" fill="#ffffff" stroke="#bf1f2b" filter="url(#edmicro-shadow-red)" />
    </IconWrapper>
);

// ============ ACTION ICONS ============
export const PlayIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Play" strokeWidth={2} className={`transition-all duration-300 hover:scale-105 ${props.className || ''}`}>
        <SharedDefs />
        <circle cx="12" cy="12" r="10" fill="#f1faee" stroke="#04004d" />
        <polygon points="10 8 16 12 10 16 10 8" fill="#bf1f2b" stroke="#bf1f2b" strokeLinejoin="round" filter="url(#edmicro-shadow-red)" />
    </IconWrapper>
);

export const PauseIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Pause" strokeWidth={2} className={`transition-all duration-300 hover:scale-105 ${props.className || ''}`}>
        <SharedDefs />
        <circle cx="12" cy="12" r="10" fill="#f1faee" stroke="#04004d" />
        <rect x="9" y="8" width="2" height="8" rx="1" fill="#bf1f2b" stroke="none" />
        <rect x="13" y="8" width="2" height="8" rx="1" fill="#bf1f2b" stroke="none" />
    </IconWrapper>
);

export const RecordIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Record" strokeWidth={2} className={`transition-all duration-300 hover:scale-105 animate-pulse ${props.className || ''}`}>
        <SharedDefs />
        <circle cx="12" cy="12" r="10" fill="#f1faee" stroke="#04004d" />
        <circle cx="12" cy="12" r="4" fill="#bf1f2b" filter="url(#edmicro-shadow-red)" stroke="none" />
    </IconWrapper>
);

export const SaveIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Save" strokeWidth={2} className={`transition-all duration-300 hover:-translate-y-1 ${props.className || ''}`}>
        <SharedDefs />
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" fill="#f1faee" stroke="#04004d" filter="url(#edmicro-shadow-navy)" strokeLinejoin="round" />
        <path d="M17 21v-8H7v8" fill="#ffffff" stroke="#04004d" strokeLinejoin="round" />
        <path d="M7 3v5h8" stroke="#bf1f2b" strokeLinecap="round" />
    </IconWrapper>
);

export const DeleteIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Delete" strokeWidth={2} className={`transition-all duration-300 hover:-translate-y-1 hover:text-red-500 ${props.className || ''}`}>
        <SharedDefs />
        <path d="M3 6h18" stroke="#04004d" strokeLinecap="round" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" fill="#f1faee" stroke="#04004d" strokeLinejoin="round" filter="url(#edmicro-shadow-navy)" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="#bf1f2b" strokeLinejoin="round" />
        <line x1="10" y1="11" x2="10" y2="17" stroke="#bf1f2b" strokeLinecap="round" />
        <line x1="14" y1="11" x2="14" y2="17" stroke="#bf1f2b" strokeLinecap="round" />
    </IconWrapper>
);

export const EditIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Edit" strokeWidth={2} className={`transition-all duration-300 hover:-translate-y-1 hover:-rotate-12 ${props.className || ''}`}>
        <SharedDefs />
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" fill="#f1faee" stroke="#04004d" strokeLinejoin="round" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" fill="#ffffff" stroke="#bf1f2b" strokeLinejoin="round" filter="url(#edmicro-shadow-red)" />
    </IconWrapper>
);

export const AddIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Add" strokeWidth={2} className={`transition-all duration-300 hover:rotate-90 hover:scale-105 ${props.className || ''}`}>
        <SharedDefs />
        <circle cx="12" cy="12" r="10" fill="#f1faee" stroke="#04004d" filter="url(#edmicro-shadow-navy)" />
        <line x1="12" y1="8" x2="12" y2="16" stroke="#bf1f2b" strokeWidth={2.5} strokeLinecap="round" />
        <line x1="8" y1="12" x2="16" y2="12" stroke="#bf1f2b" strokeWidth={2.5} strokeLinecap="round" />
    </IconWrapper>
);

// ============ STATUS ICONS ============
export const SuccessIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Success" strokeWidth={2} className={`transition-all duration-300 hover:scale-105 ${props.className || ''}`}>
        <SharedDefs />
        <circle cx="12" cy="12" r="10" fill="#f1faee" stroke="#04004d" />
        <path d="M8 12l3 3 5-6" stroke="#10B981" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </IconWrapper>
);

export const ErrorIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Error" strokeWidth={2} className={`transition-all duration-300 hover:scale-105 ${props.className || ''}`}>
        <SharedDefs />
        <circle cx="12" cy="12" r="10" fill="#bf1f2b" stroke="#04004d" filter="url(#edmicro-shadow-red)" />
        <path d="M15 9l-6 6M9 9l6 6" stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" fill="none" />
    </IconWrapper>
);

export const WarningIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Warning" strokeWidth={2} className={`transition-all duration-300 hover:scale-105 ${props.className || ''}`}>
        <SharedDefs />
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="#f1faee" stroke="#04004d" strokeLinejoin="round" />
        <line x1="12" y1="9" x2="12" y2="13" stroke="#bf1f2b" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx="12" cy="17" r="1.5" fill="#bf1f2b" stroke="none" />
    </IconWrapper>
);

export const InfoIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Info" strokeWidth={2} className={`transition-all duration-300 hover:scale-105 ${props.className || ''}`}>
        <SharedDefs />
        <circle cx="12" cy="12" r="10" fill="#f1faee" stroke="#04004d" filter="url(#edmicro-shadow-navy)" />
        <line x1="12" y1="16" x2="12" y2="12" stroke="#bf1f2b" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx="12" cy="8" r="1.5" fill="#bf1f2b" stroke="none" />
    </IconWrapper>
);

export const PendingIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Pending" strokeWidth={2} className={`transition-all duration-300 hover:rotate-180 ${props.className || ''}`}>
        <SharedDefs />
        <circle cx="12" cy="12" r="10" fill="#f1faee" stroke="#04004d" strokeDasharray="4 4" />
        <path d="M12 6v6l4 2" stroke="#bf1f2b" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </IconWrapper>
);

// ============ EDUCATION ICONS ============
export const SpeakingIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Speaking" strokeWidth={2} className={`transition-all duration-300 hover:-translate-y-1 ${props.className || ''}`}>
        <SharedDefs />
        <rect x="9" y="2" width="6" height="12" rx="3" fill="#ffffff" stroke="#bf1f2b" filter="url(#edmicro-shadow-red)" />
        <path d="M5 10v2a7 7 0 0 0 14 0v-2" stroke="#04004d" strokeLinecap="round" />
        <line x1="12" y1="19" x2="12" y2="22" stroke="#04004d" strokeLinecap="round" />
        <line x1="8" y1="22" x2="16" y2="22" stroke="#04004d" strokeLinecap="round" />
    </IconWrapper>
);

export const ListeningIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Listening" strokeWidth={2} className={`transition-all duration-300 hover:scale-105 ${props.className || ''}`}>
        <SharedDefs />
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" stroke="#04004d" strokeLinecap="round" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" fill="#f1faee" stroke="#bf1f2b" strokeLinejoin="round" filter="url(#edmicro-shadow-red)" />
    </IconWrapper>
);

export const ReadingIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Reading" strokeWidth={2} className={`transition-all duration-300 hover:-translate-y-1 ${props.className || ''}`}>
        <SharedDefs />
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="#bf1f2b" fill="none" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="#f1faee" stroke="#04004d" strokeLinejoin="round" filter="url(#edmicro-shadow-navy)" />
        <line x1="10" y1="7" x2="16" y2="7" stroke="#04004d" strokeLinecap="round" />
        <line x1="10" y1="11" x2="16" y2="11" stroke="#04004d" strokeLinecap="round" />
        <line x1="10" y1="15" x2="14" y2="15" stroke="#bf1f2b" strokeLinecap="round" />
    </IconWrapper>
);

export const WritingIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Writing" strokeWidth={2} className={`transition-all duration-300 hover:-translate-y-1 hover:rotate-12 ${props.className || ''}`}>
        <SharedDefs />
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" fill="#f1faee" stroke="#04004d" strokeLinejoin="round" filter="url(#edmicro-shadow-navy)" />
        <line x1="13.5" y1="6.5" x2="17.5" y2="10.5" stroke="#bf1f2b" strokeLinecap="round" />
    </IconWrapper>
);

// ============ TOPIK LEVEL BADGES ============
const TopikBadgeDemo: React.FC<IconProps & { level: number; color: string }> = ({ level, color, ...props }) => (
    <IconWrapper {...props} aria-label={`TOPIK Level ${level}`} fill="none" strokeWidth={2} className={`transition-all duration-300 hover:-translate-y-1 ${props.className || ''}`}>
        <SharedDefs />
        <path d="M12 2L4 7v5c0 5.5 3.8 10 8 10c4.2 0 8-4.5 8-10V7l-8-5z" fill={color === '#ffffff' ? '#04004d' : '#f1faee'} stroke="#04004d" strokeLinejoin="round" filter="url(#edmicro-shadow-navy)" />
        <circle cx="12" cy="12.5" r="5" fill="#ffffff" stroke={color} strokeWidth={2} />
        <text x="12" y="16.5" textAnchor="middle" fill="#04004d" fontSize="12" fontWeight="800">{level}</text>
    </IconWrapper>
);

export const TopikLevel1IconDemo: React.FC<IconProps> = (props) => <TopikBadgeDemo level={1} color="#04004d" {...props} />;
export const TopikLevel2IconDemo: React.FC<IconProps> = (props) => <TopikBadgeDemo level={2} color="#04004d" {...props} />;
export const TopikLevel3IconDemo: React.FC<IconProps> = (props) => <TopikBadgeDemo level={3} color="#04004d" {...props} />;
export const TopikLevel4IconDemo: React.FC<IconProps> = (props) => <TopikBadgeDemo level={4} color="#bf1f2b" {...props} />;
export const TopikLevel5IconDemo: React.FC<IconProps> = (props) => <TopikBadgeDemo level={5} color="#bf1f2b" {...props} />;
export const TopikLevel6IconDemo: React.FC<IconProps> = (props) => <TopikBadgeDemo level={6} color="#bf1f2b" {...props} />;

// ============ USER ICONS ============
export const UserIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="User" strokeWidth={2} className={`transition-all duration-300 hover:scale-105 ${props.className || ''}`}>
        <SharedDefs />
        <circle cx="12" cy="7" r="4" fill="#ffffff" stroke="#bf1f2b" filter="url(#edmicro-shadow-red)" />
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="#f1faee" stroke="#04004d" strokeLinecap="round" strokeLinejoin="round" />
    </IconWrapper>
);

export const StarFilledIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Star Filled" strokeWidth={2} className={`transition-all duration-300 hover:scale-110 ${props.className || ''}`}>
        <SharedDefs />
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#F59E0B" stroke="#04004d" strokeLinejoin="round" filter="url(#edmicro-shadow-navy)" />
    </IconWrapper>
);

export const TrophyIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Trophy" strokeWidth={2} className={`transition-all duration-300 hover:-translate-y-1 ${props.className || ''}`}>
        <SharedDefs />
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" stroke="#04004d" fill="none" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" stroke="#04004d" fill="none" />
        <path d="M4 22h16" stroke="#bf1f2b" strokeWidth={2.5} strokeLinecap="round" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" stroke="#04004d" fill="none" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" stroke="#04004d" fill="none" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" fill="#F59E0B" stroke="#04004d" strokeLinejoin="round" filter="url(#edmicro-shadow-navy)" />
    </IconWrapper>
);

export const LoginIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Login" strokeWidth={2} className={`transition-all duration-300 hover:translate-x-1 ${props.className || ''}`}>
        <SharedDefs />
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" fill="#f1faee" stroke="#04004d" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="10 17 15 12 10 7" stroke="#bf1f2b" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <line x1="15" y1="12" x2="3" y2="12" stroke="#bf1f2b" strokeLinecap="round" />
    </IconWrapper>
);

export const LogoutIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Logout" strokeWidth={2} className={`transition-all duration-300 hover:translate-x-1 ${props.className || ''}`}>
        <SharedDefs />
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" fill="#f1faee" stroke="#04004d" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="16 17 21 12 16 7" stroke="#bf1f2b" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <line x1="21" y1="12" x2="9" y2="12" stroke="#bf1f2b" strokeLinecap="round" />
    </IconWrapper>
);

export const AdminIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Admin" strokeWidth={2} className={`transition-all duration-300 hover:scale-105 ${props.className || ''}`}>
        <SharedDefs />
        <path d="M12 2L4 6v6c0 5 3 9 8 10 5-1 8-5 8-10V6l-8-4z" fill="#f1faee" stroke="#04004d" strokeLinejoin="round" filter="url(#edmicro-shadow-navy)" />
        <path d="M9 12l2 2 4-4" stroke="#bf1f2b" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </IconWrapper>
);

// ============ MEDIA ICONS ============
export const AudioIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Audio" strokeWidth={2} className={`transition-all duration-300 hover:scale-105 ${props.className || ''}`}>
        <SharedDefs />
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#f1faee" stroke="#04004d" strokeLinejoin="round" filter="url(#edmicro-shadow-navy)" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="#bf1f2b" strokeLinecap="round" fill="none" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="#bf1f2b" strokeLinecap="round" fill="none" />
    </IconWrapper>
);

export const ImageIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Image" strokeWidth={2} className={`transition-all duration-300 hover:scale-105 ${props.className || ''}`}>
        <SharedDefs />
        <rect x="3" y="3" width="18" height="18" rx="4" ry="4" fill="#f1faee" stroke="#04004d" strokeLinejoin="round" filter="url(#edmicro-shadow-navy)" />
        <circle cx="8.5" cy="8.5" r="2" fill="#bf1f2b" stroke="none" />
        <polyline points="21 15 16 10 5 21" stroke="#04004d" strokeWidth={2} strokeLinejoin="round" fill="none" />
    </IconWrapper>
);

export const VideoIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Video" strokeWidth={2} className={`transition-all duration-300 hover:scale-105 ${props.className || ''}`}>
        <SharedDefs />
        <polygon points="23 7 16 12 23 17 23 7" fill="#ffffff" stroke="#bf1f2b" strokeLinejoin="round" filter="url(#edmicro-shadow-red)" />
        <rect x="1" y="5" width="15" height="14" rx="4" ry="4" fill="#f1faee" stroke="#04004d" strokeLinejoin="round" />
        <line x1="8" y1="9" x2="8" y2="15" stroke="#04004d" strokeLinecap="round" />
    </IconWrapper>
);

export const FileIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="File" strokeWidth={2} className={`transition-all duration-300 hover:-translate-y-1 ${props.className || ''}`}>
        <SharedDefs />
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#f1faee" stroke="#04004d" strokeLinejoin="round" filter="url(#edmicro-shadow-navy)" />
        <polyline points="14 2 14 8 20 8" fill="#ffffff" stroke="#bf1f2b" strokeLinejoin="round" />
        <line x1="16" y1="13" x2="8" y2="13" stroke="#04004d" strokeLinecap="round" />
        <line x1="16" y1="17" x2="8" y2="17" stroke="#04004d" strokeLinecap="round" />
        <polyline points="10 9 9 9 8 9" stroke="#bf1f2b" strokeLinecap="round" fill="none" />
    </IconWrapper>
);

// ============ MISC ICONS ============
export const ClockIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Clock" strokeWidth={2} className={`transition-all duration-300 hover:scale-105 ${props.className || ''}`}>
        <SharedDefs />
        <circle cx="12" cy="12" r="10" fill="#f1faee" stroke="#04004d" filter="url(#edmicro-shadow-navy)" />
        <polyline points="12 6 12 12 16 14" stroke="#bf1f2b" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </IconWrapper>
);

export const CalendarIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Calendar" strokeWidth={2} className={`transition-all duration-300 hover:-translate-y-1 ${props.className || ''}`}>
        <SharedDefs />
        <rect x="3" y="4" width="18" height="18" rx="4" ry="4" fill="#f1faee" stroke="#04004d" strokeLinejoin="round" filter="url(#edmicro-shadow-navy)" />
        <line x1="16" y1="2" x2="16" y2="6" stroke="#bf1f2b" strokeWidth={2.5} strokeLinecap="round" />
        <line x1="8" y1="2" x2="8" y2="6" stroke="#bf1f2b" strokeWidth={2.5} strokeLinecap="round" />
        <line x1="3" y1="10" x2="21" y2="10" stroke="#04004d" />
        <rect x="7" y="14" width="4" height="4" rx="1" fill="#bf1f2b" stroke="none" />
    </IconWrapper>
);

export const StarIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Star" strokeWidth={2} className={`transition-all duration-300 hover:rotate-180 hover:scale-105 ${props.className || ''}`}>
        <SharedDefs />
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#f1faee" stroke="#04004d" strokeLinejoin="round" filter="url(#edmicro-shadow-navy)" />
    </IconWrapper>
);

// ============ KOREAN FLAG ICON ============
export const KoreanFlagIconDemo: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Korean Flag" viewBox="0 0 24 24" className={`transition-all duration-500 hover:scale-105 ${props.className || ''}`}>
        <SharedDefs />
        <circle cx="12" cy="12" r="10" fill="#ffffff" stroke="#04004d" strokeWidth={2} filter="url(#edmicro-shadow-navy)" />
        <path d="M12 4 A8 8 0 0 1 12 20 A8 8 0 0 0 12 4" fill="#bf1f2b" />
        <path d="M12 4 A8 8 0 0 0 12 20 A8 8 0 0 1 12 4" fill="#04004d" />
        <g stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round">
            <line x1="5" y1="5" x2="7.5" y2="5" />
            <line x1="5" y1="6.5" x2="7.5" y2="6.5" />
            <line x1="5" y1="8" x2="7.5" y2="8" />
            
            <line x1="16.5" y1="16" x2="19" y2="16" />
            <line x1="16.5" y1="17.5" x2="19" y2="17.5" />
            <line x1="16.5" y1="19" x2="19" y2="19" />
            
            <line x1="16.5" y1="5" x2="19" y2="5" />
            <line x1="16.5" y1="6.5" x2="17.5" y2="6.5" />
            <line x1="18.5" y1="6.5" x2="19" y2="6.5" />
            <line x1="16.5" y1="8" x2="19" y2="8" />
            
            <line x1="5" y1="16" x2="6" y2="16" />
            <line x1="7" y1="16" x2="7.5" y2="16" />
            <line x1="5" y1="17.5" x2="7.5" y2="17.5" />
            <line x1="5" y1="19" x2="6" y2="19" />
            <line x1="7" y1="19" x2="7.5" y2="19" />
        </g>
    </IconWrapper>
);
