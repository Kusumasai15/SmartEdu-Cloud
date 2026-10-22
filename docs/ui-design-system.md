# SmartEdu Cloud — UI/UX Design System Specification (v2.0)

## 1. Design Philosophy

SmartEdu Cloud adheres to a modern, restrained, and academic visual design system. The system avoids childish gamification, aggressive gradients, neon highlights, and fake metrics. It delivers clarity, calm readability, strict information hierarchy, and consistent interactions suitable for Tier-1 higher education institutions.

---

## 2. Design Tokens & Color Architecture

All colors and visual properties are specified as semantic CSS custom properties in `globals.css` with HSL values mapped to Tailwind CSS tokens.

### 2.1 Semantic Tokens
| Token | Light Mode Value | Dark Mode Value | Usage |
|---|---|---|---|
| `--background` | `210 40% 98%` | `224 71.4% 4.1%` | Global application viewport canvas |
| `--foreground` | `222.2 84% 4.9%` | `210 40% 98%` | Primary text and headings |
| `--card` | `0 0% 100%` | `224 71.4% 6.9%` | Dashboard containers and modules |
| `--primary` | `221.2 83.2% 53.3%` | `217.2 91.2% 59.8%` | Brand blue action buttons and active indicators |
| `--secondary` | `210 40% 96.1%` | `217.2 32.6% 17.5%` | Subtle interactive elements and secondary buttons |
| `--muted` | `210 40% 96.1%` | `217.2 32.6% 17.5%` | Inactive backgrounds and dividers |
| `--muted-foreground` | `215.4 16.3% 46.9%` | `215 20.2% 65.1%` | Subtitles, labels, captions, metadata |
| `--destructive` | `0 84.2% 60.2%` | `0 62.8% 30.6%` | Drop actions, error states, administrative warnings |
| `--success` | `142.1 76.2% 36.3%` | `142.1 70.6% 45.3%` | Active enrollment badges, operation confirmations |
| `--warning` | `38 92% 50%` | `38 92% 50%` | HOD badges, pending statuses |
| `--info` | `199 89% 48%` | `199 89% 48%` | Faculty badges, informational callouts |
| `--border` | `214.3 31.8% 91.4%` | `217.2 32.6% 17.5%` | Card, table, and input borders |
| `--ring` | `221.2 83.2% 53.3%` | `224.3 76.3% 48%` | Focus outlines for accessibility |
| `--radius` | `0.75rem (12px)` | `0.75rem (12px)` | Primary card and button corner radius |

---

## 3. Typography Hierarchy

| Level | Class / Styling | Typical Usage |
|---|---|---|
| **Display / H1** | `text-3xl font-extrabold tracking-tight` | Landing heroes, primary application titles |
| **Page Title (H2)** | `text-2xl font-extrabold tracking-tight` | Workspace headers (`PageHeader`) |
| **Section Title (H3)** | `text-lg font-bold tracking-tight` | Card section titles, major table titles |
| **Subheading (H4)** | `text-sm font-bold text-foreground` | Module titles, dialog headings |
| **Body Standard** | `text-xs text-foreground leading-relaxed` | Table cells, form descriptions, card body |
| **Body Muted / Meta** | `text-xs text-muted-foreground` | Helper text, secondary descriptors |
| **Micro Labels** | `text-[10px] sm:text-[11px] font-bold uppercase` | Badges, table column headers, form labels |
| **Monospace** | `font-mono text-xs` | Course codes (`CS101`), student identifiers, dates |

---

## 4. Layout & Application Shell

### 4.1 Desktop (>= 768px)
- **Collapsible Sidebar (60px / 240px)**: Displays brand header, role-specific navigation links with active indicators, and user scope card.
- **Sticky TopHeader (64px)**: Quick title, theme toggle (Light/Dark), notification trigger, user profile dropdown with logout.
- **Main Content**: Centered max-width (`max-w-7xl w-full mx-auto`) with responsive padding.

### 4.2 Mobile (< 768px)
- **Top Bar**: Hamburger menu button + brand title + quick user actions.
- **Drawer**: Slide-in mobile navigation menu with backdrop dismiss.

---

## 5. Micro-Interactions & State Management

- **Buttons**: Scale feedback on active click (`active:scale-[0.98]`), animated SVG loading spinner on pending state.
- **Cards**: Subtle border hover (`hover:border-primary/40`) with elevation transition (`transition-all`).
- **Loading**: Pulse skeletons (`Skeleton`, `TableSkeleton`, `CardGridSkeleton`, `SyllabusSkeleton`) preventing layout shifts.
- **Empty States**: Centered dashed containers with themed icons and actionable primary buttons.
- **Error States**: Dedicated alert containers with retry triggers and sanitized user-friendly messaging.
