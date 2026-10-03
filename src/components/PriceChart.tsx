import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

interface Candle { time: number; open: number; high: number; low: number; close: number; volume: number; }

interface Props { symbol: string; }

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'];

export const PriceChart: React.FC<Props> = ({ symbol }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [interval, setInterval] = useState('5m');
  const [candles, setCandles] = useState<Candle[]>([]);

  // Fetch historical candles
  useEffect(() => {
    fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`)
      .then(r => r.json())
      .then((data: any[]) => {
        setCandles(data.map(k => ({
          time: k[0] / 1000,
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        })));
      });
  }, [symbol, interval]);

  // WebSocket for live updates
  useEffect(() => {
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${symbol.toLowerCase()}@kline_${interval}`);
    ws.onmessage = (e) => {
      const k = JSON.parse(e.data).data.k;
      const candle: Candle = {
        time: k.t / 1000,
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v),
      };
      setCandles(prev => {
        const last = prev[prev.length - 1];
        if (last && last.time === candle.time) return [...prev.slice(0, -1), candle];
        return [...prev, candle];
      });
    };
    return () => ws.close();
  }, [symbol, interval]);

  // Render chart
  useEffect(() => {
    if (!chartRef.current || candles.length === 0) return;
    chartRef.current.innerHTML = '';

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: chartRef.current.clientHeight,
      layout: { background: { type: ColorType.Solid, color: '#121215' }, textColor: '#6b7280' },
      grid: { vertLines: { color: '#1f2029' }, horzLines: { color: '#1f2029' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#1f2029' },
      timeScale: { borderColor: '#1f2029', timeVisible: true, secondsVisible: false },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });
    candleSeries.setData(candles.map(c => ({ time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close })));

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth });
    });
    ro.observe(chartRef.current);

    return () => { chart.remove(); ro.disconnect(); };
  }, [candles]);

  return (
    <div className="flex flex-col h-full bg-[#121215] border border-[#1f2029] rounded-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1f2029] shrink-0">
        <span className="text-[11px] font-mono font-medium text-[#6b7280] uppercase tracking-widest">Gráfica · {symbol}</span>
        <div className="flex gap-1">
          {INTERVALS.map(iv => (
            <button key={iv} onClick={() => setInterval(iv)}
              className={`px-2 py-0.5 text-[10px] font-mono rounded transition-all ${interval === iv ? 'bg-[#2563eb] text-white' : 'text-[#6b7280] hover:text-white hover:bg-[#1f2029]'}`}>
              {iv}
            </button>
          ))}
        </div>
      </div>
      <div ref={chartRef} className="flex-1 w-full" />
    </div>
  );
};
