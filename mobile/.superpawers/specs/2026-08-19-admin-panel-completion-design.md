# Admin Panel Completion - Design Spec

## Overview

Complete the admin panel functionality for the TMT mobile app. The admin panel is currently functional but lacks several key features: search/filter, export, bulk actions, pull-to-refresh, skeleton loading, full user management, subscription control, and a notification system.

**Goal:** Transform the admin panel from a basic CRUD interface into a fully-featured management dashboard with real-time monitoring and alert capabilities.

**Architecture:** Modular approach with reusable hooks and components, keeping the admin panel maintainable and testable.

---

## 1. Architecture

### File Structure

```
src/
├── hooks/
│   ├── useAdminSearch.ts          # Search and filter logic
│   ├── useAdminBulkActions.ts     # Bulk selection and actions
│   ├── useAdminAlerts.ts          # In-app toast notifications
│   └── useAdminNotifications.ts   # Push notifications (FCM)
├── components/admin/
│   ├── SearchBar.tsx              # Reusable search input with debounce
│   ├── FilterChips.tsx            # Filter chips for type/status
│   ├── BulkActionsBar.tsx         # Bottom bar for bulk operations
│   ├── SkeletonList.tsx           # Skeleton loading for lists
│   ├── Toast.tsx                  # Toast notification component
│   ├── NotificationBadge.tsx      # Badge with unread count
│   └── ExportButton.tsx           # CSV export button
├── services/
│   ├── notifications.ts           # FCM push notification service
│   └── events.ts                  # Event monitoring and notification creation
├── lib/
│   ├── adminApi.ts                # Existing API client (updated)
│   └── supabase.ts                # Existing Supabase client
└── app/
    └── (tabs)/admin.tsx           # Main admin screen (refactored)
```

### Dependencies

- `expo-notifications` - Push notifications (FCM)
- `expo-device` - Device detection for push tokens
- `papaparse` - CSV generation (lightweight)
- No new major dependencies required

---

## 2. Database Schema

### New Tables

```sql
-- Admin notifications
CREATE TABLE admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN (
    'receipt_pending', 'receipt_approved', 'receipt_rejected',
    'signal_closed', 'signal_tp', 'signal_sl',
    'new_user', 'subscription_expired', 'subscription_expiring',
    'system_error'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT, -- 'signal', 'user', 'receipt', 'subscription'
  entity_id UUID,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin push tokens
CREATE TABLE admin_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Indexes
CREATE INDEX idx_admin_notifications_read ON admin_notifications(read);
CREATE INDEX idx_admin_notifications_created ON admin_notifications(created_at DESC);
CREATE INDEX idx_admin_push_tokens_user ON admin_push_tokens(user_id);

-- RLS policies
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_push_tokens ENABLE ROW LEVEL SECURITY;

-- Only admins can read notifications
CREATE POLICY "Admins can read notifications" ON admin_notifications
  FOR SELECT USING (
    auth.email() = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
  );

-- Only service role can insert notifications
CREATE POLICY "Service role can insert notifications" ON admin_notifications
  FOR INSERT WITH CHECK (true);

-- Users can manage their own push tokens
CREATE POLICY "Users can manage own push tokens" ON admin_push_tokens
  FOR ALL USING (auth.uid() = user_id);
```

---

## 3. Feature Details

### 3.1 Search and Filters

**Component:** `SearchBar.tsx`
- Text input with search icon
- Debounce 300ms before triggering search
- Clear button (X) when text exists
- Placeholder text via i18n

**Component:** `FilterChips.tsx`
- Horizontal scrollable row of chips
- Multi-select capability
- Chip types vary by context:
  - Signals: BUY, SELL, AGUARDAR
  - Posts: active, inactive
  - Receipts: pending, approved, rejected
  - Users: free, premium, admin

**Hook:** `useAdminSearch.ts`
```typescript
interface UseAdminSearchOptions<T> {
  data: T[];
  searchFields: (keyof T)[];
  filterConfig: FilterConfig[];
}

interface UseAdminSearchReturn<T> {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilters: string[];
  toggleFilter: (filter: string) => void;
  clearFilters: () => void;
  filteredData: T[];
}
```

**Applied to:** All lists (signals, boom hours, boom times, posts, users, receipts)

### 3.2 CSV Export

**Component:** `ExportButton.tsx`
- Button with download icon
- Shows "Exporting..." state during generation
- Generates CSV from currently filtered data
- Downloads as `<entity>_<date>.csv`

**Hook integration:** Uses `useAdminSearch` filteredData as source

