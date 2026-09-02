import { reportMessage } from '@/lib/community';

const mockInsert = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: jest.fn(() => ({ insert: mockInsert })),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  mockInsert.mockResolvedValue({ error: null });
});

describe('reportMessage', () => {
  it('inserts a report with reporter id, reason and null details when omitted', async () => {
    await reportMessage('msg-1', 'spam');

    expect(mockGetUser).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith({
      message_id: 'msg-1',
      reporter_id: 'user-1',
      reason: 'spam',
      details: null,
    });
  });

  it('includes details when provided', async () => {
    await reportMessage('msg-2', 'harassment', 'offensive language');

    expect(mockInsert).toHaveBeenCalledWith({
      message_id: 'msg-2',
      reporter_id: 'user-1',
      reason: 'harassment',
      details: 'offensive language',
    });
  });

  it('throws when insert fails', async () => {
    mockInsert.mockResolvedValueOnce({ error: new Error('RLS violation') });
    await expect(reportMessage('msg-3', 'spam')).rejects.toThrow('RLS violation');
  });
});
