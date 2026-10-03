import React, { useState } from 'react';
import { Header } from './components/Header';
import { TapeSurfChart } from './components/TapeSurfChart';
import { OrderBookPanel } from './components/OrderBook';
import { TradesFeed } from './components/TradesFeed';
import { LiquidationsFeed } from './components/LiquidationsFeed';
import { useTicker, useOrderBook, useTrades, useLiquidations } from './hooks/useBinance';

export default function App() {
  const [symbol, setSymbol] = useState('BTCUSDT');

  const ticker = useTicker(symbol);
  const book = useOrderBook(symbol, 25);
  const trades = useTrades(symbol);
  const liquidations = useLiquidations(symbol);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0d0d12] text-white overflow-hidden select-none font-mono">
      {/* 1. Header Superior */}
      <Header ticker={ticker} symbol={symbol} onSymbolChange={setSymbol} />

      {/* 2. Área Principal de Trabajo */}
      <div className="flex-1 flex w-full h-[calc(100vh-56px)] overflow-hidden">
        {/* Panel Izquierdo / Central: Gráfico TapeSurf con Velas, Volumen y Heatmap */}
        <div className="flex-1 h-full flex flex-col min-w-0">
          <TapeSurfChart symbol={symbol} orderBook={book} ticker={ticker} />
        </div>

        {/* Panel Derecho: Order Book TapeSurf + Trades Recientes y Liquidaciones */}
        <div className="w-[380px] lg:w-[420px] h-full flex flex-col border-l border-[#1a1a24] bg-[#0c0c10] shrink-0">
          {/* Order Book principal arriba */}
          <div className="h-[52%] border-b border-[#1a1a24] overflow-hidden">
            <OrderBookPanel book={book} lastPrice={ticker?.price ?? 0} />
          </div>

          {/* Subpanel inferior: Trades y Liquidaciones en pestañas o split */}
          <div className="h-[48%] flex flex-col overflow-hidden">
            <div className="grid grid-cols-2 h-full">
              <div className="border-r border-[#1a1a24] h-full overflow-hidden">
                <TradesFeed trades={trades} />
              </div>
              <div className="h-full overflow-hidden">
                <LiquidationsFeed liquidations={liquidations} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
