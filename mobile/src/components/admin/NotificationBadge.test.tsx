import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { NotificationBadge } from './NotificationBadge';

describe('NotificationBadge', () => {
  const onPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the bell icon', () => {
    render(<NotificationBadge count={0} onPress={onPress} />);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('does not show badge when count is 0', () => {
    const { queryByText } = render(<NotificationBadge count={0} onPress={onPress} />);
    expect(queryByText('0')).toBeNull();
  });

  it('shows the count in the badge when count > 0', () => {
    render(<NotificationBadge count={5} onPress={onPress} />);
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('shows "99+" when count exceeds 99', () => {
    render(<NotificationBadge count={150} onPress={onPress} />);
    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('shows exact count when count is exactly 99', () => {
    render(<NotificationBadge count={99} onPress={onPress} />);
    expect(screen.getByText('99')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    render(<NotificationBadge count={3} onPress={onPress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onPress even when count is 0', () => {
    render(<NotificationBadge count={0} onPress={onPress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
