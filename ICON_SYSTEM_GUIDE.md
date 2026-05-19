# TOPIK Icon System - Hướng dẫn sử dụng

## 📖 Tổng quan

Hệ thống icon đồng bộ cho ứng dụng TOPIK với **40+ icons** được thiết kế riêng, hỗ trợ đầy đủ TypeScript và tích hợp với design system hiện tại.

## 🎨 Đặc điểm

- ✅ **40+ icons** đa dạng (Navigation, Actions, Status, Education, User, Media, Misc)
- ✅ **Type-safe** với TypeScript
- ✅ **Responsive** với 6 kích thước chuẩn (xs, sm, md, lg, xl, 2xl)
- ✅ **Theme-aware** tự động adapt với light/dark mode
- ✅ **Customizable** dễ dàng thay đổi màu sắc, kích thước
- ✅ **Accessible** với ARIA labels
- ✅ **TOPIK-specific** icons cho giáo dục tiếng Hàn

## 📦 Cài đặt

Không cần cài đặt thêm package nào. Hệ thống đã được tích hợp sẵn.

## 🚀 Sử dụng cơ bản

### Import icons

```tsx
import { HomeIcon, SearchIcon, SpeakingIcon } from '@/components/icons/AllIcons';
```

### Sử dụng đơn giản

```tsx
<HomeIcon />
<SearchIcon />
<SpeakingIcon />
```

### Với props

```tsx
// Thay đổi kích thước
<HomeIcon size="lg" />
<SearchIcon size="xl" />

// Thay đổi màu sắc
<HomeIcon color="#0066CC" />
<SearchIcon color={iconConfig.colors.topikBlue} />

// Kết hợp nhiều props
<SpeakingIcon 
  size="2xl" 
  color="#8B5CF6"
  className="hover:scale-110 transition-transform"
/>
```

## 📐 Kích thước

| Size | Pixels | Use case |
|------|--------|----------|
| `xs` | 12px | Inline text icons |
| `sm` | 16px | Button icons, form icons |
| `md` | 20px | Default, navigation icons |
| `lg` | 24px | Header icons, feature icons |
| `xl` | 32px | Hero icons, empty states |
| `2xl` | 48px | Landing page, illustrations |

```tsx
<TrophyIcon size="xs" />  // 12px
<TrophyIcon size="sm" />  // 16px
<TrophyIcon size="md" />  // 20px (default)
<TrophyIcon size="lg" />  // 24px
<TrophyIcon size="xl" />  // 32px
<TrophyIcon size="2xl" /> // 48px
```

## 🎨 Màu sắc

### Sử dụng màu từ config

```tsx
import { iconConfig } from '@/config/icons.config';

<HomeIcon color={iconConfig.colors.topikBlue} />
<SuccessIcon color={iconConfig.colors.success} />
<ErrorIcon color={iconConfig.colors.error} />
```

### Bảng màu TOPIK

```tsx
// Brand
topikBlue: '#0066CC'

// Semantic
success: '#10B981'
error: '#EF4444'
warning: '#F59E0B'
info: '#3B82F6'

// Skills
speaking: '#8B5CF6'  // Purple
listening: '#F97316' // Orange
reading: '#3B82F6'   // Blue
writing: '#22C55E'   // Green

// TOPIK Levels
level1: '#10B981' // Green
level2: '#3B82F6' // Blue
level3: '#8B5CF6' // Purple
level4: '#F59E0B' // Orange
level5: '#EF4444' // Red
level6: '#DC2626' // Dark Red
```

## 📚 Danh sách Icons

### Navigation (6 icons)
- `HomeIcon` - Home icon
- `MenuIcon` - Menu hamburger
- `SearchIcon` - Search
- `ArrowLeftIcon` - Back arrow
- `ArrowRightIcon` - Forward arrow
- `SettingsIcon` - Settings gear

### Actions (7 icons)
- `PlayIcon` - Play button
- `PauseIcon` - Pause button
- `RecordIcon` - Record button
- `SaveIcon` - Save
- `DeleteIcon` - Delete/trash
- `EditIcon` - Edit/pencil
- `AddIcon` - Add/plus

### Status (5 icons)
- `SuccessIcon` - Success checkmark (filled)
- `ErrorIcon` - Error X mark (filled)
- `WarningIcon` - Warning triangle (filled)
- `InfoIcon` - Information
- `PendingIcon` - Pending/clock

### Education (11 icons)
- `SpeakingIcon` - Speaking/microphone (Purple)
- `ListeningIcon` - Listening/headphones (Orange)
- `ReadingIcon` - Reading/book (Blue)
- `WritingIcon` - Writing/pen (Green)
- `TopikLevel1Icon` - TOPIK Level 1 badge
- `TopikLevel2Icon` - TOPIK Level 2 badge
- `TopikLevel3Icon` - TOPIK Level 3 badge
- `TopikLevel4Icon` - TOPIK Level 4 badge
- `TopikLevel5Icon` - TOPIK Level 5 badge
- `TopikLevel6Icon` - TOPIK Level 6 badge
- `KoreanFlagIcon` - Korean flag

### User (4 icons)
- `UserIcon` - User profile
- `LoginIcon` - Login
- `LogoutIcon` - Logout
- `AdminIcon` - Admin shield

### Media (4 icons)
- `AudioIcon` - Audio/speaker
- `ImageIcon` - Image/photo
- `VideoIcon` - Video camera
- `FileIcon` - File document

