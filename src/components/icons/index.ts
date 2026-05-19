/**
 * TOPIK Icon System
 * Central export file for all icons
 */

// Export all icons
export * from './AllIcons';

// Export base components and types
export { IconWrapper } from './base/IconWrapper';
export type { IconProps, IconWrapperProps } from './base/IconProps';

// Export config
export { iconConfig } from '@/config/icons.config';
export type { IconSize, IconColor, IconCategory } from '@/config/icons.config';

// Export utilities
export * from '@/lib/svg/utils';
