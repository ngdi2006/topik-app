import React from 'react';
import { IconWrapper } from './base/IconWrapper';
import { IconProps } from './base/IconProps';

// ============ NAVIGATION ICONS ============
export const HomeIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Home">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#bf1f2b" opacity="0.15" />
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" fill="#04004d" opacity="0.2" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </IconWrapper>
);

export const MenuIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Menu" strokeWidth={2.5}>
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </IconWrapper>
);

export const SearchIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Search">
        <circle cx="11" cy="11" r="8" fill="#f1faee" opacity="0.3" />
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" strokeWidth={2.5} />
    </IconWrapper>
);

export const ArrowLeftIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Back">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" fill="#bf1f2b" opacity="0.2" />
        <polyline points="12 19 5 12 12 5" />
    </IconWrapper>
);

export const ArrowRightIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Forward">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" fill="#bf1f2b" opacity="0.2" />
        <polyline points="12 5 19 12 12 19" />
    </IconWrapper>
);

export const SettingsIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Settings">
        <circle cx="12" cy="12" r="3" fill="#04004d" opacity="0.2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
    </IconWrapper>
);

// ============ ACTION ICONS ============
export const PlayIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Play">
        <defs>
            <linearGradient id="playGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bf1f2b" />
                <stop offset="100%" stopColor="#04004d" />
            </linearGradient>
        </defs>
        <polygon points="5 3 19 12 5 21 5 3" fill="url(#playGradient)" stroke="none" />
    </IconWrapper>
);

export const PauseIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Pause">
        <rect x="6" y="4" width="4" height="16" rx="1" fill="#bf1f2b" opacity="0.8" />
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" fill="#bf1f2b" opacity="0.8" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
    </IconWrapper>
);

export const RecordIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Record" fill="#bf1f2b" stroke="none">
        <circle cx="12" cy="12" r="10" />
    </IconWrapper>
);

export const SaveIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Save">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" fill="#f1faee" opacity="0.3" />
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" fill="#04004d" opacity="0.15" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
    </IconWrapper>
);

export const DeleteIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Delete">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="#bf1f2b" opacity="0.1" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
    </IconWrapper>
);

export const EditIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Edit">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" fill="#bf1f2b" opacity="0.2" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </IconWrapper>
);

export const AddIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Add">
        <circle cx="12" cy="12" r="10" fill="#bf1f2b" opacity="0.1" />
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" strokeWidth={2.5} />
        <line x1="8" y1="12" x2="16" y2="12" strokeWidth={2.5} />
    </IconWrapper>
);

// ============ STATUS ICONS ============
export const SuccessIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Success" fill="currentColor" stroke="none">
        <circle cx="12" cy="12" r="10" fill="#10B981" />
        <path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2" fill="none" />
    </IconWrapper>
);

export const ErrorIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Error" fill="currentColor" stroke="none">
        <circle cx="12" cy="12" r="10" fill="#bf1f2b" />
        <line x1="15" y1="9" x2="9" y2="15" stroke="white" strokeWidth="2" />
        <line x1="9" y1="9" x2="15" y2="15" stroke="white" strokeWidth="2" />
    </IconWrapper>
);

export const WarningIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Warning" fill="currentColor" stroke="none">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="#F59E0B" />
        <line x1="12" y1="9" x2="12" y2="13" stroke="white" strokeWidth="2" />
        <circle cx="12" cy="17" r="1" fill="white" stroke="none" />
    </IconWrapper>
);

export const InfoIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Info">
        <circle cx="12" cy="12" r="10" fill="#04004d" opacity="0.15" />
        <circle cx="12" cy="12" r="10" stroke="#04004d" />
        <line x1="12" y1="16" x2="12" y2="12" stroke="#04004d" />
        <line x1="12" y1="8" x2="12.01" y2="8" stroke="#04004d" />
    </IconWrapper>
);

export const PendingIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Pending">
        <circle cx="12" cy="12" r="10" fill="#f1faee" opacity="0.5" />
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </IconWrapper>
);

// ============ EDUCATION ICONS ============
export const SpeakingIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Speaking" stroke={props.color || '#bf1f2b'}>
        <rect x="9" y="2" width="6" height="11" rx="3" fill="#bf1f2b" opacity="0.2" />
        <rect x="9" y="2" width="6" height="11" rx="3" />
        <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
    </IconWrapper>
);

export const ListeningIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Listening" stroke={props.color || '#8B5CF6'}>
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" fill="#8B5CF6" opacity="0.2" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </IconWrapper>
);

export const ReadingIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Reading" stroke={props.color || '#04004d'}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="#f1faee" opacity="0.5" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="10" y1="7" x2="16" y2="7" stroke="#04004d" opacity="0.3" />
        <line x1="10" y1="11" x2="16" y2="11" stroke="#04004d" opacity="0.3" />
    </IconWrapper>
);

export const WritingIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Writing" stroke={props.color || '#10B981'}>
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" fill="#10B981" opacity="0.15" />
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </IconWrapper>
);

