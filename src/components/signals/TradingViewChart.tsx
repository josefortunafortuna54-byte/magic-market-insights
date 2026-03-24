import { useEffect, useRef } from "react";

interface TradingViewChartProps {
  symbol: string;
  interval?: string;
}

export function TradingViewChart({ symbol, interval = "60" }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `FX:${symbol.replace("/", "")}`,
      interval: interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "pt",
      enable_publishing: false,
      backgroundColor: "rgba(2, 6, 23, 1)",
      gridColor: "rgba(42, 46, 57, 0.3)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      studies: ["RSI@tv-basicstudies", "MASimple@tv-basicstudies"],
      support_host: "https://www.tradingview.com",
    });

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol, interval]);

  return (
    <div style={{ height: "560px", width: "100%", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div
        ref={containerRef}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
