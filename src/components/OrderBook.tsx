import React, { useMemo } from 'react';
import { OrderBook } from '../types';

interface Props {
  book: OrderBook;
  lastPrice: number;
  symbol: string;
}

function fmt(n: number, dec = 2) {
  if (n === 0) return '0.00';
  if (n < 0.01) return n.toFixed(4);
  if (n < 1) return n.toFixed(3);
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export const OrderBookPanel: React.FC<Props> = ({ book, lastPrice, symbol }) => {
  const assetName = symbol.replace('USDT', '');

  const maxTotal = useMemo(() => {
    const allTotals = [...book.bids, ...book.asks].map((e) => e.total);
    return Math.max(...allTotals, 1);
  }, [book]);

  const spread =
    book.asks[0] && book.bids[0] ? book.asks[0].price - book.bids[0].price : 0;
  const spreadPct = book.asks[0] ? (spread / book.asks[0].price) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-[#0c0c10] text-slate-200 select-none overflow-hidden font-mono">
      {/* Header TapeSurf */}
      <div className="px-3 py-2 border-b border-[#1a1a24] bg-[#0e0e14] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">
            Order Book {assetName}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#1a1a28] text-amber-400 font-semibold border border-amber-500/20">
            Aggregated
          </span>
        </div>
        <div className="text-[10px] text-slate-500">
          Spread: <span className="text-amber-400 font-semibold">{fmt(spread, 1)}</span>
          <span className="text-slate-600 ml-1">({spreadPct.toFixed(3)}%)</span>
        </div>
      </div>

      {/* Encabezados de Columna */}
      <div className="grid grid-cols-3 px-3 py-1.5 text-[10px] font-bold uppercase text-slate-500 border-b border-[#151520] bg-[#0a0a0e] shrink-0">
        <span>Precio (USDT)</span>
        <span className="text-right">Monto ({assetName})</span>
        <span className="text-right">Total Acum.</span>
      </div>

      <div className="flex-1 flex flex-col justify-between overflow-hidden text-[11px]">
        {/* Asks (Venta - Rojos / Naranja superior) */}
        <div className="flex-1 overflow-hidden flex flex-col-reverse justify-end">
          {book.asks.slice(0, 11).map((ask) => {
            const widthPct = Math.min(100, (ask.total / maxTotal) * 100);
            return (
              <div
                key={ask.price}
                className="relative grid grid-cols-3 px-3 py-[2.5px] hover:bg-[#161622] transition-colors cursor-default"
              >
                {/* Barra de profundidad TapeSurf */}
                <div
                  className="absolute inset-y-0 right-0 bg-rose-500/20 border-l border-rose-500/40"
                  style={{ width: `${widthPct}%` }}
                />
                <span className="relative font-semibold text-rose-400">
                  {fmt(ask.price, 2)}
                </span>
                <span className="relative text-slate-300 text-right">
                  {ask.qty.toFixed(3)}
                </span>
                <span className="relative text-slate-500 text-right">
                  {ask.total.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Separador de Precio Actual en vivo */}
        <div className="px-3 py-2 bg-[#12121b] border-y border-[#1e1e2d] flex items-center justify-between shrink-0 shadow-inner">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-bold tracking-wide ${
                lastPrice >= (book.bids[0]?.price || 0)
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {fmt(lastPrice, 2)}
            </span>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">
              USDT
            </span>
          </div>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            En vivo
          </span>
        </div>

        {/* Bids (Compra - Verdes / Cyan inferior) */}
        <div className="flex-1 overflow-hidden flex flex-col justify-start">
          {book.bids.slice(0, 11).map((bid) => {
            const widthPct = Math.min(100, (bid.total / maxTotal) * 100);
            return (
              <div
                key={bid.price}
                className="relative grid grid-cols-3 px-3 py-[2.5px] hover:bg-[#161622] transition-colors cursor-default"
              >
                {/* Barra de profundidad TapeSurf */}
                <div
                  className="absolute inset-y-0 right-0 bg-emerald-500/20 border-l border-emerald-500/40"
                  style={{ width: `${widthPct}%` }}
                />
                <span className="relative font-semibold text-emerald-400">
                  {fmt(bid.price, 2)}
                </span>
                <span className="relative text-slate-300 text-right">
                  {bid.qty.toFixed(3)}
                </span>
                <span className="relative text-slate-500 text-right">
                  {bid.total.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