### Misc (5 icons)
- `ClockIcon` - Clock/time
- `CalendarIcon` - Calendar/date
- `TrophyIcon` - Trophy/achievement
- `StarIcon` - Star outline
- `StarFilledIcon` - Star filled

## 💡 Ví dụ thực tế

### Trong Buttons

```tsx
import { Button } from '@/components/ui/button';
import { PlayIcon, SaveIcon, DeleteIcon } from '@/components/icons/AllIcons';

<Button>
  <PlayIcon size="sm" />
  Play
</Button>

<Button variant="secondary">
  <SaveIcon size="sm" />
  Save
</Button>

<Button variant="destructive">
  <DeleteIcon size="sm" />
  Delete
</Button>
```

### Trong Navigation

```tsx
import { HomeIcon, SearchIcon, SettingsIcon } from '@/components/icons/AllIcons';

<nav className="flex gap-4">
  <a href="/"><HomeIcon /></a>
  <a href="/search"><SearchIcon /></a>
  <a href="/settings"><SettingsIcon /></a>
</nav>
```

### TOPIK Skills

```tsx
import { SpeakingIcon, ListeningIcon, ReadingIcon, WritingIcon } from '@/components/icons/AllIcons';

<div className="grid grid-cols-4 gap-4">
  <div className="flex flex-col items-center">
    <SpeakingIcon size="xl" />
    <span>Speaking</span>
  </div>
  <div className="flex flex-col items-center">
    <ListeningIcon size="xl" />
    <span>Listening</span>
  </div>
  <div className="flex flex-col items-center">
    <ReadingIcon size="xl" />
    <span>Reading</span>
  </div>
  <div className="flex flex-col items-center">
    <WritingIcon size="xl" />
    <span>Writing</span>
  </div>
</div>
```

### TOPIK Level Badges

```tsx
import { TopikLevel1Icon, TopikLevel2Icon } from '@/components/icons/AllIcons';

<div className="flex gap-4">
  <TopikLevel1Icon size="2xl" />
  <TopikLevel2Icon size="2xl" />
  <TopikLevel3Icon size="2xl" />
  <TopikLevel4Icon size="2xl" />
  <TopikLevel5Icon size="2xl" />
  <TopikLevel6Icon size="2xl" />
</div>
```

### Status Indicators

```tsx
import { SuccessIcon, ErrorIcon, WarningIcon } from '@/components/icons/AllIcons';

// Correct answer
<div className="flex items-center gap-2">
  <SuccessIcon size="sm" />
  <span>Correct!</span>
</div>

// Wrong answer
<div className="flex items-center gap-2">
  <ErrorIcon size="sm" />
  <span>Incorrect</span>
</div>

// Warning
<div className="flex items-center gap-2">
  <WarningIcon size="sm" />
  <span>Please check your answer</span>
</div>
```

## 🎯 Best Practices

### 1. Sử dụng size phù hợp

```tsx
// ✅ Good
<Button>
  <PlayIcon size="sm" />  // Small icon for button
  Play
</Button>

// ❌ Bad
<Button>
  <PlayIcon size="2xl" />  // Too large for button
  Play
</Button>
```

### 2. Sử dụng màu semantic

```tsx
// ✅ Good
<SuccessIcon />  // Already has green color
<ErrorIcon />    // Already has red color

// ❌ Bad
<SuccessIcon color="red" />  // Confusing
```

### 3. Accessibility

```tsx
// ✅ Good
<HomeIcon aria-label="Go to home page" />

// ✅ Good with title
<HomeIcon title="Home" />
```

### 4. Consistent sizing

```tsx
// ✅ Good - consistent sizes in a group
<div className="flex gap-4">
  <HomeIcon size="md" />
  <SearchIcon size="md" />
  <SettingsIcon size="md" />
</div>

// ❌ Bad - mixed sizes
<div className="flex gap-4">
  <HomeIcon size="xs" />
  <SearchIcon size="xl" />
  <SettingsIcon size="md" />
</div>
```

## 🔧 Customization

### Tạo icon mới

1. Thêm component vào `src/components/icons/AllIcons.tsx`:

```tsx
export const MyNewIcon: React.FC<IconProps> = (props) => (
    <IconWrapper {...props} aria-label="My New Icon">
        <path d="..." />
        {/* SVG paths here */}
    </IconWrapper>
);
```

2. Thêm metadata vào demo page `src/app/demo/icons/page.tsx`:

```tsx
{ 
  name: 'MyNewIcon', 
  component: Icons.MyNewIcon, 
  category: 'misc', 
  description: 'My new icon description' 
},
```

### Thêm màu mới

Thêm vào `src/config/icons.config.ts`:

```tsx
colors: {
  // ... existing colors
  myNewColor: '#FF5733',
}
```

## 📱 Demo Page

Xem tất cả icons và ví dụ tại:

```
http://localhost:3000/demo/icons
```

Trang demo bao gồm:
- ✅ Bảng màu đầy đủ
- ✅ Tất cả icons với search/filter
- ✅ Ví dụ sử dụng
- ✅ Copy code nhanh (click vào icon)
- ✅ Preview với nhiều sizes

## 🤝 Contributing

Khi thêm icon mới:
1. Đảm bảo SVG có viewBox="0 0 24 24"
2. Sử dụng stroke-width="2" cho line icons
3. Thêm aria-label phù hợp
4. Test ở nhiều sizes khác nhau
5. Cập nhật documentation

## 📄 License

Hệ thống icon này là một phần của TOPIK App project.
