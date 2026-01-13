import { useEffect, useRef } from "react";

interface SymbolPriceProps {
  symbol: string;
}

export function SymbolPrice({ symbol }: SymbolPriceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const formatSymbol = (sym: string) => {
    if (sym === "XAUUSD") return "OANDA:XAUUSD";
    if (sym === "BTCUSD") return "BINANCE:BTCUSDT";
    return `FX:${sym}`;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: formatSymbol(symbol),
      width: "100%",
      isTransparent: true,
      colorTheme: "dark",
      locale: "pt",
    });

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol]);

  return (
    <div className="tradingview-widget-container" ref={containerRef}>
      <div className="tradingview-widget-container__widget" />
    </div>
  );
}
