import React, { useState } from 'react';
import { Header } from './components/Header';
import { PriceChart } from './components/PriceChart';
import { OrderBookPanel } from './components/OrderBook';
import { TradesFeed } from './components/TradesFeed';
import { LiquidationsFeed } from './components/LiquidationsFeed';
import { useTicker, useOrderBook, useTrades, useLiquidations } from './hooks/useBinance';

export default function App() {
  const [symbol, setSymbol] = useState('BTCUSDT');

  const ticker     = useTicker(symbol);
  const book       = useOrderBook(symbol, 20);
  const trades     = useTrades(symbol);
  const liquidations = useLiquidations(symbol);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#121215] overflow-hidden" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Top bar */}
      <Header ticker={ticker} symbol={symbol} onSymbolChange={setSymbol} />

      {/* Main grid */}
      <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '260px 1fr 220px', gridTemplateRows: '1fr 220px', gap: '1px', background: '#1f2029' }}>

        {/* Order Book — left column spans both rows */}
        <div style={{ gridRow: '1 / 3' }}>
          <OrderBookPanel book={book} lastPrice={ticker?.price ?? 0} />
        </div>

        {/* Price Chart — top center */}
        <div>
          <PriceChart symbol={symbol} />
        </div>

        {/* Trades — right column top */}
        <div>
          <TradesFeed trades={trades} />
        </div>

        {/* Liquidations — bottom center + right */}
        <div style={{ gridColumn: '2 / 4' }}>
          <LiquidationsFeed liquidations={liquidations} />
        </div>

      </div>
    </div>
  );
}