**Fields per entity:**
- Signals: pair, type, confidence, entry, sl, tp, status, created_at
- Boom Hours: title, session, pairs, volatility, date
- Boom Times: pair, confidence, time, result, date
- Posts: title, pair, type, content, active, created_at
- Users: email, role, created_at, subscription_expires
- Receipts: user_email, plan, amount, status, created_at

### 3.3 Bulk Actions

**Component:** `BulkActionsBar.tsx`
- Fixed bottom bar when in selection mode
- Shows: "X selected" + "Delete" button + "Cancel" button
- Delete requires confirmation dialog

**Hook:** `useAdminBulkActions.ts`
```typescript
interface UseAdminBulkActionsReturn {
  isSelectionMode: boolean;
  toggleSelectionMode: () => void;
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  deleteSelected: () => Promise<void>;
}
```

**UI integration:**
- Long press on list item enters selection mode
- Checkbox appears on each item in selection mode
- Tap item in selection mode toggles selection

### 3.4 Pull-to-Refresh

**Implementation:** Add `RefreshControl` to all `FlatList` components in admin panels

```typescript
<FlatList
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[colors.primary]}
      tintColor={colors.primary}
    />
  }
/>
```

### 3.5 Skeleton Loading

**Component:** `SkeletonList.tsx`
- Two variants: `SkeletonCard` (dashboard) and `SkeletonRow` (lists)
- Animated pulse effect
- Props: `count`, `variant`

**Dashboard skeletons:**
- 4 stat cards with placeholder bars

**List skeletons:**
- Rows with avatar placeholder, two text bars, and action button placeholder

**Replaces:** Full-screen `Spinner` component

### 3.6 User Management

**Expanded `UsersPanel`:**

**Search:** Email/name search via `SearchBar`

**List items show:**
- Avatar placeholder (first letter of email)
- Email
- Role badge (free/premium/admin)
- Subscription status badge

**Tap opens `UserDetailModal`:**
- Full email
- Registration date
- Current plan
- Subscription expiration date
- Actions:
  - "Ban User" → confirmation → calls `admin-manage` with action `ban_user`
  - "Make Premium" / "Remove Premium" → calls `admin-manage` with action `update_user_role`
  - "Edit Expiration" → date picker → calls `admin-manage` with action `update_subscription_expiry`

**New edge function actions:**
- `ban_user`: Sets user metadata `banned: true`
- `update_user_role`: Updates user metadata `role: 'premium' | 'free'`
- `update_subscription_expiry`: Updates `subscriptions` table `expires_at`

### 3.7 Subscription Control

**Dashboard additions:**
- Card: "Expiring Soon" - count of subscriptions expiring in next 7 days
- Tap shows filtered list of users with expiring subscriptions

**Automatic alerts:**
- Edge function runs daily (cron) to check for expiring subscriptions
- Creates `admin_notifications` for subscriptions expiring within 3 days
- Sends push notification to admins

### 3.8 Notification System

#### In-App Notifications (Toasts)

**Component:** `Toast.tsx`
- Positioned at top of screen
- Types: success (green), error (red), warning (yellow), info (blue)
- Auto-dismiss after 4 seconds
- Swipe to dismiss manually
- Queue system for multiple toasts

**Hook:** `useAdminAlerts.ts`
```typescript
interface UseAdminAlertsReturn {
  toasts: Toast[];
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  dismiss: (id: string) => void;
}
```

**Usage:**
- After successful CRUD operation: `showSuccess("Signal created")`
- After error: `showError("Failed to delete signal")`
- On receipt pending: `showWarning("New receipt awaiting approval")`

#### Push Notifications (FCM)

**Service:** `notifications.ts`
```typescript
// Register device token
export async function registerForPushNotifications(userId: string): Promise<void>;

// Unregister token
export async function unregisterPushNotifications(userId: string): Promise<void>;

// Handle incoming notifications
export function setupNotificationHandlers(): void;
```

**Edge Function:** `admin-notifier`
- Triggered by Supabase webhooks on table changes
- Creates `admin_notifications` record
- Fetches all admin push tokens
- Sends push via FCM to each token

**Notification categories:**
- `receipt_pending` - New payment receipt
- `signal_closed` - Signal hit TP or SL
- `new_user` - New user registration
- `subscription_expiring` - Subscription expires in ≤3 days
- `system_error` - Edge function error

#### Notification List

**UI:** Accessible via bell icon in admin header
- Badge shows unread count
- Tap opens `NotificationList` modal
- Each notification shows: icon (by type), title, message, timestamp
- Tap marks as read + navigates to related entity (if applicable)
- "Mark all as read" button

**New API functions in `adminApi.ts`:**
```typescript
export async function getNotifications(limit?: number): Promise<AdminNotification[]>;
export async function markNotificationRead(id: string): Promise<void>;
export async function markAllNotificationsRead(): Promise<void>;
export async function getUnreadCount(): Promise<number>;
```

