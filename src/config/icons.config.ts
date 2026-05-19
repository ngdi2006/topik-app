/**
 * Icon System Configuration
 * Centralized configuration for all SVG icons in the TOPIK app
 */

export const iconConfig = {
    // Default settings
    defaultSize: 'md' as const,
    defaultStroke: 2,
    defaultStrokeLinecap: 'round' as const,
    defaultStrokeLinejoin: 'round' as const,

    // Size definitions (in pixels)
    sizes: {
        xs: 12,
        sm: 16,
        md: 20,
        lg: 24,
        xl: 32,
        '2xl': 48,
    },

    // Color palette for TOPIK app
    colors: {
        // Brand colors
        topikRed: '#bf1f2b',
        darkNavy: '#04004d',
        lightCream: '#f1faee',
        white: '#ffffff',

        // Semantic colors
        success: '#10B981',
        error: '#bf1f2b',
        warning: '#F59E0B',
        info: '#04004d',

        // Skill colors
        speaking: '#bf1f2b',
        listening: '#8B5CF6',
        reading: '#04004d',
        writing: '#10B981',

        // Neutral
        neutral: '#6B7280',
        muted: '#9CA3AF',

        // TOPIK levels (gradient from red to navy)
        level1: '#bf1f2b',
        level2: '#9a1f3d',
        level3: '#751f4f',
        level4: '#501f61',
        level5: '#2b1f73',
        level6: '#04004d',
    },

    // Icon categories
    categories: {
        navigation: 'Navigation',
        actions: 'Actions',
        status: 'Status',
        education: 'Education',
        user: 'User',
        media: 'Media',
        misc: 'Miscellaneous',
    },

    // Animation presets
    animations: {
        spin: 'animate-spin',
        pulse: 'animate-pulse',
        bounce: 'animate-bounce',
    },
} as const;

export type IconSize = keyof typeof iconConfig.sizes;
export type IconColor = keyof typeof iconConfig.colors;
export type IconCategory = keyof typeof iconConfig.categories;
