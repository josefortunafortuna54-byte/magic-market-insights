import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { UserDetailModal } from './UserDetailModal';
import { UserWithSubscription } from '@/core/types';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.confirm': 'Confirm',
        'common.cancel': 'Cancel',
        'admin.userDetails': 'User Details',
        'admin.banUser': 'Ban User',
        'admin.makePremium': 'Make Premium',
        'admin.removePremium': 'Remove Premium',
        'admin.registrationDate': 'Registration Date',
        'admin.currentPlan': 'Current Plan',
        'admin.subscriptionExpires': 'Subscription Expires',
        'admin.never': 'Never',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Spy on Alert.alert
jest.spyOn(Alert, 'alert');

const makeUser = (overrides: Partial<UserWithSubscription> = {}): UserWithSubscription => ({
  id: 'user-1',
  email: 'test@example.com',
  created_at: '2025-01-15T10:00:00Z',
  last_sign_in_at: '2025-06-01T10:00:00Z',
  role: 'free',
  subscription_status: 'active',
  ...overrides,
});

describe('UserDetailModal', () => {
  const onClose = jest.fn();
  const onBan = jest.fn().mockResolvedValue(undefined);
  const onRoleChange = jest.fn().mockResolvedValue(undefined);
  const onExpiryChange = jest.fn().mockResolvedValue(undefined);

  const renderModal = (user: UserWithSubscription | null) =>
    render(
      <UserDetailModal
        visible={true}
        user={user}
        onClose={onClose}
        onBan={onBan}
        onRoleChange={onRoleChange}
        onExpiryChange={onExpiryChange}
      />
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when user is null', () => {
    const { toJSON } = renderModal(null);
    expect(toJSON()).toBeNull();
  });

  it('renders user email', () => {
    const user = makeUser({ email: 'alice@example.com' });
    renderModal(user);
    expect(screen.getByText('alice@example.com')).toBeTruthy();
  });

  it('renders title', () => {
    const user = makeUser();
    renderModal(user);
    expect(screen.getAllByText('User Details').length).toBeGreaterThan(0);
  });

  it('shows free role badge for free user', () => {
    const user = makeUser({ role: 'free' });
    renderModal(user);
    expect(screen.getByText('FREE')).toBeTruthy();
  });

  it('shows premium role badge for premium user', () => {
    const user = makeUser({ role: 'premium' });
    renderModal(user);
    expect(screen.getByText('PREMIUM')).toBeTruthy();
  });

  it('shows plan options Free and Premium', () => {
    const user = makeUser();
    renderModal(user);
    expect(screen.getByText('Free')).toBeTruthy();
    expect(screen.getByText('Premium')).toBeTruthy();
  });

  it('shows ban action', () => {
    const user = makeUser();
    renderModal(user);
    expect(screen.getByText('Banir Utilizador')).toBeTruthy();
  });

  it('shows Never when no subscription expiry', () => {
    const user = makeUser({ subscription_expires: undefined });
    renderModal(user);
    expect(screen.getByText('Never')).toBeTruthy();
  });

  it('shows formatted expiry date when subscription has expiry', () => {
    const user = makeUser({ subscription_expires: '2026-12-31T00:00:00Z' });
    renderModal(user);
    // Component formats with pt-PT locale; nested Text appends remaining days
    expect(screen.getByText(/31\/12\/2026/)).toBeTruthy();
  });

  it('asks for confirmation and calls onRoleChange when Premium plan is pressed', async () => {
    const user = makeUser({ role: 'free' });
    renderModal(user);

    await act(async () => {
      fireEvent.press(screen.getByText('Premium'));
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      'Alterar para premium?',
      expect.any(String),
      expect.any(Array),
    );

    // Simulate confirming the alert
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const confirmBtn = buttons.find((b: any) => b.text === 'Confirmar');
    await act(async () => {
      confirmBtn.onPress();
    });
    expect(onRoleChange).toHaveBeenCalledWith('user-1', 'premium');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onRoleChange with "free" when Free plan is confirmed', async () => {
    const user = makeUser({ role: 'premium' });
    renderModal(user);

    await act(async () => {
      fireEvent.press(screen.getByText('Free'));
    });

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const confirmBtn = buttons.find((b: any) => b.text === 'Confirmar');
    await act(async () => {
      confirmBtn.onPress();
    });
    expect(onRoleChange).toHaveBeenCalledWith('user-1', 'free');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows Alert when ban action is pressed', async () => {
    const user = makeUser();
    renderModal(user);
    await act(async () => {
      fireEvent.press(screen.getByText('Banir Utilizador'));
    });
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('calls onBan when ban alert is confirmed', async () => {
    const user = makeUser();
    (Alert.alert as jest.Mock).mockImplementation((_title, _msg, buttons) => {
      const confirmBtn = buttons.find((b: any) => b.style === 'destructive');
      if (confirmBtn?.onPress) confirmBtn.onPress();
    });

    renderModal(user);
    await act(async () => {
      fireEvent.press(screen.getByText('Banir Utilizador'));
    });
    expect(onBan).toHaveBeenCalledWith('user-1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is pressed', () => {
    const user = makeUser();
    renderModal(user);
    const closeButton = screen.getByLabelText('Close');
    fireEvent.press(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
