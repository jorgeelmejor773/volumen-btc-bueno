import { useState, useEffect } from 'react';
import { OrderBook, Trade, Ticker, Liquidation } from '../types';

const BINANCE_WS = 'wss://stream.binance.com:9443/stream';
const BINANCE_REST = 'https://api.binance.com';

export function useTicker(symbol: string) {
  const [ticker, setTicker] = useState<Ticker | null>(null);

  useEffect(() => {
    setTicker(null); // Reset when symbol changes
    const s = symbol.toLowerCase();
    const ws = new WebSocket(`${BINANCE_WS}?streams=${s}@ticker`);

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const d = msg.data;
        if (!d) return;
        setTicker({
          symbol: d.s,
          price: parseFloat(d.c),
          change: parseFloat(d.p),
          changePct: parseFloat(d.P),
          high: parseFloat(d.h),
          low: parseFloat(d.l),
          volume: parseFloat(d.v),
          quoteVolume: parseFloat(d.q),
        });
      } catch (err) {
        console.error(err);
      }
    };

    return () => {
      ws.close();
    };
  }, [symbol]);

  return ticker;
}

export function useOrderBook(symbol: string, depth = 25) {
  const [book, setBook] = useState<OrderBook>({ bids: [], asks: [], lastUpdateId: 0 });

  useEffect(() => {
    setBook({ bids: [], asks: [], lastUpdateId: 0 }); // Limpiar al cambiar símbolo
    let isCancelled = false;

    // 1. Obtener snapshot inicial
    fetch(`${BINANCE_REST}/api/v3/depth?symbol=${symbol}&limit=${depth}`)
      .then((r) => r.json())
      .then((snap) => {
        if (isCancelled || !snap.bids) return;

        const process = (entries: string[][], isBid: boolean) => {
          const sorted = entries
            .map(([p, q]) => ({ price: parseFloat(p), qty: parseFloat(q), total: 0 }))
            .filter((e) => e.qty > 0)
            .sort((a, b) => (isBid ? b.price - a.price : a.price - b.price))
            .slice(0, depth);
          let cum = 0;
          return sorted.map((e) => {
            cum += e.qty;
            return { ...e, total: cum };
          });
        };

        setBook({
          bids: process(snap.bids, true),
          asks: process(snap.asks, false),
          lastUpdateId: snap.lastUpdateId,
        });
      })
      .catch((err) => console.error('Error fetching depth snapshot:', err));

    // 2. Stream en vivo de Binance
    const s = symbol.toLowerCase();
    const ws = new WebSocket(`${BINANCE_WS}?streams=${s}@depth@100ms`);

    ws.onmessage = (e) => {
      if (isCancelled) return;
      try {
        const { data: d } = JSON.parse(e.data);
        if (!d || !d.b || !d.a) return;

        setBook((prev) => {
          const merge = (existing: typeof prev.bids, updates: string[][], isBid: boolean) => {
            const map = new Map(existing.map((entry) => [entry.price, entry.qty]));
            for (const [p, q] of updates) {
              const price = parseFloat(p);
              const qty = parseFloat(q);
              if (qty === 0) map.delete(price);
              else map.set(price, qty);
            }
            const sorted = Array.from(map.entries())
              .map(([price, qty]) => ({ price, qty, total: 0 }))
              .sort((a, b) => (isBid ? b.price - a.price : a.price - b.price))
              .slice(0, depth);
            let cum = 0;
            return sorted.map((entry) => {
              cum += entry.qty;
              return { ...entry, total: cum };
            });
          };

          return {
            bids: merge(prev.bids, d.b, true),
            asks: merge(prev.asks, d.a, false),
            lastUpdateId: d.u,
          };
        });
      } catch (err) {
        console.error(err);
      }
    };

    return () => {
      isCancelled = true;
      ws.close();
    };
  }, [symbol, depth]);

  return book;
}

export function useTrades(symbol: string, maxTrades = 60) {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    setTrades([]); // Limpiar al cambiar moneda
    let isCancelled = false;

    // Snapshot histórico
    fetch(`${BINANCE_REST}/api/v3/trades?symbol=${symbol}&limit=40`)
      .then((r) => r.json())
      .then((data) => {
        if (isCancelled || !Array.isArray(data)) return;
        setTrades(
          data
            .map((t: any) => ({
              id: t.id,
              price: parseFloat(t.price),
              qty: parseFloat(t.qty),
              time: t.time,
              isBuyerMaker: t.isBuyerMaker,
            }))
            .reverse()
        );
      })
      .catch((err) => console.error('Error fetching trades:', err));

    const s = symbol.toLowerCase();
    const ws = new WebSocket(`${BINANCE_WS}?streams=${s}@trade`);

    ws.onmessage = (e) => {
      if (isCancelled) return;
      try {
        const { data: d } = JSON.parse(e.data);
        if (!d) return;
        setTrades((prev) => [
          {
            id: d.t,
            price: parseFloat(d.p),
            qty: parseFloat(d.q),
            time: d.T,
            isBuyerMaker: d.m,
          },
          ...prev.slice(0, maxTrades - 1),
        ]);
      } catch (err) {
        console.error(err);
      }
    };

    return () => {
      isCancelled = true;
      ws.close();
    };
  }, [symbol]);

  return trades;
}

export function useLiquidations(symbol: string, maxItems = 40) {
  const [liquidations, setLiquidations] = useState<Liquidation[]>([]);

  useEffect(() => {
    setLiquidations([]); // Limpiar al cambiar moneda
    const s = symbol.toLowerCase();
    const ws = new WebSocket(`${BINANCE_WS}?streams=${s}@forceOrder`);

    ws.onmessage = (e) => {
      try {
        const { data: d } = JSON.parse(e.data);
        if (!d || !d.o) return;
        const o = d.o;
        setLiquidations((prev) => [
          {
            id: `${o.T}-${Math.random()}`,
            symbol: o.s,
            side: o.S as 'BUY' | 'SELL',
            price: parseFloat(o.p),
            qty: parseFloat(o.q),
            time: o.T,
          },
          ...prev.slice(0, maxItems - 1),
        ]);
      } catch (err) {
        console.error(err);
      }
    };

    return () => {
      ws.close();
    };
  }, [symbol]);

  return liquidations;
}
