import React from 'react';
import { Ticker } from '../types';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface Props { ticker: Ticker | null; symbol: string; onSymbolChange: (s: string) => void; }

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];

function fmt(n: number, dec = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtB(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  return `${(n / 1_000).toFixed(2)}K`;
}

export const Header: React.FC<Props> = ({ ticker, symbol, onSymbolChange }) => {
  const isUp = (ticker?.changePct ?? 0) >= 0;

  return (
    <header className="h-14 bg-[#0d0d10] border-b border-[#1f2029] flex items-center px-4 gap-6 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <Activity className="w-5 h-5 text-[#2563eb]" />
        <span className="font-mono font-semibold text-white text-sm tracking-tight">VolumenBTC</span>
      </div>

      {/* Symbol selector */}
      <div className="flex gap-1">
        {SYMBOLS.map(s => (
          <button key={s} onClick={() => onSymbolChange(s)}
            className={`px-3 py-1 text-[11px] font-mono rounded transition-all ${symbol === s ? 'bg-[#2563eb] text-white' : 'text-[#6b7280] hover:text-white hover:bg-[#1f2029]'}`}>
            {s.replace('USDT', '')}
          </button>
        ))}
      </div>

      {/* Ticker data */}
      {ticker && (
        <div className="flex items-center gap-6 ml-2">
          <div className="flex items-center gap-2">
            {isUp ? <TrendingUp className="w-4 h-4 text-[#22c55e]" /> : <TrendingDown className="w-4 h-4 text-[#ef4444]" />}
            <span className={`font-mono font-semibold text-lg ${isUp ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {fmt(ticker.price)}
            </span>
            <span className={`font-mono text-[12px] ${isUp ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {isUp ? '+' : ''}{ticker.changePct.toFixed(2)}%
            </span>
          </div>

          <div className="hidden md:flex items-center gap-5 text-[11px] font-mono text-[#6b7280]">
            <div><span className="text-[#4b5563]">H</span> <span className="text-[#9ca3af]">{fmt(ticker.high)}</span></div>
            <div><span className="text-[#4b5563]">L</span> <span className="text-[#9ca3af]">{fmt(ticker.low)}</span></div>
            <div><span className="text-[#4b5563]">Vol</span> <span className="text-[#9ca3af]">{fmtB(ticker.quoteVolume)} USDT</span></div>
          </div>
        </div>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
        <span className="text-[10px] font-mono text-[#6b7280]">LIVE · Binance</span>
      </div>
    </header>
  );
};
