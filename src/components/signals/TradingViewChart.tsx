import { useEffect, useRef } from "react";

interface TradingViewChartProps {
  symbol: string;
  interval?: string;
  height?: string;
}

export function TradingViewChart({ symbol, interval = "60", height = "560px" }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const raw = symbol.replace("/", "");
    const prefix = raw === "BTCUSD" ? "COINBASE" : "FX";

    const widgetConfig = {
      autosize: true,
      symbol: `${prefix}:${raw}`,
      interval: interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "pt",
      backgroundColor: "rgba(2, 6, 23, 1)",
      gridColor: "rgba(42, 46, 57, 0.4)",

      // Toolbar profissional
      hide_top_toolbar: false,
      hide_side_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      withdateranges: true,
      save_image: true,
      calendar: false,
      hide_volume: false,

      // Crosshair profissional
      studies_overlay: true,

      // Indicadores profissionais
      studies: [
        "RSI@tv-basicstudies",
        "MASimple@tv-basicstudies",
        "MACD@tv-basicstudies",
        "BollingerBands@tv-basicstudies",
        "Stochastic@tv-basicstudies",
        "Volume@tv-basicstudies",
      ],

      // Configurações extras
      details: true,
      hotlist: true,
      toolbar_bg: "rgba(2, 6, 23, 0.9)",

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
  }, [symbol, interval]);

  return (
    <div style={{
      height,
      width: "100%",
      borderRadius: "12px",
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
