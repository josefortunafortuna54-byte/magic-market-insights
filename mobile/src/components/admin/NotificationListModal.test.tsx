import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { NotificationListModal } from './NotificationListModal';
import { AdminNotification } from '@/core/types';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'admin.notifications': 'Notifications',
        'admin.markAllRead': 'Mark all read',
        'admin.noNotifications': 'No notifications',
      };
      return translations[key] ?? key;
    },
  }),
}));

const makeNotification = (overrides: Partial<AdminNotification> = {}): AdminNotification => ({
  id: '1',
  type: 'receipt_pending',
  title: 'Pending receipt',
  message: 'A new receipt is pending review',
  read: false,
  created_at: '2025-01-15T10:00:00Z',
  ...overrides,
});

describe('NotificationListModal', () => {
  const onClose = jest.fn();
  const onMarkRead = jest.fn();
  const onMarkAllRead = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when not visible', () => {
    const { toJSON } = render(
      <NotificationListModal
        visible={false}
        notifications={[]}
        onClose={onClose}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
      />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders the modal with title when visible', () => {
    render(
      <NotificationListModal
        visible={true}
        notifications={[]}
        onClose={onClose}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
      />
    );
    expect(screen.getByText('Notifications')).toBeTruthy();
  });

  it('shows empty state when no notifications', () => {
    render(
      <NotificationListModal
        visible={true}
        notifications={[]}
        onClose={onClose}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
      />
    );
    expect(screen.getByText('No notifications')).toBeTruthy();
  });

  it('renders notification title and message', () => {
    const notif = makeNotification({ title: 'Receipt approved', message: 'Your receipt was approved' });
    render(
      <NotificationListModal
        visible={true}
        notifications={[notif]}
        onClose={onClose}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
      />
    );
    expect(screen.getByText('Receipt approved')).toBeTruthy();
    expect(screen.getByText('Your receipt was approved')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    render(
      <NotificationListModal
        visible={true}
        notifications={[]}
        onClose={onClose}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
      />
    );
    // The close button is an Ionicons "close" icon wrapped in Pressable
    // We find it by looking for the Pressable that contains the icon
    // Since Ionicons don't get text, we use the accessibility label approach
    // or we look at the rendered tree — the close Pressable has testID-less approach
    // Let's use the fact that we can query by role
    const closeButtons = screen.getAllByRole('button');
    // The last button in header actions should be the close button
    fireEvent.press(closeButtons[closeButtons.length - 1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows Mark All Read button when there are unread notifications', () => {
    const notif = makeNotification({ id: '1', read: false });
    render(
      <NotificationListModal
        visible={true}
        notifications={[notif]}
        onClose={onClose}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
      />
    );
    expect(screen.getByText('Mark all read')).toBeTruthy();
  });

  it('does not show Mark All Read when all notifications are read', () => {
    const notif = makeNotification({ id: '1', read: true });
    render(
      <NotificationListModal
        visible={true}
        notifications={[notif]}
        onClose={onClose}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
      />
    );
    expect(screen.queryByText('Mark all read')).toBeNull();
  });

  it('calls onMarkAllRead when Mark All Read is pressed', () => {
    const notif = makeNotification({ id: '1', read: false });
    render(
      <NotificationListModal
        visible={true}
        notifications={[notif]}
        onClose={onClose}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
      />
    );
    fireEvent.press(screen.getByText('Mark all read'));
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it('calls onMarkRead with the notification id when a notification is pressed', () => {
    const notif = makeNotification({ id: '42', title: 'Test', message: 'msg' });
    render(
      <NotificationListModal
        visible={true}
        notifications={[notif]}
        onClose={onClose}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
      />
    );
    fireEvent.press(screen.getByText('Test'));
    expect(onMarkRead).toHaveBeenCalledWith('42');
  });

  it('renders multiple notifications', () => {
    const notifs = [
      makeNotification({ id: '1', title: 'First' }),
      makeNotification({ id: '2', title: 'Second' }),
      makeNotification({ id: '3', title: 'Third' }),
    ];
    render(
      <NotificationListModal
        visible={true}
        notifications={notifs}
        onClose={onClose}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
      />
    );
    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
    expect(screen.getByText('Third')).toBeTruthy();
  });
});
