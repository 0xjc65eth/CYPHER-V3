# CYPHER Design System

> Bloomberg Terminal inspired design system for professional Bitcoin trading

## 🎨 Design Principles

### 1. **Terminal Aesthetic**
- Dark theme with high contrast
- Monospace fonts for data
- Orange (#F59E0B) as primary accent color
- Minimal decorations, maximum information density

### 2. **Information Hierarchy**
- Critical data prominently displayed
- Color coding for quick recognition (green = up, red = down)
- Consistent spacing and typography

### 3. **Performance First**
- Optimized animations (200ms transitions)
- Minimal re-renders
- Efficient data updates

### 4. **Accessibility**
- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader friendly
- Focus indicators

---

## 📐 Design Tokens

### Colors

#### Primary Palette
```js
accent: '#F59E0B'        // Bitcoin Orange - Primary actions
accent-dim: '#F59E0B80'  // Dimmed accent for backgrounds
accent-bright: '#FFB347' // Bright accent for highlights
```

#### Surfaces
```js
surface-0: '#000000'  // Pure black background
surface-1: '#0a0a0a'  // Slightly elevated
surface-2: '#111111'  // Cards, panels
surface-3: '#1a1a1a'  // Elevated cards
surface-4: '#222222'  // Highest elevation
```

#### Borders
```js
border: '#1e1e1e'           // Default border
border-active: '#F7931A40'  // Active/hover state
```

#### Semantic Colors
```js
success: '#10B981'  // Green - positive values, confirmations
danger: '#EF4444'   // Red - negative values, errors
warning: '#F59E0B'  // Yellow - warnings, pending states
info: '#3B82F6'     // Blue - informational messages
```

### Typography

#### Font Families
```js
sans: 'Inter'              // UI text, headings
mono: 'JetBrains Mono'     // Data, numbers, code
terminal: 'JetBrains Mono' // Terminal-specific text
```

#### Font Sizes (Terminal Scale)
```js
terminal-xs: '10px'   // Small labels
terminal-sm: '11px'   // Secondary text
terminal-base: '12px' // Body text
terminal-lg: '14px'   // Headings
terminal-xl: '16px'   // Large headings
```

### Spacing (Terminal Scale)
```js
terminal-xs: '2px'    // Tight spacing
terminal-sm: '4px'    // Compact spacing
terminal-md: '8px'    // Default spacing
terminal-lg: '12px'   // Comfortable spacing
terminal-xl: '16px'   // Loose spacing
terminal-2xl: '24px'  // Section spacing
terminal-3xl: '32px'  // Large sections
terminal-4xl: '48px'  // Page sections
```

### Border Radius
```js
terminal-sm: '2px'   // Subtle rounding
terminal: '4px'      // Default
terminal-lg: '8px'   // Cards
terminal-xl: '12px'  // Large containers
```

### Shadows
```js
terminal: '0 0 0 1px rgba(247, 147, 26, 0.1), 0 4px 16px rgba(0, 0, 0, 0.8)'
terminal-inner: 'inset 0 0 0 1px rgba(247, 147, 26, 0.2)'
terminal-glow: '0 0 20px rgba(247, 147, 26, 0.3)'
glow-sm: '0 0 4px rgba(247, 147, 26, 0.3)'
glow-md: '0 0 8px rgba(247, 147, 26, 0.4)'
glow-lg: '0 0 16px rgba(247, 147, 26, 0.5)'
```

### Transitions
```js
duration: '200ms'                              // Standard transition
timing: 'cubic-bezier(0.4, 0, 0.2, 1)'       // Smooth easing
```

---

## 🧱 Component Primitives

### Button
```tsx
import { Button } from '@/components/ui/primitives'

// Variants
<Button variant="primary">Primary Action</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Delete</Button>
<Button variant="success">Confirm</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// States
<Button loading>Processing...</Button>
<Button disabled>Disabled</Button>
<Button fullWidth>Full Width</Button>
```

### Card
```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/primitives'

<Card variant="default" padding="md">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content here
  </CardContent>
  <CardFooter>
    Footer content
  </CardFooter>
</Card>

// Variants
<Card variant="bordered">Highlighted Card</Card>
<Card variant="elevated">Elevated Card</Card>
```

### Badge
```tsx
import { Badge } from '@/components/ui/primitives'

<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Error</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="new" pulse>New</Badge>
```

### Input
```tsx
import { Input, Textarea, Label } from '@/components/ui/primitives'

<Label htmlFor="email" required>Email</Label>
<Input 
  id="email"
  type="email" 
  placeholder="Enter email"
  fullWidth
  error={false}
/>

<Textarea 
  placeholder="Description"
  rows={4}
  fullWidth
/>
```

---

## ♿ Accessibility

### Focus Management
```tsx
import { createFocusTrap } from '@/lib/a11y/focus'

// Trap focus in modal
const cleanup = createFocusTrap(modalElement)

// Clean up on unmount
return cleanup
```

### Screen Reader Announcements
```tsx
import { announce } from '@/lib/a11y/focus'

// Polite announcement (doesn't interrupt)
announce('Data loaded successfully', 'polite')

// Assertive announcement (interrupts)
announce('Error occurred!', 'assertive')
```

### Keyboard Navigation
```tsx
import { navigateList, KEYS } from '@/lib/a11y/keyboard'

function handleKeyDown(e: KeyboardEvent) {
  const newIndex = navigateList(e, items, currentIndex, {
    loop: true,
    horizontal: false
  })
  setCurrentIndex(newIndex)
}
```

### Roving Tab Index
```tsx
import { RovingTabIndex } from '@/lib/a11y/keyboard'

const tabIndex = new RovingTabIndex(items, 0)

// Navigate
tabIndex.next()      // Move to next item
tabIndex.previous()  // Move to previous item
tabIndex.first()     // Move to first item
tabIndex.last()      // Move to last item
```

---

## 🎭 Utility Classes

### Terminal Effects
```css
.terminal-border     /* Orange border with hover effect */
.terminal-text       /* Terminal-style text */
.terminal-background /* Dotted grid background */
.terminal-grid       /* Grid overlay */
.terminal-scanlines  /* CRT scanline effect */
.terminal-flicker    /* Subtle flicker animation */
```

### Focus Styles
```css
.focus-terminal  /* Accessible focus ring */
```

---

## 📱 Responsive Breakpoints

```js
sm: '640px'   // Mobile landscape
md: '768px'   // Tablet
lg: '1024px'  // Desktop
xl: '1280px'  // Large desktop
2xl: '1536px' // Extra large
```

---

## 🎬 Animations

### Built-in Animations
```css
animate-fade-in       /* Fade in effect */
animate-slide-in      /* Slide from bottom */
animate-pulse-slow    /* Slow pulse */
animate-terminal-blink /* Terminal cursor blink */
animate-data-scroll   /* Scrolling data ticker */
animate-price-flash   /* Price update flash */
animate-number-update /* Number change highlight */
animate-shimmer       /* Loading shimmer */
```

---

## 📋 Best Practices

### 1. **Use Semantic HTML**
```tsx
// ✅ Good
<button onClick={...}>Click me</button>

// ❌ Bad
<div onClick={...}>Click me</div>
```

### 2. **Provide ARIA Labels**
```tsx
// ✅ Good
<button aria-label="Close modal">
  <X />
</button>

// ❌ Bad
<button>
  <X />
</button>
```

### 3. **Use Design Tokens**
```tsx
// ✅ Good
<div className="bg-[#1a1a2e] border border-[#2a2a3e]">

// ❌ Bad
<div style={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e' }}>
```

### 4. **Keyboard Accessibility**
```tsx
// ✅ Good
<div 
  role="button" 
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  onClick={handleClick}
>

// ❌ Bad
<div onClick={handleClick}>
```

### 5. **Loading States**
```tsx
// ✅ Good
<Button loading={isLoading}>
  {isLoading ? 'Loading...' : 'Submit'}
</Button>

// ❌ Bad - no loading indicator
<button onClick={submit}>Submit</button>
```

---

## 🚀 Migration Guide

### Step 1: Import Primitives
```tsx
// Before
import Button from '@/components/Button'

// After
import { Button } from '@/components/ui/primitives'
```

### Step 2: Update Props
```tsx
// Before
<Button primary onClick={...}>

// After
<Button variant="primary" onClick={...}>
```

### Step 3: Use Design Tokens
```tsx
// Before
className="px-4 py-2 bg-orange-500"

// After
className="px-terminal-lg py-terminal-md bg-[#f59e0b]"
```

### Step 4: Add Accessibility
```tsx
// Before
<button onClick={...}>

// After
<Button onClick={...} aria-label="Descriptive label">
```

---

## 📚 Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Accessibility](https://react.dev/learn/accessibility)

---

**Version:** 1.0.0  
**Last Updated:** 2026-02-11  
**Maintained by:** CYPHER Development Team
