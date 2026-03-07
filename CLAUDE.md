# Fence Magic — Design System

## App Identity
- **App name:** Fence Magic
- **Purpose:** Fencing pricebook and quoting platform for trade businesses
- **Tone:** Professional, efficient, trade-focused. Not corporate, not consumer. Built for people who work with their hands and need data fast.

## Colour Palette

### Light Mode
- Background: `#F5F0E8` (warm cream)
- Surface/cards: `#FFFFFF`
- Border: `#E2D9CC`
- Primary: `#1B4332` (deep forest green)
- Primary hover: `#2D6A4F`
- Accent/interactive: `#2D6A4F`
- Text primary: `#1A1A1A`
- Text secondary: `#6B6B6B`
- Text muted: `#9E9E9E`

### Dark Mode
- Background: `#0D0D0D` (near-black, not pure black)
- Surface/cards: `#141414`
- Surface elevated: `#1A1A1A`
- Border: `#2A2A2A`
- Primary: `#2D6A4F` (forest green, slightly lighter for dark mode)
- Primary hover: `#3D8B66`
- Active row tint: `rgba(45, 106, 79, 0.08)` (subtle green glow on rows)
- Text primary: `#F0F0F0`
- Text secondary: `#A0A0A0`
- Text muted: `#606060`

### Status Colours (same in both modes)
- Ready / Active / Success: `#2D6A4F` green, badge bg `rgba(45,106,79,0.15)`
- Needs Review / Warning: `#B45309` amber, badge bg `rgba(180,83,9,0.15)`
- Ignored / Inactive: `#9E9E9E` grey, badge bg `rgba(158,158,158,0.15)`
- Promoted / Complete: `#1D4ED8` blue, badge bg `rgba(29,78,216,0.15)`
- Error / Destructive: `#DC2626` red, badge bg `rgba(220,38,38,0.15)`
- Owner role: `#2D6A4F` green
- Employee role: `#7C3AED` purple

## Typography
- **Font:** Inter (via Google Fonts or next/font)
- **Headings:** Inter Bold / Semibold
- **Body:** Inter Regular, 14px base
- **Data/numbers:** Inter Tabular or monospace fallback for prices and dimensions
- **Column headers:** Uppercase, letter-spacing: 0.05em, font-size: 11px, muted colour

## Layout
- **Navigation:** Left sidebar, fixed, 240px wide
- **Sidebar dark mode:** `#0F1F17` (very dark green-black)
- **Sidebar light mode:** `#1B4332` (forest green — always dark regardless of mode)
- **Sidebar text:** Always light (`#F0F0F0`)
- **Active nav item:** Green accent background, full width highlight
- **Main content:** Padded container, max-width 1400px
- **Page header:** Breadcrumb + page title + primary action button (top right)

## Components

### Tables
- Generous row height: 52–56px
- Subtle row striping or hover state (green tint in dark, cream tint in light)
- Sticky header on scroll
- Sortable column headers with up/down indicators
- In dark mode: active/hover rows get subtle `rgba(45,106,79,0.08)` green glow
- Inline editing rows: highlight with left border accent in primary green

### Status Badges
- Pill shape, small (height 22px)
- Coloured border + matching text + translucent background
- Never solid filled — always translucent
- Examples: Ready (green), Needs Review (amber), Ignored (grey), Promoted (blue)

### Buttons
- Primary: Forest green background, white text, slight rounding (border-radius: 6px)
- Secondary: Outline style, green border and text
- Destructive: Red outline
- Ghost: No border, text only
- Icon buttons: Square, subtle hover state

### Cards / Panels
- Light mode: White background, warm border, subtle shadow
- Dark mode: `#141414` background, `#2A2A2A` border, no shadow
- Border radius: 8px
- Padding: 20px

### Forms & Inputs
- Border radius: 6px
- Focus ring: Primary green
- Error state: Red border + red helper text
- Light mode: White bg, `#E2D9CC` border
- Dark mode: `#1A1A1A` bg, `#333` border

### Import Review Table (special)
- Needs Review rows: Amber left border (3px) + very subtle amber row tint
- Inferred dimension values: Highlighted in amber text with tooltip
- Promoted rows: Locked appearance — muted text, lock icon, no hover state

## Motion & Interaction
- Transitions: 150ms ease for hover states
- No heavy animations — this is a work tool, not a consumer app
- Row auto-promote: Brief green flash on the row before it moves to Ready
- Loading states: Skeleton screens, not spinners

## Dark/Light Mode
- Toggle in top-right of sidebar or user menu
- Persist preference in localStorage
- System preference as default
- Sidebar always uses dark forest green regardless of mode

## Iconography
- Use **Lucide React** icons throughout (already in the stack via shadcn/ui)
- Consistent 16px or 20px sizing
- Muted colour by default, primary colour on active/hover

## Do Not
- Use pure black (`#000000`) or pure white (`#FFFFFF`) as backgrounds
- Use heavy drop shadows
- Use more than 5 colours on any single screen
- Use more than 2 font weights on any single screen
- Animate data tables
- Use emoji in the UI