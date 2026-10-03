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

  // 1. Cargar velas históricas cada vez que cambia el símbolo o el intervalo
  useEffect(() => {
    setCandles([]); // Resetear inmediatamente para evitar datos del símbolo anterior
    let isCancelled = false;

    fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=120`)
      .then((r) => r.json())
      .then((data: any[]) => {
        if (isCancelled || !Array.isArray(data)) return;
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

    return () => {
      isCancelled = true;
    };
  }, [symbol, interval]);

  // 2. WebSocket de velas en tiempo real
  useEffect(() => {
    const s = symbol.toLowerCase();
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/stream?streams=${s}@kline_${interval}`
    );

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (!msg.data || !msg.data.k) return;
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

    return () => {
      ws.close();
    };
  }, [symbol, interval]);

  // 3. Inicializar el gráfico Lightweight Charts
  useEffect(() => {
    if (!chartContainerRef.current) return;

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
        vertLines: { color: 'rgba(30, 41, 59, 0.4)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.4)' },
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
          bottom: 0.24, // Espacio inferior para el histograma de volumen
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

    // Histograma de volumen abajo (con compra/venta)
    const volumeSeries = chart.addHistogramSeries({
      color: '#10b981',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Escala separada superpuesta
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.76, // 24% inferior
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
    if (!chartReady || !candleSeriesRef.current || !volumeSeriesRef.current) return;

    if (candles.length === 0) {
      candleSeriesRef.current.setData([]);
      volumeSeriesRef.current.setData([]);
      return;
    }

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
        color: isUp ? 'rgba(16, 185, 129, 0.65)' : 'rgba(239, 68, 68, 0.65)',
      };
    });

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
    chartInstanceRef.current?.timeScale().fitContent();
  }, [candles, chartReady]);

  // 5. Perfil de Volumen (VPVR) repartido verticalmente a la izquierda / dentro del gráfico
  const vpvrBuckets = useMemo(() => {
    if (candles.length === 0) return [];
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (const c of candles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    }

    const numBuckets = 32;
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
    return buckets
      .map((b) => ({
        ...b,
        buyWidthPct: (b.buyVol / maxVol) * 100,
        sellWidthPct: (b.sellVol / maxVol) * 100,
      }))
      .reverse();
  }, [candles]);

  // 6. Heatmap de Liquidez del OrderBook superpuesto en el gráfico
  const heatmapBands = useMemo(() => {
    if (!orderBook) return [];
    const bands: { price: number; type: 'bid' | 'ask'; intensity: number }[] = [];

    const maxBidQty = Math.max(...(orderBook.bids?.map((b) => b.qty) || [1]), 1);
    const maxAskQty = Math.max(...(orderBook.asks?.map((a) => a.qty) || [1]), 1);

    orderBook.asks?.slice(0, 15).forEach((a) => {
      const ratio = Math.min(1, a.qty / (maxAskQty * (sensitivity / 100)));
      bands.push({ price: a.price, type: 'ask', intensity: ratio });
    });

    orderBook.bids?.slice(0, 15).forEach((b) => {
      const ratio = Math.min(1, b.qty / (maxBidQty * (sensitivity / 100)));
      bands.push({ price: b.price, type: 'bid', intensity: ratio });
    });

    return bands;
  }, [orderBook, sensitivity]);

  const totalBidsQty = useMemo(() => {
    return orderBook?.bids?.reduce((acc, curr) => acc + curr.qty, 0) || 0;
  }, [orderBook]);

  const totalAsksQty = useMemo(() => {
    return orderBook?.asks?.reduce((acc, curr) => acc + curr.qty, 0) || 0;
  }, [orderBook]);

  const delta = totalBidsQty - totalAsksQty;
  const currentPrice = ticker?.price || candles[candles.length - 1]?.close || 0;
  const assetName = symbol.replace('USDT', '');

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0a0c] text-white select-none overflow-hidden relative font-mono">
      {/* ── BARRA SUPERIOR DE CONTROL TAPESURF ── */}
      <div className="h-10 px-3 bg-[#0d0d12] border-b border-[#1a1a24] flex items-center justify-between shrink-0 text-xs z-20">
        <div className="flex items-center gap-3">
          {/* Identificador de Par */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#16161f] border border-[#262638] font-bold text-amber-400">
            <span>❖ {assetName}/USDT</span>
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

        {/* Botones de Capas */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVpvr(!showVpvr)}
            className={`px-2.5 py-1 rounded text-[11px] border transition flex items-center gap-1.5 ${
              showVpvr
                ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 font-medium'
                : 'bg-[#14141c] border-[#222230] text-slate-500'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            Volumen Compra/Venta (VPVR)
          </button>

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
        </div>
      </div>

      {/* ── ÁREA CENTRAL: GRÁFICO + HEATMAP + VOLUMEN COMPRA/VENTA LATERAL ── */}
      <div className="flex-1 w-full relative flex overflow-hidden">
        {/* ── VOLUMEN DE COMPRA Y VENTA AL LADO IZQUIERDO (VPVR) ── */}
        {showVpvr && (
          <div className="w-28 h-full bg-[#0d0d12]/95 border-r border-[#1a1a24] flex flex-col justify-between py-2 px-1.5 z-10 shrink-0 overflow-hidden">
            <div className="text-[9px] text-slate-400 font-bold text-center border-b border-[#1c1c2b] pb-1 uppercase tracking-wider flex items-center justify-center gap-1">
              <span className="text-emerald-400">■ Compras</span>
              <span className="text-slate-600">/</span>
              <span className="text-rose-400">■ Ventas</span>
            </div>
            <div className="flex-1 flex flex-col justify-between py-1">
              {vpvrBuckets.map((bucket, i) => (
                <div key={i} className="flex items-center h-full w-full gap-0.5 relative group">
                  {/* Barra Compra (Verde) */}
                  <div
                    className="h-[85%] bg-emerald-500/80 rounded-xs transition-all shadow-xs"
                    style={{ width: `${bucket.buyWidthPct * 0.5}%` }}
                  />
                  {/* Barra Venta (Rojo) */}
                  <div
                    className="h-[85%] bg-rose-500/80 rounded-xs transition-all shadow-xs"
                    style={{ width: `${bucket.sellWidthPct * 0.5}%` }}
                  />
                  {/* Tooltip con precio y volumen exacto */}
                  <div className="hidden group-hover:block absolute left-full ml-1 bg-[#181824] border border-[#2a2a3e] px-1.5 py-0.5 rounded text-[9px] text-slate-200 z-30 whitespace-nowrap shadow-xl">
                    {bucket.price.toFixed(1)} · Compras: {bucket.buyVol.toFixed(2)} | Ventas: {bucket.sellVol.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[8px] text-slate-500 text-center uppercase tracking-widest pt-1 border-t border-[#1c1c2b]">
              Perfil VPVR
            </div>
          </div>
        )}

        {/* Contenedor del gráfico Lightweight Charts */}
        <div className="flex-1 h-full relative" ref={chartContainerRef}>
          {/* Capa de fondo Heatmap (Líneas de liquidez) */}
          {showHeatmap && (
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-75">
              {heatmapBands.map((band, idx) => {
                const isBid = band.type === 'bid';
                const topPct = isBid ? 52 + idx * 2.8 : 48 - idx * 2.8;
                if (topPct < 2 || topPct > 95) return null;

                return (
                  <div
                    key={`${band.price}-${idx}`}
                    className="absolute left-0 right-14 h-[3px] transition-all duration-300"
                    style={{
                      top: `${topPct}%`,
                      background: isBid
                        ? `linear-gradient(90deg, rgba(16, 185, 129, ${
                            band.intensity * 0.5
                          }) 0%, rgba(16, 185, 129, ${band.intensity * 0.95}) 70%, transparent 100%)`
                        : `linear-gradient(90deg, rgba(239, 68, 68, ${
                            band.intensity * 0.5
                          }) 0%, rgba(245, 158, 11, ${band.intensity * 0.95}) 70%, transparent 100%)`,
                      boxShadow:
                        band.intensity > 0.6
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
      </div>

      {/* ── BARRA INFERIOR DE PROFUNDIDAD Y DELTA ── */}
      <div className="h-9 px-4 bg-[#0a0a0e] border-t border-[#1a1a24] flex items-center justify-between text-xs shrink-0 z-20">
        <div className="flex items-center gap-4">
          <span className="text-slate-500 font-semibold text-[10px] tracking-widest uppercase">
            Profundidad
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">B</span>
            <span className="text-emerald-400 font-bold">
              {totalBidsQty.toFixed(2)} {assetName}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">A</span>
            <span className="text-rose-400 font-bold">
              {totalAsksQty.toFixed(2)} {assetName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#222230]">
            <span className="text-slate-400">Δ Delta:</span>
            <span
              className={`font-bold ${
                delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)} {assetName}
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
