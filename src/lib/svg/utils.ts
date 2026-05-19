/**
 * SVG Utility Functions
 * Helper functions for working with SVG icons
 */

import { iconConfig } from '@/config/icons.config';

/**
 * Convert SVG to data URL
 * @param svgString - SVG markup as string
 * @returns Data URL string
 */
export function svgToDataUrl(svgString: string): string {
    const encoded = encodeURIComponent(svgString)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22');
    return `data:image/svg+xml,${encoded}`;
}

/**
 * Get icon color from config
 * @param colorKey - Key from iconConfig.colors
 * @returns Color hex string
 */
export function getIconColor(colorKey: keyof typeof iconConfig.colors): string {
    return iconConfig.colors[colorKey];
}

/**
 * Get icon size in pixels
 * @param sizeKey - Key from iconConfig.sizes
 * @returns Size in pixels
 */
export function getIconSize(sizeKey: keyof typeof iconConfig.sizes): number {
    return iconConfig.sizes[sizeKey];
}

/**
 * Generate SVG string from icon component
 * @param iconName - Name of the icon
 * @param size - Size key or number
 * @param color - Color hex string
 * @returns SVG markup string
 */
export function generateSvgString(
    iconName: string,
    size: keyof typeof iconConfig.sizes | number = 'md',
    color: string = 'currentColor'
): string {
    const sizeInPx = typeof size === 'number' ? size : getIconSize(size);

    // This is a simplified version - in production you'd want to
    // dynamically render the actual icon component
    return `<svg width="${sizeInPx}" height="${sizeInPx}" viewBox="0 0 24 24" fill="none" stroke="${color}" xmlns="http://www.w3.org/2000/svg">
        <!-- ${iconName} -->
    </svg>`;
}

/**
 * Optimize SVG by removing unnecessary attributes
 * @param svgString - SVG markup string
 * @returns Optimized SVG string
 */
export function optimizeSvg(svgString: string): string {
    return svgString
        .replace(/\s+/g, ' ') // Remove extra whitespace
        .replace(/>\s+</g, '><') // Remove whitespace between tags
        .trim();
}

/**
 * Get contrast color (black or white) based on background
 * @param hexColor - Background color in hex format
 * @returns 'black' or 'white'
 */
export function getContrastColor(hexColor: string): 'black' | 'white' {
    // Remove # if present
    const hex = hexColor.replace('#', '');

    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.5 ? 'black' : 'white';
}

/**
 * Create CSS class for icon animation
 * @param animation - Animation type from iconConfig
 * @returns CSS class string
 */
export function getIconAnimation(animation: keyof typeof iconConfig.animations): string {
    return iconConfig.animations[animation];
}

/**
 * Generate icon props object
 * @param options - Icon options
 * @returns Props object for icon component
 */
export function createIconProps(options: {
    size?: keyof typeof iconConfig.sizes | number;
    color?: string;
    className?: string;
    ariaLabel?: string;
}) {
    return {
        size: options.size || iconConfig.defaultSize,
        color: options.color,
        className: options.className,
        'aria-label': options.ariaLabel,
    };
}

/**
 * Check if color is valid hex
 * @param color - Color string
 * @returns boolean
 */
export function isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Convert hex to RGB
 * @param hex - Hex color string
 * @returns RGB object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
}

/**
 * Convert RGB to hex
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Hex color string
 */
export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Lighten a color by percentage
 * @param hex - Hex color string
 * @param percent - Percentage to lighten (0-100)
 * @returns Lightened hex color
 */
export function lightenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const amount = Math.round(2.55 * percent);
    const r = Math.min(255, rgb.r + amount);
    const g = Math.min(255, rgb.g + amount);
    const b = Math.min(255, rgb.b + amount);

    return rgbToHex(r, g, b);
}

/**
 * Darken a color by percentage
 * @param hex - Hex color string
 * @param percent - Percentage to darken (0-100)
 * @returns Darkened hex color
 */
export function darkenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const amount = Math.round(2.55 * percent);
    const r = Math.max(0, rgb.r - amount);
    const g = Math.max(0, rgb.g - amount);
    const b = Math.max(0, rgb.b - amount);

    return rgbToHex(r, g, b);
}
