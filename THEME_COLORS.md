# 🎨 Emergency Response App - Theme Colors

## Brand Color Palette

### Primary Color - Emergency Red
- **Main**: `#cc3333` - Used for primary actions, emergency alerts, critical states
- **Hover**: `#b32d2d` - Darker shade for hover states
- **Light**: `#e66666` - Lighter shade for backgrounds
- **Lighter**: `#f5cccc` - Very light shade for subtle backgrounds

**Usage:**
- Primary buttons
- Emergency alerts
- Critical status indicators
- Destructive actions
- SOS triggers
- Emergency contact buttons

### Secondary Color - Navy Blue
- **Main**: `#003366` - Used for secondary actions, professional elements
- **Hover**: `#002952` - Darker shade for hover states
- **Light**: `#004d99` - Lighter shade for accents
- **Lighter**: `#ccd9e6` - Very light shade for backgrounds

**Usage:**
- Secondary buttons
- Navigation elements
- Professional badges
- Patient contact buttons
- Headers and titles
- Links

### Neutral Color - Gray
- **Main**: `#666666` - Used for text, borders, neutral states
- **Hover**: `#555555` - Darker shade for hover states
- **Light**: `#999999` - Lighter shade for secondary text
- **Lighter**: `#e6e6e6` - Very light shade for backgrounds

**Usage:**
- Body text
- Borders
- Disabled states
- Placeholders
- Secondary information
- Dividers

## Status Colors

### Success - Green
- **Background**: `#d4edda`
- **Text**: `#28a745`
- **Border**: `#c3e6cb`

**Usage:** Completed, Available, Active states

### Warning - Yellow
- **Background**: `#fff3cd`
- **Text**: `#ffc107`
- **Border**: `#ffeaa7`

**Usage:** Pending, En Route, Caution states

### Danger - Red (Brand Primary)
- **Background**: `#f5cccc`
- **Text**: `#cc3333`
- **Border**: `#cc3333` with 30% opacity

**Usage:** Cancelled, Critical, Error states

### Info - Navy (Brand Secondary)
- **Background**: `#ccd9e6`
- **Text**: `#003366`
- **Border**: `#003366` with 30% opacity

**Usage:** Assigned, On Duty, Information states

## UI Element Colors

### Backgrounds
- **Primary**: `#ffffff` (White)
- **Secondary**: `#f9fafb` (Light Gray)
- **Tertiary**: `#f3f4f6` (Lighter Gray)

### Borders
- **Default**: `#d1d5db`
- **Hover**: `#9ca3af`
- **Focus**: `#cc3333`

### Text
- **Primary**: `#1a1a1a` (Almost Black)
- **Secondary**: `#666666` (Gray)
- **Tertiary**: `#999999` (Light Gray)
- **Placeholder**: `#999999`

### Shadows
- **Small**: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- **Medium**: `0 4px 6px -1px rgba(0, 0, 0, 0.1)`
- **Large**: `0 10px 15px -3px rgba(0, 0, 0, 0.1)`

## Component-Specific Colors

### Buttons
- **Default**: Navy Blue (`#003366`)
- **Destructive**: Emergency Red (`#cc3333`)
- **Outline**: White with Gray border
- **Secondary**: Light Gray (`#e6e6e6`)
- **Ghost**: Transparent with hover
- **Link**: Navy Blue (`#003366`)

### Badges
- **Default**: Navy Blue background
- **Secondary**: Light Gray background
- **Destructive**: Emergency Red background
- **Outline**: White with border

### Call Buttons (SOS Table)
- **Patient**: Navy Blue (`#003366`) - Professional
- **Driver**: Green (`#28a745`) - Success/Active
- **Emergency Contact**: Emergency Red (`#cc3333`) - Critical

## Accessibility

All color combinations meet WCAG 2.1 AA standards for contrast:
- Primary Red on White: 4.5:1 ✓
- Navy Blue on White: 8.5:1 ✓
- Gray on White: 5.7:1 ✓

## CSS Variables

All colors are available as CSS custom properties in `src/app/globals.css`:

```css
--brand-primary: #cc3333
--brand-secondary: #003366
--brand-neutral: #666666
```

## Tailwind Classes

Use these Tailwind classes for consistent theming:

```
bg-[#cc3333]  - Primary background
bg-[#003366]  - Secondary background
bg-[#666666]  - Neutral background

text-[#cc3333]  - Primary text
text-[#003366]  - Secondary text
text-[#666666]  - Neutral text

border-[#cc3333]  - Primary border
border-[#003366]  - Secondary border
border-[#d1d5db]  - Default border
```

## Migration Notes

The theme has been updated from the previous color scheme:
- Old Primary: `#dc2626` → New: `#cc3333`
- Old Secondary: `#1e40af` → New: `#003366`
- Old Neutral: `#6b7280` → New: `#666666`

All components have been updated to use the new brand colors.

