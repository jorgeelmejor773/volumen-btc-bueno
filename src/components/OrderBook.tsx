import React, { useMemo } from 'react';
import { OrderBook } from '../types';

interface Props { book: OrderBook; lastPrice: number; }

function fmt(n: number, dec = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export const OrderBookPanel: React.FC<Props> = ({ book, lastPrice }) => {
  const maxTotal = useMemo(() => {
    const allTotals = [...book.bids, ...book.asks].map(e => e.total);
    return Math.max(...allTotals, 1);
  }, [book]);

  const spread = book.asks[0] && book.bids[0]
    ? book.asks[0].price - book.bids[0].price
    : 0;
  const spreadPct = book.asks[0] ? (spread / book.asks[0].price) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-[#121215] border border-[#1f2029] rounded-sm overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#1f2029] flex items-center justify-between">
        <span className="text-[11px] font-mono font-medium text-[#6b7280] uppercase tracking-widest">Order Book</span>
        <span className="text-[10px] font-mono text-[#6b7280]">
          Spread: <span className="text-[#facc15]">{fmt(spread, 2)}</span>
          <span className="text-[#4b5563] ml-1">({spreadPct.toFixed(3)}%)</span>
        </span>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-3 px-3 py-1 text-[10px] font-mono text-[#4b5563] border-b border-[#1a1a23]">
        <span>Precio (USDT)</span>
        <span className="text-right">Cantidad (BTC)</span>
        <span className="text-right">Total</span>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Asks (sell) - show in reverse so highest ask is furthest from center */}
        <div className="flex-1 overflow-hidden flex flex-col-reverse">
          {book.asks.slice(0, 14).map((ask) => (
            <div key={ask.price} className="relative grid grid-cols-3 px-3 py-[2px] group hover:bg-[#1a1a23] cursor-default">
              <div
                className="absolute inset-y-0 right-0 bg-red-500/10"
                style={{ width: `${(ask.total / maxTotal) * 100}%` }}
              />
              <span className="relative text-[11px] font-mono text-[#ef4444]">{fmt(ask.price)}</span>
              <span className="relative text-[11px] font-mono text-[#9ca3af] text-right">{ask.qty.toFixed(4)}</span>
              <span className="relative text-[11px] font-mono text-[#6b7280] text-right">{ask.total.toFixed(3)}</span>
            </div>
          ))}
        </div>

        {/* Mid price */}
        <div className="px-3 py-1.5 border-y border-[#1f2029] flex items-center gap-2">
          <span className={`text-base font-mono font-semibold ${lastPrice > (book.bids[0]?.price || 0) ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
            {fmt(lastPrice)}
          </span>
          <span className="text-[10px] font-mono text-[#4b5563]">USDT</span>
        </div>

        {/* Bids (buy) */}
        <div className="flex-1 overflow-hidden">
          {book.bids.slice(0, 14).map((bid) => (
            <div key={bid.price} className="relative grid grid-cols-3 px-3 py-[2px] group hover:bg-[#1a1a23] cursor-default">
              <div
                className="absolute inset-y-0 right-0 bg-green-500/10"
                style={{ width: `${(bid.total / maxTotal) * 100}%` }}
              />
              <span className="relative text-[11px] font-mono text-[#22c55e]">{fmt(bid.price)}</span>
              <span className="relative text-[11px] font-mono text-[#9ca3af] text-right">{bid.qty.toFixed(4)}</span>
              <span className="relative text-[11px] font-mono text-[#6b7280] text-right">{bid.total.toFixed(3)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
