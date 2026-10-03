import { useState, useEffect, useRef, useCallback } from 'react';
import { OrderBook, Trade, Ticker, Liquidation } from '../types';

const BINANCE_WS = 'wss://stream.binance.com:9443/stream';
const BINANCE_REST = 'https://api.binance.com';

export function useTicker(symbol: string) {
  const [ticker, setTicker] = useState<Ticker | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`${BINANCE_WS}?streams=${symbol.toLowerCase()}@ticker`);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      const d = msg.data;
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
    };
    return () => ws.close();
  }, [symbol]);

  return ticker;
}

export function useOrderBook(symbol: string, depth = 20) {
  const [book, setBook] = useState<OrderBook>({ bids: [], asks: [], lastUpdateId: 0 });

  useEffect(() => {
    // Fetch initial snapshot
    fetch(`${BINANCE_REST}/api/v3/depth?symbol=${symbol}&limit=${depth}`)
      .then((r) => r.json())
      .then((snap) => {
        const process = (entries: string[][], isBid: boolean) => {
          const sorted = entries
            .map(([p, q]) => ({ price: parseFloat(p), qty: parseFloat(q), total: 0 }))
            .filter((e) => e.qty > 0)
            .sort((a, b) => (isBid ? b.price - a.price : a.price - b.price))
            .slice(0, depth);
          let cum = 0;
          return sorted.map((e) => { cum += e.qty; return { ...e, total: cum }; });
        };
        setBook({ bids: process(snap.bids, true), asks: process(snap.asks, false), lastUpdateId: snap.lastUpdateId });
      });

    // Stream updates
    const ws = new WebSocket(`${BINANCE_WS}?streams=${symbol.toLowerCase()}@depth@100ms`);
    ws.onmessage = (e) => {
      const { data: d } = JSON.parse(e.data);
      setBook((prev) => {
        const merge = (existing: typeof prev.bids, updates: string[][], isBid: boolean) => {
          const map = new Map(existing.map((e) => [e.price, e.qty]));
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
          return sorted.map((e) => { cum += e.qty; return { ...e, total: cum }; });
        };
        return {
          bids: merge(prev.bids, d.b, true),
          asks: merge(prev.asks, d.a, false),
          lastUpdateId: d.u,
        };
      });
    };
    return () => ws.close();
  }, [symbol, depth]);

  return book;
}

export function useTrades(symbol: string, maxTrades = 80) {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    // Initial trades
    fetch(`${BINANCE_REST}/api/v3/trades?symbol=${symbol}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        setTrades(
          data.map((t: any) => ({
            id: t.id,
            price: parseFloat(t.price),
            qty: parseFloat(t.qty),
            time: t.time,
            isBuyerMaker: t.isBuyerMaker,
          })).reverse()
        );
      });

    const ws = new WebSocket(`${BINANCE_WS}?streams=${symbol.toLowerCase()}@trade`);
    ws.onmessage = (e) => {
      const { data: d } = JSON.parse(e.data);
      setTrades((prev) => [
        { id: d.t, price: parseFloat(d.p), qty: parseFloat(d.q), time: d.T, isBuyerMaker: d.m },
        ...prev.slice(0, maxTrades - 1),
      ]);
    };
    return () => ws.close();
  }, [symbol]);

  return trades;
}

export function useLiquidations(symbol: string, maxItems = 50) {
  const [liquidations, setLiquidations] = useState<Liquidation[]>([]);

  useEffect(() => {
    const ws = new WebSocket(`${BINANCE_WS}?streams=${symbol.toLowerCase()}@forceOrder`);
    ws.onmessage = (e) => {
      const { data: d } = JSON.parse(e.data);
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
    };
    return () => ws.close();
  }, [symbol]);

  return liquidations;
}
