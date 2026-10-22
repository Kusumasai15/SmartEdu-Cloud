# SmartEdu Cloud — UI Component Inventory (v2.0)

## 1. UI Primitives (`frontend/src/components/ui/`)

| Component | Path | Description | Variants / Props |
|---|---|---|---|
| **Button** | `components/ui/button.tsx` | Standard interactive action button | `variant` (default, destructive, outline, secondary, ghost, link, success), `size` (default, sm, lg, icon), `isLoading` |
| **Card** | `components/ui/card.tsx` | Container surface with header, content, footer | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| **Badge** | `components/ui/badge.tsx` | Status and role tags | `variant` (default, secondary, destructive, outline, success, warning, info, purple) |
| **Input** | `components/ui/input.tsx` | Text and number input field | `label`, `error`, `helperText`, `required`, standard HTML input props |
| **Textarea** | `components/ui/textarea.tsx` | Multiline text input | `label`, `error`, `helperText`, `rows`, standard textarea props |
| **Select** | `components/ui/select.tsx` | Custom styled dropdown select | `label`, `error`, `helperText`, children options |
| **Dialog** | `components/ui/dialog.tsx` | Accessible modal dialog with backdrop | `isOpen`, `onClose`, `title`, `description`, `maxWidth` (sm, md, lg, xl, 2xl) |
| **Table** | `components/ui/table.tsx` | Responsive data table with rounded container | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell` |
| **Skeleton** | `components/ui/skeleton.tsx` | Animated pulse placeholder | `className` |
| **Alert** | `components/ui/alert.tsx` | System feedback message container | `variant` (default, destructive, success, warning, info), `title` |
| **Avatar** | `components/ui/avatar.tsx` | User initials badge | `name`, `size` (sm, md, lg) |

---

## 2. SmartEdu Domain Components (`frontend/src/components/smartedu/`)

| Component | Path | Description | Key Features |
|---|---|---|---|
| **StatCard** | `components/smartedu/StatCard.tsx` | KPI metrics display card | Value, title, trend badge, icon, integrated loading skeleton |
| **PageHeader** | `components/smartedu/PageHeader.tsx` | Workspace title banner | Title, subtitle, badge tag, breadcrumbs, action button slot |
| **Breadcrumbs** | `components/smartedu/Breadcrumbs.tsx` | Hierarchical navigation trail | Home icon, separator chevrons, page links |
| **EmptyState** | `components/smartedu/EmptyState.tsx` | Clean empty state view | Icon, title, description, optional action CTA |
| **ErrorState** | `components/smartedu/ErrorState.tsx` | Failure recovery card | Icon, message, retry action button |
| **LoadingSkeleton** | `components/smartedu/LoadingSkeleton.tsx` | Specialized layout skeletons | `TableSkeleton`, `CardGridSkeleton`, `SyllabusSkeleton` |
| **ConfirmDialog** | `components/smartedu/ConfirmDialog.tsx` | Destructive action confirmation | Impact warning, destructive button styling, async loading |
| **StatusBadge** | `components/smartedu/StatusBadge.tsx` | Standardized status resolver | Formats `ACTIVE`, `DROPPED`, `COMPLETED`, `PRIMARY`, etc. |

---

## 3. Application Shell Components (`frontend/src/components/layout/`)

| Component | Path | Description |
|---|---|---|
| **AppShell** | `components/layout/AppShell.tsx` | Master responsive wrapper managing desktop sidebar and mobile drawer |
| **Sidebar** | `components/layout/Sidebar.tsx` | Collapsible, role-aware navigation bar for all 5 official roles |
| **TopHeader** | `components/layout/TopHeader.tsx` | Sticky header with theme toggle (Light/Dark), notifications, user profile menu |
