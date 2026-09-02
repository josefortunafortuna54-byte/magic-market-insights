import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { BulkActionsBar } from './BulkActionsBar';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'admin.selectedCount') return `${opts?.count} selected`;
      if (key === 'common.cancel') return 'Cancel';
      if (key === 'admin.deleteSelected') return 'Delete';
      return key;
    },
  }),
}));

describe('BulkActionsBar', () => {
  const onDelete = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when selectedCount is 0', () => {
    const { toJSON } = render(
      <BulkActionsBar selectedCount={0} onDelete={onDelete} onCancel={onCancel} />
    );
    expect(toJSON()).toBeNull();
  });

  it('displays the selected count', () => {
    render(<BulkActionsBar selectedCount={5} onDelete={onDelete} onCancel={onCancel} />);
    expect(screen.getByText('5 selected')).toBeTruthy();
  });

  it('calls onCancel when cancel is pressed', () => {
    render(<BulkActionsBar selectedCount={3} onDelete={onDelete} onCancel={onCancel} />);
    fireEvent.press(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete button is pressed', () => {
    render(<BulkActionsBar selectedCount={3} onDelete={onDelete} onCancel={onCancel} />);
    fireEvent.press(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
