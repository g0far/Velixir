import React from 'react';

export interface AssetMeta {
  symbol: string;
  fullName: string;
  color: string;
}

export const ASSET_METADATA: Record<string, AssetMeta> = {
  SOL: {
    symbol: 'SOL',
    fullName: 'Solana',
    color: 'from-purple-500 to-emerald-400',
  },
  BTC: {
    symbol: 'BTC',
    fullName: 'Bitcoin',
    color: 'from-amber-500 to-orange-600',
  },
  RLO: {
    symbol: 'RLO',
    fullName: 'Rialo',
    color: 'from-purple-500 to-pink-500',
  },
  USDC: {
    symbol: 'USDC',
    fullName: 'USD Coin',
    color: 'from-cyan-500 to-blue-600',
  },
  USDT: {
    symbol: 'USDT',
    fullName: 'Tether USD',
    color: 'from-emerald-400 to-teal-600',
  },
};

interface TokenLogoProps {
  symbol: string;
  size?: number;
}

export function TokenLogo({ symbol, size = 20 }: TokenLogoProps) {
  const s = symbol.toUpperCase();

  if (s === 'SOL') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="inline-block shrink-0 align-middle"
      >
        <defs>
          <linearGradient id="sol-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9945FF" />
            <stop offset="100%" stopColor="#14F195" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="#131320" />
        <g fill="url(#sol-gradient)">
          <path d="M6.6 7.6 H18 L16 9.4 H4.6 Z" />
          <path d="M4.6 11.1 H16 L18 12.9 H6.6 Z" />
          <path d="M6.6 14.6 H18 L16 16.4 H4.6 Z" />
        </g>
      </svg>
    );
  }

  if (s === 'BTC') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="inline-block shrink-0 align-middle"
      >
        <circle cx="12" cy="12" r="10" fill="#F7931A" />
        <path
          d="M10.2 6.5V7.7H11V8.6H10.2V9.8H11V10.7H10.2V11.9H11.5C11.9 11.9 12.3 11.8 12.6 11.6C12.9 11.4 13.1 11.1 13.2 10.7C13.3 10.4 13.2 10 13.1 9.7C12.9 9.4 12.6 9.2 12.2 9.2C12.7 9.2 13.1 9 13.3 8.7C13.5 8.4 13.6 8 13.5 7.6C13.4 7.2 13.1 6.9 12.8 6.7C12.4 6.5 12 6.5 11.5 6.5H10.2ZM11 7.7H11.5C11.8 7.7 12 7.7 12.2 7.8C12.3 8 12.4 8.2 12.3 8.4C12.2 8.6 12 8.7 11.8 8.7H11V7.7ZM11 9.8H11.5C11.8 9.8 12.1 9.9 12.2 10.1C12.3 10.3 12.2 10.6 12.1 10.7C11.9 10.9 11.7 10.9 11.5 10.9H11V9.8Z"
          fill="white"
        />
      </svg>
    );
  }

  if (s === 'USDC') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="inline-block shrink-0 align-middle"
      >
        <circle cx="12" cy="12" r="10" fill="#2775CA" />
        <circle cx="12" cy="12" r="7.5" stroke="white" strokeWidth="0.8" />
        <path
          d="M12 6.8V17.2M9.8 9H13.2C14.1 9 14.5 9.4 14.5 10.2C14.5 11 14.1 11.4 13.2 11.4H10.8C9.9 11.4 9.5 11.8 9.5 12.6C9.5 13.4 9.9 13.8 10.8 13.8H14.2"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (s === 'USDT') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="inline-block shrink-0 align-middle"
      >
        <circle cx="12" cy="12" r="10" fill="#26A17B" />
        <path
          d="M7.5 8H16.5M12 8V16M10.2 16H13.8"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (s === 'RLO') {
    // Square brand image (dark mark on a light/cream face) clipped to a circle.
    return (
      <span
        className="inline-flex shrink-0 rounded-full overflow-hidden align-middle"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/rlo-logo.jpg"
          alt="Rialo (RLO) logo"
          className="h-full w-full object-cover"
        />
      </span>
    );
  }


  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block shrink-0 align-middle"
    >
      <circle cx="12" cy="12" r="10" fill="#475569" />
      <text
        x="12"
        y="15"
        fill="white"
        fontSize="9"
        fontWeight="bold"
        textAnchor="middle"
        fontFamily="monospace"
      >
        {s.substring(0, 2)}
      </text>
    </svg>
  );
}
