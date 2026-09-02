import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { WebView } from 'react-native-webview';
import { TV_INTERVALS } from '@/core/gating';
import type { Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { Spinner } from '@/components/ui';
import { i18n } from '@/lib/i18n';

const TV_LOCALES: Record<string, string> = {
  en: 'en',
  es: 'es',
  de: 'de',
  fr: 'fr',
  it: 'it',
  nl: 'nl',
  pt: 'pt',
  ru: 'ru',
  zh: 'zh',
  ja: 'ja',
  ko: 'ko',
  ar: 'ar',
};

// Pares crypto → exchanges reais no TradingView (FX_IDC não tem cripto).
const CRYPTO_TV_SYMBOLS: Record<string, string> = {
  BTCUSD: 'BITSTAMP:BTCUSD',
  BTCUSDT: 'BINANCE:BTCUSDT',
  ETHUSD: 'BITSTAMP:ETHUSD',
  ETHUSDT: 'BINANCE:ETHUSDT',
  SOLUSD: 'BINANCE:SOLUSDT',
  SOLUSDT: 'BINANCE:SOLUSDT',
  XRPUSD: 'BITSTAMP:XRPUSD',
  XRPUSDT: 'BINANCE:XRPUSDT',
  ADAUSD: 'BINANCE:ADAUSDT',
  ADAUSDT: 'BINANCE:ADAUSDT',
  DOGEUSD: 'BINANCE:DOGEUSDT',
  DOGEUSDT: 'BINANCE:DOGEUSDT',
  BNBUSD: 'BINANCE:BNBUSDT',
  BNBUSDT: 'BINANCE:BNBUSDT',
  LTCUSD: 'BITSTAMP:LTCUSD',
  LTCUSDT: 'BINANCE:LTCUSDT',
};

function tvSymbol(pair: string): string {
  const raw = pair.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const known = CRYPTO_TV_SYMBOLS[raw];
  if (known) return known;
  // Qualquer par terminado em USDT é cripto na Binance
  if (/^[A-Z0-9]{5,12}USDT$/.test(raw)) return `BINANCE:${raw}`;
  if (raw === 'XAUUSD') return 'OANDA:XAUUSD';
  return `FX_IDC:${raw}`;
}

interface ChartLevel {
  price: number;
  color: string;
  text: string;
  dashed?: boolean;
}

function buildLevels(
  t: TFunction,
  colors: Palette,
  entry?: number,
  stopLoss?: number,
  takeProfit?: number,
): ChartLevel[] {
  const levels: ChartLevel[] = [];
  const push = (price: number | undefined, color: string, text: string, dashed = false) => {
    if (typeof price === 'number' && isFinite(price) && price > 0) {
      levels.push({ price, color, text, dashed });
    }
  };
  push(stopLoss, colors.destructive, t('components.tradingViewChart.stopLoss'), true);
  push(entry, colors.accent, t('components.tradingViewChart.entry'), false);
  push(takeProfit, colors.success, t('components.tradingViewChart.takeProfit'), false);
  return levels;
}

export function TradingViewChart({
  pair,
  timeframe,
  height = 360,
  entry,
  stopLoss,
  takeProfit,
  onPress,
  style,
}: {
  pair: string;
  timeframe?: string;
  height?: number;
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  onPress?: () => void;
  style?: object;
}) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const interval = TV_INTERVALS[timeframe ?? 'M15'] ?? '15';
  const symbol = tvSymbol(pair);
  const locale = TV_LOCALES[i18n.language] ?? 'en';
  const gridColor = scheme === 'light' ? 'rgba(11, 11, 15, 0.08)' : 'rgba(42, 46, 57, 0.35)';
  const levels = useMemo(
    () => buildLevels(t, colors, entry, stopLoss, takeProfit),
    [entry, stopLoss, takeProfit, t, colors],
  );

  const html = useMemo(() => {
    const levelsJson = JSON.stringify(levels)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
    return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
  #tv { width: 100vw; height: 100vh; }
</style>
</head>
<body>
<div id="tv"></div>
<script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
<script type="text/javascript">
  var LEVELS = ${levelsJson};
  var widget = new TradingView.widget({
    autosize: true,
    symbol: "${symbol}",
    interval: "${interval}",
    timezone: "Etc/UTC",
    theme: "${scheme}",
    style: "1",
    locale: "${locale}",
    backgroundColor: "rgba(0, 0, 0, 0)",
    gridColor: "${gridColor}",
    hide_top_toolbar: true,
    hide_side_toolbar: true,
    hide_legend: false,
    hide_volume: true,
    allow_symbol_change: false,
    save_image: false,
    withdateranges: false,
    studies: ["MASimple@tv-basicstudies", "RSI@tv-basicstudies"],
    container_id: "tv",
    onChartReady: function () {
      try {
        var chart = widget.chart();
        for (var i = 0; i < LEVELS.length; i++) {
          var lvl = LEVELS[i];
          try {
            chart.createShape({ price: lvl.price }, {
              shape: "horizontal_line",
              text: lvl.text,
              lock: true,
              disableSave: true,
              disableUndo: true,
              zOrder: "top",
              overrides: {
                linecolor: lvl.color,
                linestyle: lvl.dashed ? 2 : 0,
                linewidth: 2,
                transparency: 0
              }
            });
          } catch (e) {}
        }
      } catch (e) {}
    }
  });
</script>
</body>
</html>`;
  }, [symbol, interval, levels, locale, scheme, gridColor]);

  return (
    <View style={[styles.wrap, { height }, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <Spinner />
          </View>
        )}
      />
      {onPress ? <Pressable style={styles.overlay} onPress={onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  webview: { flex: 1, backgroundColor: 'transparent' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loading: {
    ...Platform.select({ default: {} }),
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
