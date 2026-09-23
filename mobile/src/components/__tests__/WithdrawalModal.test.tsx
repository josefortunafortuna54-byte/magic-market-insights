import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { WithdrawalModal } from '../WithdrawalModal';
import { submitWithdrawalRequest } from '@/lib/adminApi';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'pt' } }),
}));

const mockAddMovement = jest.fn();
jest.mock('@/lib/adminApi', () => ({ submitWithdrawalRequest: jest.fn() }));
jest.mock('@/hooks/useMovements', () => ({ useMovements: () => ({ addMovement: mockAddMovement }) }));

const mockedSubmit = submitWithdrawalRequest as jest.Mock;

const renderModal = (props: Partial<Parameters<typeof WithdrawalModal>[0]>) =>
  render(<WithdrawalModal visible currency="usd" available={200} onClose={jest.fn()} {...props} />);

const pressRequest = (getByText: (s: string) => any) => fireEvent.press(getByText('capital.requestWithdrawal'));

describe('WithdrawalModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('bloqueia sem método e sem montante', () => {
    const { getByText } = renderModal({});
    pressRequest(getByText);
    expect(mockedSubmit).not.toHaveBeenCalled();
  });

  it('ativa e submete com método e montante válidos', () => {
    const { getByText, getByPlaceholderText } = renderModal({});
    fireEvent.press(getByText('Rodotpay'));
    fireEvent.changeText(getByPlaceholderText('0.00'), '100');
    pressRequest(getByText);
    expect(mockedSubmit).toHaveBeenCalledWith({ method: 'rodotpay', amount: 100, currency: 'usd', details: undefined });
  });

  it('não permite montante acima do disponível', () => {
    const { getByText, getByPlaceholderText } = renderModal({ available: 50 });
    fireEvent.press(getByText('Rodotpay'));
    fireEvent.changeText(getByPlaceholderText('0.00'), '100');
    pressRequest(getByText);
    expect(mockedSubmit).not.toHaveBeenCalled();
  });

  it('exige dados de pagamento em AOA', () => {
    const { getByText, getByPlaceholderText } = renderModal({ currency: 'aoa' });
    fireEvent.press(getByText('Rodotpay'));
    fireEvent.changeText(getByPlaceholderText('0.00'), '100');
    pressRequest(getByText);
    expect(mockedSubmit).not.toHaveBeenCalled();
  });

  it('submete e regista movimento de saque com método/status', async () => {
    const { getByText, getByPlaceholderText } = renderModal({});
    fireEvent.press(getByText('Rodotpay'));
    fireEvent.changeText(getByPlaceholderText('0.00'), '100');
    pressRequest(getByText);
    await waitFor(() =>
      expect(mockAddMovement).toHaveBeenCalledWith(expect.objectContaining({
        type: 'withdrawal',
        method: 'rodotpay',
        amount: 100,
        currency: 'usd',
        status: 'pendente',
      })),
    );
  });
});