// ============ TOPIK LEVEL BADGES ============
const TopikBadge: React.FC<IconProps & { level: number; color: string }> = ({ level, color, ...props }) => (
    <IconWrapper {...props} aria-label={`TOPIK Level ${level}`} fill="none">
        <defs>
            <linearGradient id={`badge-gradient-${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={color} stopOpacity="0.1" />
            </linearGradient>
        </defs>
        <path d="M12 2L4 6v6c0 5 3 9 8 10 5-1 8-5 8-10V6l-8-4z" fill={`url(#badge-gradient-${level})`} />
        <path d="M12 2L4 6v6c0 5 3 9 8 10 5-1 8-5 8-10V6l-8-4z" stroke={color} strokeWidth="2" />
        <text x="12" y="16" textAnchor="middle" fill={color} fontSize="10" fontWeight="bold">{level}</text>
    </IconWrapper>
);

export const TopikLevel1Icon: React.FC<IconProps> = (props) => <TopikBadge level={1} color="#bf1f2b" {...props} />;
export const TopikLevel2Icon: React.FC<IconProps> = (props) => <TopikBadge level={2} color="#9a1f3d" {...props} />;
export const TopikLevel3Icon: React.FC<IconProps> = (props) => <TopikBadge level={3} color="#751f4f" {...props} />;
export const TopikLevel4Icon: React.FC<IconProps> = (props) => <TopikBadge level={4} color="#501f61" {...props} />;
export const TopikLevel5Icon: React.FC<IconProps> = (props) => <TopikBadge level={5} color="#2b1f73" {...props} />;
export const TopikLevel6Icon: React.FC<IconProps> = (props) => <TopikBadge level={6} color="#04004d" {...props} />;

// ============ USER ICONS ============
export const UserIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="User">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" fill="#04004d" opacity="0.15" />
        <circle cx="12" cy="7" r="4" />
    </IconWrapper>
);

export const LoginIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Login">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" fill="#f1faee" opacity="0.3" />
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" fill="#bf1f2b" opacity="0.2" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
    </IconWrapper>
);

export const LogoutIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Logout">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" fill="#f1faee" opacity="0.3" />
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" fill="#bf1f2b" opacity="0.2" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </IconWrapper>
);

export const AdminIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Admin">
        <defs>
            <linearGradient id="adminGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bf1f2b" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#04004d" stopOpacity="0.2" />
            </linearGradient>
        </defs>
        <path d="M12 2L4 6v6c0 5 3 9 8 10 5-1 8-5 8-10V6l-8-4z" fill="url(#adminGradient)" />
        <path d="M12 2L4 6v6c0 5 3 9 8 10 5-1 8-5 8-10V6l-8-4z" />
        <path d="M9 12l2 2 4-4" />
    </IconWrapper>
);

// ============ MEDIA ICONS ============
export const AudioIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Audio">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#bf1f2b" opacity="0.15" />
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </IconWrapper>
);

export const ImageIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Image">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="#f1faee" opacity="0.3" />
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" fill="#F59E0B" />
        <polyline points="21 15 16 10 5 21" />
    </IconWrapper>
);

export const VideoIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Video">
        <polygon points="23 7 16 12 23 17 23 7" fill="#bf1f2b" opacity="0.2" />
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="#f1faee" opacity="0.2" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </IconWrapper>
);

export const FileIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="File">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#f1faee" opacity="0.3" />
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" fill="#04004d" opacity="0.1" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
    </IconWrapper>
);

// ============ MISC ICONS ============
export const ClockIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Clock">
        <circle cx="12" cy="12" r="10" fill="#f1faee" opacity="0.3" />
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </IconWrapper>
);

export const CalendarIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Calendar">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="#f1faee" opacity="0.3" />
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <rect x="7" y="14" width="3" height="3" fill="#bf1f2b" opacity="0.5" />
    </IconWrapper>
);

export const TrophyIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Trophy">
        <defs>
            <linearGradient id="trophyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#bf1f2b" />
            </linearGradient>
        </defs>
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" fill="url(#trophyGradient)" opacity="0.3" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </IconWrapper>
);

export const StarIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Star">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </IconWrapper>
);

export const StarFilledIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Star Filled" fill="#bf1f2b">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </IconWrapper>
);

// ============ KOREAN FLAG ICON ============
export const KoreanFlagIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="Korean Flag" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="white" stroke="#04004d" strokeWidth="1.5" />
        <path d="M12 3 A9 9 0 0 1 12 21 A9 9 0 0 0 12 3" fill="#bf1f2b" />
        <path d="M12 3 A9 9 0 0 0 12 21 A9 9 0 0 1 12 3" fill="#04004d" />
        <g stroke="#000" strokeWidth="0.8">
            <line x1="4" y1="4" x2="7" y2="4" />
            <line x1="4" y1="5.5" x2="7" y2="5.5" />
            <line x1="17" y1="18.5" x2="20" y2="18.5" />
            <line x1="17" y1="20" x2="20" y2="20" />
        </g>
    </IconWrapper>
);
