import { useEffect, useRef } from "react";

interface PriceTickerProps {
  symbols: string[];
}

export function PriceTicker({ symbols }: PriceTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const formatSymbols = (syms: string[]) => {
    return syms.map((sym) => {
      if (sym === "XAUUSD") return { proName: "OANDA:XAUUSD", title: "Gold" };
      if (sym === "BTCUSD") return { proName: "BINANCE:BTCUSDT", title: "Bitcoin" };
      return { proName: `FX:${sym}`, title: sym };
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: formatSymbols(symbols),
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
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
  }, [symbols.join(",")]);

  return (
    <div className="w-full border-b border-border/50 bg-card/50">
      <div className="tradingview-widget-container" ref={containerRef}>
        <div className="tradingview-widget-container__widget" />
      </div>
    </div>
  );
}
