import React from 'react';
import { Trade } from '../types';

interface Props {
  trades: Trade[];
  symbol: string;
}

function fmt(n: number, dec = 2) {
  if (n < 0.01) return n.toFixed(4);
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
}

export const TradesFeed: React.FC<Props> = ({ trades, symbol }) => {
  const assetName = symbol.replace('USDT', '');

  return (
    <div className="flex flex-col h-full bg-[#0c0c10] border-r border-[#1a1a24] select-none overflow-hidden font-mono">
      <div className="px-3 py-2 border-b border-[#1a1a24] bg-[#0e0e14] shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Trades {assetName}
        </span>
      </div>
      <div className="grid grid-cols-3 px-3 py-1 text-[9px] font-bold text-slate-500 uppercase border-b border-[#161622] bg-[#0a0a0e] shrink-0">
        <span>Precio</span>
        <span className="text-right">Cant.</span>
        <span className="text-right">Hora</span>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden text-[10px]">
        {trades.length === 0 ? (
          <div className="p-3 text-center text-slate-600 text-[10px]">Cargando trades...</div>
        ) : (
          trades.slice(0, 35).map((t) => (
            <div
              key={t.id}
              className="grid grid-cols-3 px-3 py-[2px] hover:bg-[#161622] cursor-default"
            >
              <span
                className={`font-semibold ${
                  t.isBuyerMaker ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {fmt(t.price)}
              </span>
              <span className="text-slate-300 text-right">{t.qty.toFixed(3)}</span>
              <span className="text-slate-500 text-right">{fmtTime(t.time)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
