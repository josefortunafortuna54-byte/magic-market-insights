import {
  markWithdrawalPaid,
  rejectWithdrawalWithNotes,
  listWithdrawals,
  listReceipts,
  revenueStats,
  sendDm,
  sendPush,
  listReports,
  dismissReport,
  actOnReport,
  reportCount,
  listChannels,
  updateChannel,
  deleteChannel,
  toggleChannelPremium,
} from '@/lib/adminApi';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

jest.mock('@/lib/i18n', () => ({
  i18n: { t: (key: string) => key },
}));

const mockFetch = jest.fn();

function jsonResponse(data: unknown, ok = true) {
  return { ok, json: async () => data };
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch as unknown as typeof fetch;
  mockFetch.mockResolvedValue(jsonResponse({}));
});

function lastBody(): Record<string, unknown> {
  const call = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
  return JSON.parse(call[1].body);
}

describe('withdrawal wrappers', () => {
  it('markWithdrawalPaid sends mark_withdrawal_paid with id', async () => {
    await markWithdrawalPaid('w-1');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/functions/v1/admin-manage');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(lastBody()).toEqual({ action: 'mark_withdrawal_paid', id: 'w-1' });
  });

  it('rejectWithdrawalWithNotes sends reject_withdrawal with id and notes', async () => {
    await rejectWithdrawalWithNotes('w-2', 'invalid document');
    expect(lastBody()).toEqual({
      action: 'reject_withdrawal',
      id: 'w-2',
      notes: 'invalid document',
    });
  });

  it('listWithdrawals forwards pagination params and unwraps withdrawals', async () => {
    const rows = [{ id: 'w-1' }, { id: 'w-2' }];
    mockFetch.mockResolvedValueOnce(jsonResponse({ withdrawals: rows }));
    const result = await listWithdrawals('pending', 25, 10);
    expect(lastBody()).toEqual({
      action: 'list_withdrawals',
      status: 'pending',
      limit: 25,
      offset: 10,
    });
    expect(result).toEqual(rows);
  });

  it('listWithdrawals defaults to limit 50 offset 0 without status', async () => {
    await listWithdrawals();
    expect(lastBody()).toEqual({ action: 'list_withdrawals', limit: 50, offset: 0 });
  });

  it('listReceipts forwards pagination params and unwraps receipts', async () => {
    const rows = [{ id: 'r-1' }];
    mockFetch.mockResolvedValueOnce(jsonResponse({ receipts: rows }));
    const result = await listReceipts('approved', 10, 5);
    expect(lastBody()).toEqual({
      action: 'list_receipts',
      status: 'approved',
      limit: 10,
      offset: 5,
    });
    expect(result).toEqual(rows);
  });

  it('listReceipts defaults to limit 50 offset 0 without status', async () => {
    await listReceipts();
    expect(lastBody()).toEqual({ action: 'list_receipts', limit: 50, offset: 0 });
  });
});

describe('revenueStats', () => {
  it('sends revenue_stats action and returns full stats payload', async () => {
    const stats = {
      thisMonthRevenue: { AOA: 1000 },
      lastMonthRevenue: { AOA: 500 },
      thisMonthByPlan: { pro: 1000 },
      lastMonthByPlan: { basic: 500 },
      thisMonthCount: 3,
      pendingWithdrawalsAmount: { AOA: 200 },
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(stats));
    const result = await revenueStats();
    expect(lastBody()).toEqual({ action: 'revenue_stats' });
    expect(result).toEqual(stats);
  });
});

describe('dm/push wrappers', () => {
  it('sendDm sends snake_case payload and unwraps result', async () => {
    const res = { conversation_id: 'c-1', message_id: 'm-1', notified: 1 };
    mockFetch.mockResolvedValueOnce(jsonResponse(res));
    const result = await sendDm('u-1', 'hello');
    expect(lastBody()).toEqual({ action: 'send_dm', user_id: 'u-1', text: 'hello' });
    expect(result).toEqual(res);
  });

  it('sendPush sends null user_ids for broadcast and unwraps counts', async () => {
    const res = { notified: 42, target_users: 42 };
    mockFetch.mockResolvedValueOnce(jsonResponse(res));
    const result = await sendPush(null, 'Title', 'Message');
    expect(lastBody()).toEqual({
      action: 'send_push',
      user_ids: null,
      title: 'Title',
      message: 'Message',
    });
    expect(result).toEqual(res);
  });

  it('sendPush sends targeted user ids', async () => {
    await sendPush(['u-1', 'u-2'], 'Title', 'Message');
    expect(lastBody()).toEqual({
      action: 'send_push',
      user_ids: ['u-1', 'u-2'],
      title: 'Title',
      message: 'Message',
    });
  });
});

describe('report wrappers', () => {
  it('listReports forwards status and unwraps reports', async () => {
    const rows = [{ id: 'rep-1' }];
    mockFetch.mockResolvedValueOnce(jsonResponse({ reports: rows }));
    const result = await listReports('pending');
    expect(lastBody()).toEqual({ action: 'list_reports', status: 'pending' });
    expect(result).toEqual(rows);
  });

  it('dismissReport sends dismiss_report with id', async () => {
    await dismissReport('rep-1');
    expect(lastBody()).toEqual({ action: 'dismiss_report', id: 'rep-1' });
  });

  it('actOnReport maps deleteMessage to delete_message', async () => {
    await actOnReport('rep-1', true);
    expect(lastBody()).toEqual({ action: 'act_on_report', id: 'rep-1', delete_message: true });
  });

  it('reportCount unwraps count', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ count: 7 }));
    const result = await reportCount();
    expect(lastBody()).toEqual({ action: 'report_count' });
    expect(result).toBe(7);
  });
});

describe('channel management wrappers', () => {
  it('listChannels unwraps channels', async () => {
    const rows = [{ id: 'ch-1', name: 'sinais' }];
    mockFetch.mockResolvedValueOnce(jsonResponse({ channels: rows }));
    const result = await listChannels();
    expect(lastBody()).toEqual({ action: 'list_channels' });
    expect(result).toEqual(rows);
  });

  it('updateChannel spreads updates into payload', async () => {
    await updateChannel('ch-1', { display_name: 'Sinais', is_premium: true });
    expect(lastBody()).toEqual({
      action: 'update_channel',
      id: 'ch-1',
      display_name: 'Sinais',
      is_premium: true,
    });
  });

  it('deleteChannel sends delete_channel with id', async () => {
    await deleteChannel('ch-1');
    expect(lastBody()).toEqual({ action: 'delete_channel', id: 'ch-1' });
  });

  it('toggleChannelPremium unwraps is_premium', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ is_premium: true }));
    const result = await toggleChannelPremium('ch-1');
    expect(lastBody()).toEqual({ action: 'toggle_channel_premium', id: 'ch-1' });
    expect(result).toEqual({ is_premium: true });
  });
});
