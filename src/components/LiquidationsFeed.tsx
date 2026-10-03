import React from 'react';
import { Liquidation } from '../types';
import { Zap } from 'lucide-react';

interface Props { liquidations: Liquidation[]; }

function fmt(n: number) {
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

export const LiquidationsFeed: React.FC<Props> = ({ liquidations }) => {
  return (
    <div className="flex flex-col h-full bg-[#121215] border border-[#1f2029] rounded-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-[#1f2029] flex items-center gap-2">
        <Zap className="w-3 h-3 text-[#facc15]" />
        <span className="text-[11px] font-mono font-medium text-[#6b7280] uppercase tracking-widest">Liquidaciones</span>
        {liquidations.length === 0 && (
          <span className="text-[10px] font-mono text-[#4b5563] ml-auto">Esperando datos...</span>
        )}
      </div>
      <div className="grid grid-cols-4 px-3 py-1 text-[10px] font-mono text-[#4b5563] border-b border-[#1a1a23]">
        <span>Lado</span>
        <span className="text-right">Precio</span>
        <span className="text-right">USD</span>
        <span className="text-right">Hora</span>
      </div>
      <div className="flex-1 overflow-hidden">
        {liquidations.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Zap className="w-6 h-6 text-[#1f2029] mx-auto mb-2" />
              <p className="text-[11px] font-mono text-[#4b5563]">Sin liquidaciones recientes</p>
              <p className="text-[10px] font-mono text-[#374151] mt-1">Aparecerán aquí en tiempo real</p>
            </div>
          </div>
        ) : (
          liquidations.map((liq) => {
            const usd = liq.price * liq.qty;
            const isLong = liq.side === 'SELL'; // SELL = long liquidated
            return (
              <div
                key={liq.id}
                className={`grid grid-cols-4 px-3 py-[3px] border-l-2 hover:bg-[#1a1a23] ${isLong ? 'border-[#ef4444] bg-red-500/5' : 'border-[#22c55e] bg-green-500/5'}`}
              >
                <span className={`text-[11px] font-mono font-semibold ${isLong ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
                  {isLong ? '🔴 LONG' : '🟢 SHORT'}
                </span>
                <span className="text-[11px] font-mono text-[#9ca3af] text-right">{fmt(liq.price)}</span>
                <span className={`text-[11px] font-mono font-medium text-right ${usd > 100000 ? 'text-[#facc15]' : 'text-[#9ca3af]'}`}>
                  {fmtUSD(usd)}
                </span>
                <span className="text-[11px] font-mono text-[#4b5563] text-right">{fmtTime(liq.time)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
