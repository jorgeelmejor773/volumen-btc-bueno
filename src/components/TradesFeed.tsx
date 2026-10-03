import React from 'react';
import { Trade } from '../types';

interface Props { trades: Trade[]; }

function fmt(n: number, dec = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
}

export const TradesFeed: React.FC<Props> = ({ trades }) => {
  return (
    <div className="flex flex-col h-full bg-[#121215] border border-[#1f2029] rounded-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-[#1f2029]">
        <span className="text-[11px] font-mono font-medium text-[#6b7280] uppercase tracking-widest">Trades Recientes</span>
      </div>
      <div className="grid grid-cols-3 px-3 py-1 text-[10px] font-mono text-[#4b5563] border-b border-[#1a1a23]">
        <span>Precio</span>
        <span className="text-right">BTC</span>
        <span className="text-right">Hora</span>
      </div>
      <div className="flex-1 overflow-hidden">
        {trades.slice(0, 40).map((t) => (
          <div key={t.id} className="grid grid-cols-3 px-3 py-[2px] hover:bg-[#1a1a23] cursor-default">
            <span className={`text-[11px] font-mono font-medium ${t.isBuyerMaker ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
              {fmt(t.price)}
            </span>
            <span className="text-[11px] font-mono text-[#9ca3af] text-right">{t.qty.toFixed(4)}</span>
            <span className="text-[11px] font-mono text-[#4b5563] text-right">{fmtTime(t.time)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
