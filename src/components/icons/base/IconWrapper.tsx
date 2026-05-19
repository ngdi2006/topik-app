import React from 'react';
import { iconConfig } from '@/config/icons.config';
import { IconWrapperProps } from './IconProps';
import { cn } from '@/lib/utils';

export const IconWrapper: React.FC<IconWrapperProps> = ({
    children,
    size = iconConfig.defaultSize,
    color,
    className,
    strokeWidth = iconConfig.defaultStroke,
    fill = 'none',
    stroke = 'currentColor',
    style,
    onClick,
    viewBox = '0 0 24 24',
    'aria-label': ariaLabel,
    title,
}) => {
    // Calculate size in pixels
    const sizeInPx =
        typeof size === 'number'
            ? size
            : iconConfig.sizes[size as keyof typeof iconConfig.sizes];

    return (
        <svg
            width={sizeInPx}
            height={sizeInPx}
            viewBox={viewBox}
            fill={fill}
            stroke={color || stroke}
            strokeWidth={strokeWidth}
            strokeLinecap={iconConfig.defaultStrokeLinecap}
            strokeLinejoin={iconConfig.defaultStrokeLinejoin}
            className={cn('inline-block shrink-0', className)}
            style={style}
            onClick={onClick}
            role={onClick ? 'button' : 'img'}
            aria-label={ariaLabel}
            xmlns="http://www.w3.org/2000/svg"
        >
            {title && <title>{title}</title>}
            {children}
        </svg>
    );
};
