import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi } from 'lightweight-charts';
import { OrderBook, Ticker } from '../types';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Props {
  symbol: string;
  orderBook?: OrderBook;
  ticker?: Ticker | null;
}

const INTERVALS = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

export const TapeSurfChart: React.FC<Props> = ({ symbol, orderBook, ticker }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [interval, setInterval] = useState('1h');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [sensitivity, setSensitivity] = useState(65);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showVpvr, setShowVpvr] = useState(true);
  const [chartReady, setChartReady] = useState(false);

  // 1. Cargar velas históricas (incluye volumen)
  useEffect(() => {
    fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=120`)
      .then((r) => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        const parsed: Candle[] = data.map((k) => ({
          time: Math.floor(k[0] / 1000),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));
        setCandles(parsed);
      })
      .catch((err) => console.error('Error fetching candles:', err));
  }, [symbol, interval]);

  // 2. WebSocket de velas en tiempo real
  useEffect(() => {
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/stream?streams=${symbol.toLowerCase()}@kline_${interval}`
    );
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const k = msg.data.k;
        const newCandle: Candle = {
          time: Math.floor(k.t / 1000),
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v),
        };

        setCandles((prev) => {
          if (prev.length === 0) return [newCandle];
          const last = prev[prev.length - 1];
          if (last.time === newCandle.time) {
            return [...prev.slice(0, -1), newCandle];
          }
          return [...prev.slice(1), newCandle];
        });
      } catch (err) {
        console.error(err);
      }
    };
    return () => ws.close();
  }, [symbol, interval]);

  // 3. Inicializar el gráfico Lightweight Charts
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Limpiar previo
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const container = chartContainerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.45)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.45)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#475569', width: 1, style: 2 },
        horzLine: { color: '#475569', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.22, // Dejar espacio abajo para el volumen de compra/venta
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Serie de velas (Candlestick)
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Serie de volumen (Histograma abajo idéntico a TapeSurf)
    const volumeSeries = chart.addHistogramSeries({
      color: '#10b981',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Escala separada superpuesta abajo
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.78, // Ocupa el 22% inferior
        bottom: 0,
      },
    });

    chartInstanceRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    setChartReady(true);

    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartInstanceRef.current = null;
    };
  }, []);

  // 4. Actualizar datos en las series
  useEffect(() => {
    if (!chartReady || !candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0)
      return;

    const candleData = candles.map((c) => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData = candles.map((c) => {
      const isUp = c.close >= c.open;
      return {
        time: c.time as any,
        value: c.volume,
        color: isUp ? 'rgba(16, 185, 129, 0.55)' : 'rgba(239, 68, 68, 0.55)',
      };
    });

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    // Ajustar vista completa
    chartInstanceRef.current?.timeScale().fitContent();
  }, [candles, chartReady]);

  // 5. Calcular VPVR (Volume Profile Visible Range) lateral estilo TapeSurf
  const vpvrBuckets = useMemo(() => {
    if (candles.length === 0) return [];
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (const c of candles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    }

    const numBuckets = 30;
    const step = (maxPrice - minPrice) / numBuckets;
    if (step <= 0) return [];

    const buckets = Array.from({ length: numBuckets }, (_, i) => ({
      price: minPrice + (i + 0.5) * step,
      buyVol: 0,
      sellVol: 0,
      totalVol: 0,
    }));

    for (const c of candles) {
      const bucketIdx = Math.min(
        numBuckets - 1,
        Math.max(0, Math.floor((c.close - minPrice) / step))
      );
      const isUp = c.close >= c.open;
      if (isUp) {
        buckets[bucketIdx].buyVol += c.volume;
      } else {
        buckets[bucketIdx].sellVol += c.volume;
      }
      buckets[bucketIdx].totalVol += c.volume;
    }

    const maxVol = Math.max(...buckets.map((b) => b.totalVol), 1);
    return buckets.map((b) => ({
      ...b,
      buyWidthPct: (b.buyVol / maxVol) * 100,
      sellWidthPct: (b.sellVol / maxVol) * 100,
    })).reverse(); // Alto a bajo
  }, [candles]);

  // 6. Generar las franjas de liquidez / Heatmap de OrderBook superpuestas
  const heatmapBands = useMemo(() => {
    if (!orderBook) return [];
    const bands: { price: number; type: 'bid' | 'ask'; intensity: number }[] = [];

    const maxBidQty = Math.max(...(orderBook.bids?.map((b) => b.qty) || [1]), 1);
    const maxAskQty = Math.max(...(orderBook.asks?.map((a) => a.qty) || [1]), 1);

    orderBook.asks?.slice(0, 16).forEach((a) => {
      const ratio = Math.min(1, a.qty / (maxAskQty * (sensitivity / 100)));
      bands.push({ price: a.price, type: 'ask', intensity: ratio });
    });

    orderBook.bids?.slice(0, 16).forEach((b) => {
      const ratio = Math.min(1, b.qty / (maxBidQty * (sensitivity / 100)));
      bands.push({ price: b.price, type: 'bid', intensity: ratio });
    });

    return bands;
  }, [orderBook, sensitivity]);

  // 7. Cálculos de liquidez acumulada en rango (ej. 5%)
  const totalBidsQty = useMemo(() => {
    return orderBook?.bids?.reduce((acc, curr) => acc + curr.qty, 0) || 0;
  }, [orderBook]);

  const totalAsksQty = useMemo(() => {
    return orderBook?.asks?.reduce((acc, curr) => acc + curr.qty, 0) || 0;
  }, [orderBook]);

  const delta = totalBidsQty - totalAsksQty;

  const currentPrice = ticker?.price || candles[candles.length - 1]?.close || 0;

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0a0c] text-white border-r border-[#1a1a24] select-none overflow-hidden relative">
      {/* ── BARRA SUPERIOR DE CONTROL TAPESURF ── */}
      <div className="h-10 px-3 bg-[#0d0d12] border-b border-[#1a1a24] flex items-center justify-between shrink-0 text-xs font-mono z-20">
        <div className="flex items-center gap-3">
          {/* Identificador de Par */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#16161f] border border-[#262638] font-semibold text-slate-200">
            <span className="text-amber-400">❖</span>
            <span>{symbol.replace('USDT', '')} / USDT</span>
          </div>

          {/* Selector de Intervalos */}
          <div className="flex items-center gap-1 bg-[#121218] p-0.5 rounded border border-[#1e1e2d]">
            {INTERVALS.map((iv) => (
              <button
                key={iv}
                onClick={() => setInterval(iv)}
                className={`px-2 py-0.5 rounded transition text-[11px] ${
                  interval === iv
                    ? 'bg-[#2b2b3d] text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {iv}
              </button>
            ))}
          </div>

          {/* Sensibilidad del Heatmap */}
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-[#222230]">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Sensibilidad
            </span>
            <input
              type="range"
              min="20"
              max="100"
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-20 h-1.5 bg-[#222230] rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <span className="text-[10px] text-emerald-400 font-bold w-6">
              {sensitivity}%
            </span>
          </div>
        </div>

        {/* Botones de Capas (Heatmap, VPVR, Footprint) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-2.5 py-1 rounded text-[11px] border transition flex items-center gap-1.5 ${
              showHeatmap
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 font-medium'
                : 'bg-[#14141c] border-[#222230] text-slate-500'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Heatmap Órdenes
          </button>

          <button
            onClick={() => setShowVpvr(!showVpvr)}
            className={`px-2.5 py-1 rounded text-[11px] border transition flex items-center gap-1.5 ${
              showVpvr
                ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 font-medium'
                : 'bg-[#14141c] border-[#222230] text-slate-500'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            VPVR Perfil
          </button>
        </div>
      </div>

      {/* ── ÁREA CENTRAL: GRÁFICO + HEATMAP + VPVR LATERAL ── */}
      <div className="flex-1 w-full relative flex overflow-hidden">
        {/* Contenedor del gráfico Lightweight Charts */}
        <div className="flex-1 h-full relative" ref={chartContainerRef}>
          {/* Capa de fondo Heatmap (Líneas horizontales de liquidez en tiempo real) */}
          {showHeatmap && (
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-75">
              {heatmapBands.map((band, idx) => {
                const isBid = band.type === 'bid';
                // Calculamos un top aproximado relativo
                const topPct = isBid ? 52 + (idx * 2.8) : 48 - (idx * 2.8);
                if (topPct < 2 || topPct > 95) return null;

                return (
                  <div
                    key={`${band.price}-${idx}`}
                    className="absolute left-0 right-14 h-[3px] transition-all duration-300"
                    style={{
                      top: `${topPct}%`,
                      background: isBid
                        ? `linear-gradient(90deg, rgba(16, 185, 129, ${band.intensity * 0.5}) 0%, rgba(16, 185, 129, ${band.intensity * 0.95}) 70%, transparent 100%)`
                        : `linear-gradient(90deg, rgba(239, 68, 68, ${band.intensity * 0.5}) 0%, rgba(245, 158, 11, ${band.intensity * 0.95}) 70%, transparent 100%)`,
                      boxShadow: band.intensity > 0.6
                        ? isBid
                          ? '0 0 8px rgba(16,185,129,0.5)'
                          : '0 0 8px rgba(245,158,11,0.5)'
                        : 'none',
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Marcador del Precio Actual flotante */}
          {currentPrice > 0 && (
            <div className="absolute right-16 top-1/2 -translate-y-1/2 z-10 px-2 py-0.5 rounded bg-rose-600/90 text-white font-mono text-xs font-bold shadow-lg pointer-events-none">
              {currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          )}
        </div>

        {/* ── PERFIL DE VOLUMEN LATERAL (VPVR) IDÉNTICO A TAPESURF ── */}
        {showVpvr && (
          <div className="w-24 h-full bg-[#0d0d12]/90 border-l border-[#1a1a24] flex flex-col justify-between py-2 px-1 z-10 shrink-0 overflow-hidden font-mono">
            <div className="text-[9px] text-slate-500 font-bold text-center border-b border-[#1c1c2b] pb-1 uppercase tracking-wider">
              VPVR Vol
            </div>
            <div className="flex-1 flex flex-col justify-between py-1">
              {vpvrBuckets.map((bucket, i) => (
                <div key={i} className="flex items-center h-full w-full gap-0.5 relative group">
                  {/* Barra Compra (Verde/Cyan) */}
                  <div
                    className="h-[80%] bg-emerald-500/70 rounded-xs transition-all"
                    style={{ width: `${bucket.buyWidthPct * 0.5}%` }}
                  />
                  {/* Barra Venta (Rojo/Naranja) */}
                  <div
                    className="h-[80%] bg-rose-500/70 rounded-xs transition-all"
                    style={{ width: `${bucket.sellWidthPct * 0.5}%` }}
                  />
                  {/* Tooltip de precio al pasar el mouse */}
                  <div className="hidden group-hover:block absolute right-full mr-1 bg-[#181824] border border-[#2a2a3e] px-1 py-0.5 rounded text-[9px] text-slate-300 z-30 whitespace-nowrap shadow-md">
                    {bucket.price.toFixed(1)} · {(bucket.totalVol).toFixed(2)} BTC
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── BARRA INFERIOR DE PROFUNDIDAD Y DELTA (DEPTH / DELTA) ── */}
      <div className="h-9 px-4 bg-[#0a0a0e] border-t border-[#1a1a24] flex items-center justify-between text-xs font-mono shrink-0 z-20">
        <div className="flex items-center gap-4">
          <span className="text-slate-500 font-semibold text-[10px] tracking-widest uppercase">
            Profundidad
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">B</span>
            <span className="text-emerald-400 font-bold">
              {totalBidsQty.toFixed(2)} BTC
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">A</span>
            <span className="text-rose-400 font-bold">
              {totalAsksQty.toFixed(2)} BTC
            </span>
          </div>
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#222230]">
            <span className="text-slate-400">Δ Delta:</span>
            <span
              className={`font-bold ${
                delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)} BTC
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
          <span className="text-[10px] uppercase text-slate-500">Rango: 5%</span>
          <span className="text-emerald-400">● Conectado a Binance WS</span>
        </div>
      </div>
    </div>
  );
};
