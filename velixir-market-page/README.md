# Velixir — Market (Swap) Page Export

Salinan lengkap halaman **Market / Swap** beserta semua dependensinya, dengan
struktur folder asli dipertahankan. Tinggal salin isi folder ini ke root project
Next.js (App Router) lain.

## Struktur

```
app/market/page.tsx                  # Halaman /market (entry point)
components/main/MarketChart.tsx       # Candlestick + area chart (lightweight-charts)
components/main/MarketTokenCards.tsx  # Kartu token + TokenIcon + Sparkline
components/main/MarketTradePanel.tsx  # Panel SWAP (from/to, rate, slippage, tx)
components/main/MarketPositions.tsx   # Tabel "Recent Swaps"
constants/market.ts                   # Token (BTC/ETH/USDT/RIALO), config, history
lib/baseSepolia.ts                    # Data chart + harga live (CoinGecko)
lib/wallet.ts                         # Koneksi wallet + kirim tx (Base Sepolia)
public/tokens/*.png                   # Ikon token
```

## Dependency npm

```bash
npm install react react-dom next framer-motion lightweight-charts
```

(Versi yang dipakai project asal: next 14.0.3, react 18, framer-motion 10,
lightweight-charts 4.2)

## Catatan penting

- **Path alias `@/`** — semua import memakai `@/...` yang menunjuk ke **root project**.
  Pastikan `tsconfig.json` punya:
  ```json
  { "compilerOptions": { "paths": { "@/*": ["./*"] } } }
  ```
- **Harga real** diambil dari **CoinGecko** (`/simple/price`) untuk BTC/ETH/USDT,
  refresh tiap 30 detik. RIALO sintetik (token demo). Tidak butuh API key.
- **Candle chart** bentuknya di-*model* menempel ke harga live real + arah 24h
  (OHLC real per-interval 1m–1d tidak tersedia gratis). Timeframe: 1m/15m/30m/1h/4h/1d.
- **Swap on-chain** mengirim transaksi memo `VELIXIR:SWAP:FROM->TO:amount` di
  Base Sepolia (chainId 84532) — hanya butuh gas, dana tidak berpindah.
- File ini **snapshot**; mengubahnya tidak memengaruhi halaman yang berjalan.
