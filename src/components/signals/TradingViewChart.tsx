import { useEffect, useRef } from "react";

interface TradingViewChartProps {
  symbol: string;
  interval?: string;
  height?: string;
  showStudies?: boolean;
}

export function TradingViewChart({ symbol, interval = "60", height = "560px", showStudies = true }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const raw = symbol.replace("/", "");
    const prefix = raw === "BTCUSD" ? "COINBASE" : "FX";

    const studies = showStudies
      ? [
          "MASimple@tv-basicstudies",
          "RSI@tv-basicstudies",
          "MACD@tv-basicstudies",
          "BollingerBands@tv-basicstudies",
          "Stochastic@tv-basicstudies",
        ]
      : [];

    const widgetConfig = {
      autosize: true,
      symbol: `${prefix}:${raw}`,
      interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "pt",
      backgroundColor: "rgba(0, 0, 0, 0)",
      gridColor: "rgba(42, 46, 57, 0.35)",

      // Toolbar profissional
      hide_top_toolbar: false,
      hide_side_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      withdateranges: true,
      save_image: false,
      calendar: false,
      hide_volume: true,

      // Toolbar adicional
      details: false,
      hotlist: false,
      toolbar_bg: "rgba(15, 23, 42, 0.95)",

      // Studies
      studies_overlay: false,
      studies,

      // Layout
      drawings_access: { type: "none" },
      compare_symbols: false,
      compact_mode: false,

      support_host: "https://www.tradingview.com",
    };

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify(widgetConfig);

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [symbol, interval, showStudies]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/40 bg-black/20" style={{ height }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
