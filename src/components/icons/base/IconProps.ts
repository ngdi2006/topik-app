import { iconConfig } from '@/config/icons.config';

export type IconSize = keyof typeof iconConfig.sizes;

export interface IconProps {
    size?: IconSize | number;
    color?: string;
    className?: string;
    strokeWidth?: number;
    fill?: string;
    stroke?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
    'aria-label'?: string;
    title?: string;
}

export interface IconWrapperProps extends IconProps {
    children: React.ReactNode;
    viewBox?: string;
}
