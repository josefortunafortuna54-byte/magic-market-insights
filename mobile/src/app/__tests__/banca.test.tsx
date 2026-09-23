import { fireEvent, render } from '@testing-library/react-native';
import BancaScreen from '../banca';
import { useCapitalAccount } from '@/hooks/useCapitalAccount';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'pt' } }),
}));

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ canAccessBanca: true, loading: false }) }));
jest.mock('@/hooks/useBanca', () => ({
  useBanca: jest.fn(() => ({
    config: { capital: 0, achieved: 0, metaPercent: 25, planId: 'conservador', totalWithdrawn: 0, currency: 'usd' },
    loading: false,
    save: jest.fn(),
  })),
}));
jest.mock('@/hooks/useCapitalAccount', () => ({
  useCapitalAccount: jest.fn(() => ({
    account: { id: 'a1', capital: 1000, achieved: 1250, currency: 'usd', total_withdrawn: 0, status: 'active', meta_percent: 25 },
    reports: [],
    loading: false,
    metaPercent: 25,
  })),
}));
jest.mock('@/hooks/useCapitalDeposits', () => ({
  useCapitalDeposits: jest.fn(() => ({
    deposits: [{ id: 'd1', plan: 'capital', amount: 1000, currency: 'usd', status: 'approved' }],
    loading: false,
  })),
}));
jest.mock('@/hooks/useWithdrawals', () => ({
  useWithdrawals: jest.fn(() => ({ withdrawals: [], loading: false })),
}));
jest.mock('@/core/format', () => ({
  formatBancaMoney: (n: number) => `$${n.toFixed(2)}`,
  formatShortDate: (s: string) => s,
}));
jest.mock('@/components/CapitalSimulatorCard', () => ({ CapitalSimulatorCard: () => null }));
jest.mock('@/components/GrowthPlanSection', () => ({ GrowthPlanSection: () => null }));
jest.mock('@/components/GradientCard', () => ({ GradientCard: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('@/components/PremiumLock', () => ({ PremiumLock: () => null }));
jest.mock('@/components/WithdrawalModal', () => ({ WithdrawalModal: jest.fn(() => null) }));

describe('BancaScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mostra saldo atual, lucro e meta (estado ativo)', () => {
    const { getByText } = render(<BancaScreen />);
    expect(getByText('$1250.00')).toBeTruthy();
    expect(getByText('+$250.00 (+25.0%)')).toBeTruthy();
    expect(getByText('+25%')).toBeTruthy();
  });

  it('mostra hero inativo quando não há conta nem capital', () => {
    (useCapitalAccount as jest.Mock).mockReturnValue({
      account: null, reports: [], loading: false, metaPercent: 25,
    });
    const { getByText } = render(<BancaScreen />);
    expect(getByText(/capital\.minDeposit/)).toBeTruthy();
  });

  it('abre o modal de levantamento ao carregar no botão (depósito >= min)', () => {
    (useCapitalAccount as jest.Mock).mockReturnValue({
      account: { id: 'a1', capital: 1000, achieved: 1250, currency: 'usd', total_withdrawn: 0, status: 'active', meta_percent: 25 },
      reports: [], loading: false, metaPercent: 25,
    });
    const { getByText } = render(<BancaScreen />);
    fireEvent.press(getByText('capital.requestWithdrawal'));
    expect(require('@/components/WithdrawalModal').WithdrawalModal).toHaveBeenCalled();
  });
});