/**
 * Demo Icon System Configuration - NEW COLOR SCHEME PREVIEW
 * This is a preview configuration for testing new colors
 * Does NOT affect the main application
 */

export const iconConfigDemo = {
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

    // NEW COLOR PALETTE - DEMO PREVIEW
    colors: {
        // Brand colors - NEW
        topikRed: '#bf1f2b',
        darkNavy: '#04004d',
        lightCream: '#f1faee',
        white: '#ffffff',

        // Semantic colors
        success: '#10B981',
        error: '#bf1f2b',
        warning: '#F59E0B',
        info: '#04004d',

        // Skill colors - Updated with new palette
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

export type IconSizeDemo = keyof typeof iconConfigDemo.sizes;
export type IconColorDemo = keyof typeof iconConfigDemo.colors;
export type IconCategoryDemo = keyof typeof iconConfigDemo.categories;
