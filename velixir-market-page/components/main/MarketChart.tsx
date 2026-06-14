"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { MarketToken } from "@/constants/market";
import { ChartRange, CHART_RANGES, fetchCandles } from "@/lib/baseSepolia";

interface MarketChartProps {
  token: MarketToken;
}

const UP = "#22c55e";
const DOWN = "#ef4444";

/** Derive a sensible price precision from the data magnitude. */
function pricePrecision(maxValue: number): { precision: number; minMove: number } {
  const precision = maxValue >= 1000 ? 0 : maxValue >= 100 ? 1 : maxValue >= 1 ? 2 : maxValue >= 0.01 ? 4 : 6;
  return { precision, minMove: 1 / Math.pow(10, precision) };
}

const MarketChart = ({ token }: MarketChartProps) => {
  const [range, setRange] = useState<ChartRange>("1h");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [maxValue, setMaxValue] = useState(0.01);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const { precision, minMove } = useMemo(() => pricePrecision(maxValue), [maxValue]);

  // Build the chart once — clean candlesticks only, no overlay indicators.
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#6b7280",
        fontSize: 11,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      },
      grid: {
        vertLines: { color: "rgba(26, 26, 62, 0.35)" },
        horzLines: { color: "rgba(26, 26, 62, 0.35)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#4b5563", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#1f2937" },
        horzLine: { color: "#4b5563", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#1f2937" },
      },
      rightPriceScale: {
        borderColor: "#1a1a3e",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "#1a1a3e",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 4,
        barSpacing: 8,
      },
      // Full zoom / pan with wheel, pinch and drag.
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: { time: true, price: true },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      autoSize: true,
    });

    // Classic candlestick ("lilin"): solid bodies, visible borders, full wicks.
    const candleSeries = chart.addCandlestickSeries({
      upColor: UP,
      downColor: DOWN,
      borderUpColor: UP,
      borderDownColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
      borderVisible: true,
      wickVisible: true,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, []);

  // Keep the price scale formatting in sync with the selected token.
  useEffect(() => {
    candleSeriesRef.current?.applyOptions({
      priceFormat: { type: "price", precision, minMove },
    });
  }, [precision, minMove]);

  // Load data whenever the token or range changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCandles(token, range)
      .then(({ candles, source }) => {
        if (cancelled || !candleSeriesRef.current) return;
        setIsLive(source !== "simulated");
        if (!candles.length) {
          setError("No data available for this range.");
          return;
        }

        candleSeriesRef.current.setData(
          candles.map((c) => ({
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        );
        // Show recent candles at a comfortable width (not all crammed in).
        const ts = chartRef.current?.timeScale();
        ts?.applyOptions({ barSpacing: 9 });
        ts?.scrollToPosition(0, false);
        setMaxValue(Math.max(...candles.map((c) => c.high)));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load chart");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, range]); // eslint-disable-line react-hooks/exhaustive-deps

  // Zoom controls — adjust bar spacing; "fit" resets to show everything.
  const zoomBy = (factor: number) => {
    const ts = chartRef.current?.timeScale();
    if (!ts) return;
    const current = ts.options().barSpacing ?? 8;
    ts.applyOptions({ barSpacing: Math.min(80, Math.max(2, current * factor)) });
  };
  const resetZoom = () => chartRef.current?.timeScale().fitContent();

  return (
    <div className="flex flex-col h-full">
      {/* Header: status badge + zoom + range tabs */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#1a1a3e]">
        <span
          title={isLive ? "Live price from CoinGecko · candle shape modelled" : "Synthetic demo market"}
          className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 border ${
            isLive ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isLive ? "bg-emerald-400" : "bg-amber-400"}`} />
          <span className={`text-[10px] font-medium ${isLive ? "text-emerald-400" : "text-amber-400"}`}>
            {token.symbol}/USD · {range} · {isLive ? "Live" : "Demo"}
          </span>
        </span>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 mr-1">
            <button
              onClick={() => zoomBy(0.8)}
              title="Zoom out"
              className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              onClick={() => zoomBy(1.25)}
              title="Zoom in"
              className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              onClick={resetZoom}
              title="Reset zoom"
              className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8" /><path d="M3 3v5h5" />
              </svg>
            </button>
          </div>

          <div className="w-px h-4 bg-[#1a1a3e]" />

          {/* Timeframes */}
          <div className="flex items-center gap-1">
            {CHART_RANGES.map((tf) => (
              <button
                key={tf}
                onClick={() => setRange(tf)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all duration-200 ${
                  range === tf
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                    : "text-gray-500 hover:text-gray-300 border border-transparent"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart canvas */}
      <div className="relative flex-1 min-h-[320px]">
        <div ref={containerRef} className="absolute inset-0" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#080820]/40 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              Loading {token.symbol} chart…
            </div>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-xs text-red-400/80 px-4">
              <p>Couldn&apos;t load chart data.</p>
              <p className="text-gray-600 mt-1">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketChart;