---

## 4. Admin Panel Layout Updates

### Header
```
[Admin Panel]                    [🔔 3] [Refresh]
```
- Bell icon with unread count badge
- Refresh button (existing)

### Dashboard
```
┌─────────────┬─────────────┐
│   Users     │  Signals    │
│    142      │    Today    │
│             │     12      │
├─────────────┼─────────────┤
│  Win Rate   │  Premium    │
│   73.2%     │     28      │
└─────────────┴─────────────┘

┌─────────────┬─────────────┐
│ Expiring    │  Pending    │
│   Soon      │  Receipts   │
│     5       │     2       │
└─────────────┴─────────────┘

[Close TP/SL] [Export Signals]
```

### List Panels (Signals, Boom, Posts, etc.)
```
[Search Bar...............]
[Filter: All | BUY | SELL ]

┌─────────────────────────┐
│ 📊 EUR/USD   BUY   85% │
│ Entry: 1.0850           │
│ SL: 1.0820  TP: 1.0900  │
└─────────────────────────┘
┌─────────────────────────┐
│ 📊 GBP/USD   SELL  72% │
│ Entry: 1.2650           │
│ SL: 1.2680  TP: 1.2600  │
└─────────────────────────┘

[Select] [Export] [Add New]
```

### Selection Mode
```
┌─────────────────────────┐
│ ☑ 📊 EUR/USD   BUY     │
│ ☐ 📊 GBP/USD   SELL    │
│ ☑ 📊 USD/JPY   BUY     │
└─────────────────────────┘

┌─────────────────────────┐
│ 3 selected   [Delete] [Cancel] │
└─────────────────────────┘
```

---

## 5. i18n Keys

### New Keys (all 16 locales)

```json
{
  "admin": {
    "search": "Search...",
    "filter": "Filter",
    "clearFilters": "Clear filters",
    "export": "Export",
    "exporting": "Exporting...",
    "selectAll": "Select all",
    "deselectAll": "Deselect all",
    "deleteSelected": "Delete selected",
    "selectedCount": "{{count}} selected",
    "confirmDelete": "Are you sure you want to delete {{count}} items?",
    "notifications": "Notifications",
    "markAllRead": "Mark all as read",
    "noNotifications": "No notifications",
    "banUser": "Ban User",
    "unbanUser": "Unban User",
    "makePremium": "Make Premium",
    "removePremium": "Remove Premium",
    "editExpiration": "Edit Expiration",
    "subscriptionExpires": "Subscription expires",
    "expiringSoon": "Expiring Soon",
    "pendingReceipts": "Pending Receipts",
    "userDetails": "User Details",
    "registrationDate": "Registration date",
    "currentPlan": "Current plan",
    "daysUntilExpiry": "{{days}} days until expiry",
    "expired": "Expired",
    "never": "Never"
  }
}
```

---

## 6. Implementation Order

### Phase 1: Core Infrastructure
1. Database schema (new tables + RLS)
2. `useAdminSearch` hook
3. `SearchBar` component
4. `FilterChips` component
5. `SkeletonList` component
6. Update all lists with search, filters, and skeletons

### Phase 2: Bulk Actions & Export
7. `useAdminBulkActions` hook
8. `BulkActionsBar` component
9. `ExportButton` component
10. Add bulk actions to all lists
11. Add export to all lists
12. Add pull-to-refresh to all lists

### Phase 3: User Management
13. Expand `UsersPanel` with search
14. Create `UserDetailModal`
15. Add edge function actions (ban, role, expiry)
16. Add subscription expiry tracking

### Phase 4: Notifications
17. `useAdminAlerts` hook + `Toast` component
18. Add toasts to all CRUD operations
19. Create `admin-notifier` edge function
20. `notifications.ts` service (FCM)
21. `useAdminNotifications` hook
22. Notification list UI with badge
23. Register push tokens on admin login

### Phase 5: Polish
24. Update `ADMIN-PANEL.md` spec
25. Test all features end-to-end
26. Fix any hardcoded strings (i18n)
27. Performance optimization

---

## 7. Testing Strategy

- **Unit tests:** Hooks (`useAdminSearch`, `useAdminBulkActions`)
- **Integration tests:** CRUD operations with toasts
- **Manual testing:** Push notifications, deep linking
- **Edge cases:** Empty lists, network errors, large datasets

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| FCM setup complexity | Medium | Use Expo Notifications API, which wraps FCM |
| Performance with large lists | Medium | Implement pagination, virtualized lists |
| Race conditions in bulk actions | Low | Use optimistic updates with rollback |
| Push token management | Low | Store tokens per device, clean up on logout |
