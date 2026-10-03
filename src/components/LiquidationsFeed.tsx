import React from 'react';
import { Liquidation } from '../types';
import { Zap } from 'lucide-react';

interface Props {
  liquidations: Liquidation[];
  symbol: string;
}

function fmt(n: number) {
  if (n < 0.01) return n.toFixed(4);
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtUSD(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${fmt(n)}`;
}
function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
}

export const LiquidationsFeed: React.FC<Props> = ({ liquidations, symbol }) => {
  return (
    <div className="flex flex-col h-full bg-[#0c0c10] select-none overflow-hidden font-mono">
      <div className="px-3 py-2 border-b border-[#1a1a24] bg-[#0e0e14] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Liquidaciones
          </span>
        </div>
        <span className="text-[9px] text-slate-500">{symbol.replace('USDT', '')}</span>
      </div>

      <div className="grid grid-cols-4 px-3 py-1 text-[9px] font-bold text-slate-500 uppercase border-b border-[#161622] bg-[#0a0a0e] shrink-0">
        <span>Lado</span>
        <span className="text-right">Precio</span>
        <span className="text-right">USD</span>
        <span className="text-right">Hora</span>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden text-[10px]">
        {liquidations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <Zap className="w-5 h-5 text-slate-700 mb-1" />
            <span className="text-slate-500 text-[10px]">Escuchando mercado...</span>
            <span className="text-slate-600 text-[9px]">Aparecerán órdenes forzadas</span>
          </div>
        ) : (
          liquidations.map((liq) => {
            const usd = liq.price * liq.qty;
            const isLong = liq.side === 'SELL';
            return (
              <div
                key={liq.id}
                className={`grid grid-cols-4 px-3 py-[2px] border-l-2 hover:bg-[#161622] ${
                  isLong ? 'border-rose-500 bg-rose-500/5' : 'border-emerald-500 bg-emerald-500/5'
                }`}
              >
                <span
                  className={`font-bold text-[9px] ${
                    isLong ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {isLong ? 'LONG' : 'SHORT'}
                </span>
                <span className="text-slate-300 text-right">{fmt(liq.price)}</span>
                <span
                  className={`font-semibold text-right ${
                    usd > 50000 ? 'text-amber-400' : 'text-slate-300'
                  }`}
                >
                  {fmtUSD(usd)}
                </span>
                <span className="text-slate-500 text-right">{fmtTime(liq.time)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
