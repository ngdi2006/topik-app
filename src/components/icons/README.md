# TOPIK Icon System

Hệ thống icon đồng bộ cho ứng dụng TOPIK với 40+ icons được thiết kế riêng.

## 🚀 Quick Start

```tsx
import { HomeIcon, SpeakingIcon, TopikLevel1Icon } from '@/components/icons';

// Basic usage
<HomeIcon />

// With size
<SpeakingIcon size="xl" />

// With color
<TopikLevel1Icon color="#10B981" />

// Combined
<HomeIcon size="lg" color="#0066CC" className="hover:scale-110" />
```

## 📚 Documentation

Xem hướng dẫn đầy đủ tại: [ICON_SYSTEM_GUIDE.md](../../../ICON_SYSTEM_GUIDE.md)

## 🎨 Demo

Xem tất cả icons tại: `http://localhost:3000/demo/icons`

## 📦 Structure

```
src/components/icons/
├── index.ts              # Main export file
├── AllIcons.tsx          # All icon components
├── base/
│   ├── IconWrapper.tsx   # Base wrapper component
│   └── IconProps.ts      # TypeScript types
└── navigation/
    └── HomeIcon.tsx      # Individual icon (example)
```

## 🎯 Available Icons

- **Navigation** (6): Home, Menu, Search, ArrowLeft, ArrowRight, Settings
- **Actions** (7): Play, Pause, Record, Save, Delete, Edit, Add
- **Status** (5): Success, Error, Warning, Info, Pending
- **Education** (11): Speaking, Listening, Reading, Writing, TOPIK Levels 1-6, Korean Flag
- **User** (4): User, Login, Logout, Admin
- **Media** (4): Audio, Image, Video, File
- **Misc** (5): Clock, Calendar, Trophy, Star, StarFilled

## 🎨 Colors

```tsx
import { iconConfig } from '@/components/icons';

iconConfig.colors.topikBlue    // #0066CC
iconConfig.colors.success      // #10B981
iconConfig.colors.speaking     // #8B5CF6
iconConfig.colors.level1       // #10B981
```

## 📐 Sizes

```tsx
xs   // 12px
sm   // 16px
md   // 20px (default)
lg   // 24px
xl   // 32px
2xl  // 48px
```

## 💡 Examples

### In Buttons
```tsx
<Button>
  <PlayIcon size="sm" />
  Play
</Button>
```

### TOPIK Skills
```tsx
<SpeakingIcon size="xl" />  // Purple microphone
<ListeningIcon size="xl" /> // Orange headphones
<ReadingIcon size="xl" />   // Blue book
<WritingIcon size="xl" />   // Green pen
```

### Status Indicators
```tsx
<SuccessIcon /> // Green checkmark
<ErrorIcon />   // Red X
<WarningIcon /> // Orange triangle
```

## 🔧 Utilities

```tsx
import { getIconColor, lightenColor, darkenColor } from '@/components/icons';

const color = getIconColor('topikBlue');
const lighter = lightenColor('#0066CC', 20);
const darker = darkenColor('#0066CC', 20);
```

## 📝 Adding New Icons

1. Add to `AllIcons.tsx`:
```tsx
export const MyIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="My Icon">
        <path d="..." />
    </IconWrapper>
);
```

2. Add to demo page metadata
3. Update documentation

---

Made with ❤️ for TOPIK App
