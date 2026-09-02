export const POPULAR_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF',
  'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP',
] as const;

export type TradingPair = typeof POPULAR_PAIRS[number];

export interface SessionPreset {
  key: string;
  labelKey: string;
  title: string;
  time_wat: string;
  time_gmt: string;
  pairs: string[];
  volatility: number;
  badge: string;
  description: string;
}

export const SESSION_PRESETS: SessionPreset[] = [
  {
    key: 'tokyo',
    labelKey: 'admin.presetTokyo',
    title: 'Boom de Tokyo',
    time_wat: '02:00',
    time_gmt: '01:00',
    pairs: ['USDJPY', 'AUDUSD', 'NZDUSD'],
    volatility: 2,
    badge: '🇯🇵',
    description: 'Sessão asiática — pares com JPY',
  },
  {
    key: 'frankfurt',
    labelKey: 'admin.presetLondon',
    title: 'Boom de Frankfurt',
    time_wat: '08:00',
    time_gmt: '07:00',
    pairs: ['EURUSD', 'EURGBP', 'USDCHF'],
    volatility: 3,
    badge: '🇩🇪',
    description: 'Abertura europeia — pares com EUR',
  },
  {
    key: 'london',
    labelKey: 'admin.presetLondon',
    title: 'Boom de Londres',
    time_wat: '11:00',
    time_gmt: '10:00',
    pairs: ['EURUSD', 'GBPUSD', 'XAUUSD', 'EURGBP'],
    volatility: 4,
    badge: '🇬🇧',
    description: 'Maior liquidez forex — pares com GBP',
  },
  {
    key: 'overlap',
    labelKey: 'admin.presetNewYork',
    title: 'Boom Overlap',
    time_wat: '14:00',
    time_gmt: '13:00',
    pairs: ['EURUSD', 'GBPUSD', 'USDCAD', 'XAUUSD'],
    volatility: 5,
    badge: '🔥',
    description: 'Overlap Londres/NY — Máxima volatilidade',
  },
  {
    key: 'newyork',
    labelKey: 'admin.presetNewYork',
    title: 'Boom de Nova York',
    time_wat: '15:30',
    time_gmt: '14:30',
    pairs: ['EURUSD', 'GBPUSD', 'USDCAD', 'XAUUSD'],
    volatility: 4,
    badge: '🇺🇸',
    description: 'Sessão americana — alta liquidez',
  },
];

export const TIMEFRAME_OPTIONS = ['M15', 'M30', 'H1', 'H4', 'D1'] as const;

export const VOLATILITY_LEVELS = [
  { value: 1, label: 'Baixa', color: '#34C759' },
  { value: 2, label: 'Moderada', color: '#30D158' },
  { value: 3, label: 'Média', color: '#FF9F0A' },
  { value: 4, label: 'Alta', color: '#FF6B35' },
  { value: 5, label: 'Muito Alta', color: '#FF453A' },
] as const;

export const CONFIDENCE_PRESETS = [
  { value: 50, label: 'Baixa', color: '#98989D' },
  { value: 70, label: 'Média', color: '#FF9F0A' },
  { value: 85, label: 'Alta', color: '#34C759' },
  { value: 95, label: 'Muito Alta', color: '#16A43A' },
] as const;

export const TIME_OFFSETS = [
  { minutes: 30, label: '30min' },
  { minutes: 60, label: '1h' },
  { minutes: 120, label: '2h' },
  { minutes: 240, label: '4h' },
  { minutes: 480, label: '8h' },
] as const;

export const BADGE_OPTIONS = ['⚡', '🔥', '🎯', '💎', '🚀', '📊', '💰', '🏆'] as const;

export const WAT_TIMES = [
  { time: '00:35', label: '00:35', session: 'Asia Night' },
  { time: '02:00', label: '02:00', session: 'Tokyo' },
  { time: '03:00', label: '03:00', session: 'Asia' },
  { time: '05:00', label: '05:00', session: 'Sydney' },
  { time: '06:30', label: '06:30', session: 'Asia/Europa' },
  { time: '08:00', label: '08:00', session: 'Frankfurt' },
  { time: '09:30', label: '09:30', session: 'Pre-Londres' },
  { time: '11:00', label: '11:00', session: 'Londres' },
  { time: '12:30', label: '12:30', session: 'Londres MD' },
  { time: '14:00', label: '14:00', session: 'Overlap' },
  { time: '15:30', label: '15:30', session: 'Nova York' },
  { time: '17:00', label: '17:00', session: 'NY Tarde' },
  { time: '17:30', label: '17:30', session: 'NY Tarde' },
  { time: '18:35', label: '18:35', session: 'NY Fechamento' },
  { time: '20:00', label: '20:00', session: 'Pós-NY' },
  { time: '21:35', label: '21:35', session: 'Noite' },
  { time: '22:30', label: '22:30', session: 'Asia Night' },
] as const;

export const SIGNAL_REASONS = [
  'Suporte forte',
  'Resistência',
  'Tendência de alta',
  'Tendência de baixa',
  'Rejeição de preço',
  'Volume alto',
  'Padrão de candle',
  'Fibonacci',
  'Breakout',
  'Correção de tendência',
  'Notícias fundamentais',
  'Divergência',
] as const;

export const POST_TITLES = [
  'Análise do dia',
  'Previsão de mercado',
  'Revisão de sinais',
  'Dica de trading',
  'Gestão de risco',
  'Análise técnica',
  'Notícias do mercado',
  'Revisão semanal',
] as const;
