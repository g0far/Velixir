"use client";
import React from "react";

/**
 * VelixirFooter
 * ------------------------------------------------------------------
 * A premium Web3 footer for the Velixir reputation-powered DeFi
 * lending protocol.
 *
 * Drop-in for Next.js + Tailwind. All brand tokens, fonts, glow
 * effects and the animated network background live in the scoped
 * <style> block below, so the component renders identically in any
 * environment (it does not depend on a custom tailwind.config).
 * Layout/spacing uses Tailwind utilities; move the CSS variables in
 * `:root` into your tailwind theme if you prefer.
 * ------------------------------------------------------------------
 */

const PRODUCT_LINKS = [
  { label: "Market", href: "/market" },
  { label: "Liquidity", href: "/liquidity?tab=pools" },
  { label: "Staking", href: "/liquidity?tab=staking" },
  { label: "Lending", href: "/borrow?tab=Lending%26Borrow&mode=lending" },
  { label: "Borrow", href: "/borrow?tab=Lending%26Borrow&mode=borrow" },
];
const RESOURCE_LINKS = [
  { label: "Docs", href: "/docs" },
  { label: "Blog", href: "https://www.rialo.io/blog" },
];
const COMPANY_LINKS = [
  { label: "About", href: "/project" },
  { label: "Careers", href: "https://jobs.ashbyhq.com/subzero" },
];
const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "https://www.rialo.io/privacy-policy" },
  { label: "Terms of Use", href: "https://www.rialo.io/terms-of-service" },
];

/* ---- Brand mark ------------------------------------------------- */
function VelixirLogo() {
  return (
    <Link href="/" className="vx-brand" aria-label="VELIXIR" style={{ textDecoration: 'none' }}>
      <img
        src="/velixir_transparent.png?v=4"
        alt="VELIXIR Logo"
        width="40"
        height="40"
        className="vx-logo-mark"
        style={{ width: 40, height: 40, objectFit: 'contain' }}
      />
      <span className="vx-wordmark">VELIXIR</span>
    </Link>
  );
}

/* ---- Social icons ----------------------------------------------- */
const SOCIALS = [
  {
    name: "X",
    href: "https://x.com/RialoHQ",
    path: (
      <path d="M13.86 10.47 21.3 2h-1.76l-6.46 7.35L7.92 2H2l7.8 11.12L2 22h1.76l6.82-7.76L16.08 22H22l-8.14-11.53Zm-2.42 2.75-.79-1.1L4.4 3.3h2.71l5.07 7.1.79 1.11 6.6 9.24h-2.71l-5.42-7.53Z" />
    ),
  },
  {
    name: "Discord",
    href: "https://discord.com/invite/RialoProtocol",
    path: (
      <path d="M20.32 4.94A19.8 19.8 0 0 0 15.4 3.4a.07.07 0 0 0-.08.04c-.21.38-.45.88-.61 1.27a18.3 18.3 0 0 0-5.42 0 12 12 0 0 0-.62-1.27.08.08 0 0 0-.08-.04A19.7 19.7 0 0 0 3.68 4.94a.07.07 0 0 0-.03.03C.53 9.6-.32 14.12.1 18.58a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .09-.03c.46-.63.87-1.3 1.23-2a.08.08 0 0 0-.04-.11 13 13 0 0 1-1.87-.89.08.08 0 0 1-.01-.13l.37-.29a.07.07 0 0 1 .08-.01 14.2 14.2 0 0 0 12.06 0 .07.07 0 0 1 .08 0l.37.3a.08.08 0 0 1-.01.13 12.3 12.3 0 0 1-1.87.89.08.08 0 0 0-.04.11c.36.7.78 1.36 1.23 2a.08.08 0 0 0 .09.03 19.8 19.8 0 0 0 6-3.03.08.08 0 0 0 .04-.06c.5-5.18-.84-9.66-3.55-13.61a.06.06 0 0 0-.03-.03ZM8.02 15.86c-1.18 0-2.16-1.08-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.08-2.15-2.42s.96-2.42 2.15-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Z" />
    ),
  },
  {
    name: "Telegram",
    href: "https://t.me/rialoprotocol",
    path: (
      <path d="M21.94 4.3 18.6 19.96c-.25 1.1-.9 1.38-1.83.86l-5.04-3.71-2.43 2.34c-.27.27-.5.5-1 .5l.35-5.08L17.9 6.51c.4-.36-.09-.56-.62-.2L5.84 13.5l-4.97-1.56c-1.08-.34-1.1-1.08.23-1.6L20.54 2.7c.9-.34 1.69.2 1.4 1.6Z" />
    ),
  },
  {
    name: "GitHub",
    href: "https://github.com/SubzeroLabs",
    path: (
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49l-.01-1.9c-2.78.62-3.37-1.21-3.37-1.21-.46-1.18-1.11-1.5-1.11-1.5-.9-.64.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.37-2.22-.26-4.55-1.14-4.55-5.05 0-1.12.39-2.03 1.03-2.74-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.71 1.03 1.62 1.03 2.74 0 3.92-2.34 4.79-4.57 5.04.36.32.68.94.68 1.9l-.01 2.82c0 .27.18.59.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
    ),
  },
];

function SocialIcon({ name, href, path }) {
  return (
    <a 
      className="vx-social" 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      aria-label={name} 
      title={name}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        {path}
      </svg>
    </a>
  );
}

import Link from "next/link";

/* ---- Link column ------------------------------------------------ */
function LinkColumn({ title, links }) {
  return (
    <nav className="vx-col">
      <h4 className="vx-col-title">{title}</h4>
      <ul className="vx-col-list">
        {links.map((item) => (
          <li key={item.label}>
            {item.href.startsWith("/") ? (
              <Link href={item.href} className="vx-link">
                <span className="vx-link-dot" />
                {item.label}
              </Link>
            ) : (
              <a 
                href={item.href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="vx-link"
              >
                <span className="vx-link-dot" />
                {item.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ---- Animated network background -------------------------------- */
const PATHS = [
  "M-60,130 C260,60 470,210 720,150 S1110,90 1320,170",
  "M-60,300 C210,365 500,235 740,330 S1080,430 1320,330",
  "M-60,450 C320,405 540,510 800,435 S1110,360 1320,440",
  "M-60,210 C320,310 620,120 920,270 S1170,310 1320,240",
];

function NetworkBackground() {
  return (
    <svg
      className="vx-net"
      viewBox="0 0 1260 520"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <filter id="vxGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="vxFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset="0.15" stopColor="white" stopOpacity="1" />
          <stop offset="0.85" stopColor="white" stopOpacity="1" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="vxMask">
          <rect x="0" y="0" width="1260" height="520" fill="url(#vxFade)" />
        </mask>
      </defs>

      <g mask="url(#vxMask)">
        {/* soft glow underlay */}
        <g filter="url(#vxGlow)" opacity="0.5">
          {PATHS.map((d, i) => (
            <path key={`g${i}`} d={d} stroke="var(--vx-accent)" strokeWidth="2.4" fill="none" opacity="0.08" />
          ))}
        </g>

        {/* crisp base lines */}
        {PATHS.map((d, i) => (
          <path key={`l${i}`} d={d} stroke="var(--vx-accent)" strokeWidth="1" fill="none" opacity="0.13" />
        ))}

        {/* flowing dash accents */}
        {PATHS.slice(0, 2).map((d, i) => (
          <path
            key={`f${i}`}
            d={d}
            className="vx-flow"
            stroke="var(--vx-accent)"
            strokeWidth="1.4"
            fill="none"
            opacity="0.35"
            style={{ animationDuration: `${5 + i * 2}s` }}
          />
        ))}

        {/* traveling capital packets */}
        {PATHS.map((d, i) => (
          <circle key={`p${i}`} r="2.6" fill="var(--vx-accent)" filter="url(#vxGlow)">
            <animateMotion
              dur={`${6 + i * 1.6}s`}
              begin={`${i * 1.2}s`}
              repeatCount="indefinite"
              path={d}
              rotate="auto"
            />
          </circle>
        ))}

        {/* reputation nodes */}
        {[
          [720, 150],
          [740, 330],
          [800, 435],
          [920, 270],
          [210, 365],
          [470, 210],
        ].map(([cx, cy], i) => (
          <circle
            key={`n${i}`}
            cx={cx}
            cy={cy}
            r="3"
            className="vx-node"
            fill="var(--vx-accent)"
            style={{ animationDelay: `${i * 0.7}s` }}
          />
        ))}
      </g>
    </svg>
  );
}

/* ---- Footer ----------------------------------------------------- */
export default function VelixirFooter() {


  return (
    <div className="vx-root">
      <FooterStyles />
      <footer className="vx-shell">
        <div className="vx-container">
          <NetworkBackground />
          <div className="vx-glow-orb" aria-hidden="true" />

          {/* ---- Main grid ---- */}
          <div className="vx-grid">
            {/* LEFT / brand */}
            <div className="vx-brand-block vx-reveal">
              <VelixirLogo />
              <p className="vx-desc">
                Velixir is a reputation-powered DeFi lending protocol where your
                on-chain reputation becomes your collateral. Borrow, lend, and
                unlock capital efficiency without traditional barriers.
              </p>
              <div className="vx-socials">
                {SOCIALS.map((s) => (
                  <SocialIcon key={s.name} {...s} />
                ))}
              </div>
            </div>

            {/* RIGHT / columns + newsletter */}
            <div className="vx-right">
              <div className="vx-cols vx-reveal" style={{ animationDelay: "0.08s" }}>
                <LinkColumn title="Product" links={PRODUCT_LINKS} />
                <LinkColumn title="Resources" links={RESOURCE_LINKS} />
                <LinkColumn title="Company" links={COMPANY_LINKS} />
              </div>
            </div>
          </div>

          {/* ---- Bottom bar ---- */}
          <div className="vx-divider" />
          <div className="vx-bottom">
            <span className="vx-copy">© 2026 Velixir. All rights reserved.</span>
            <div className="vx-legal">
              {LEGAL_LINKS.map((item, i) => (
                <React.Fragment key={item.label}>
                  {i > 0 && <span className="vx-legal-sep" />}
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vx-legal-link"
                  >
                    {item.label}
                  </a>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---- Scoped styles ---------------------------------------------- */
function FooterStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

      .vx-root {
        --vx-bg: transparent;
        --vx-surface: #030014;
        --vx-accent: #a855f7;
        --vx-text: #eef2f0;
        --vx-muted: #818b85;
        --vx-faint: rgba(255,255,255,0.06);
        background: var(--vx-bg);
        padding: 28px 28px 0px;
        font-family: 'Sora', system-ui, sans-serif;
        color: var(--vx-text);
        -webkit-font-smoothing: antialiased;
      }

      .vx-shell { width: 100%; }

      .vx-container {
        position: relative;
        overflow: hidden;
        max-width: 1240px;
        margin: 0 auto;
        border-radius: 32px;
        padding: 52px 64px 16px;
        background:
          radial-gradient(120% 120% at 100% 0%, rgba(168,85,247,0.05), transparent 55%),
          linear-gradient(180deg, rgba(3,0,20,0.4) 0%, rgba(3,0,20,0.8) 100%);
        border: 1px solid rgba(255,255,255,0.05);
        box-shadow: 0 40px 120px -40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.03);
      }

      /* network bg */
      .vx-net {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        z-index: 0;
        pointer-events: none;
      }
      .vx-flow {
        stroke-dasharray: 4 22;
        animation: vx-dash linear infinite;
      }
      @keyframes vx-dash { to { stroke-dashoffset: -260; } }
      .vx-node {
        transform-box: fill-box;
        transform-origin: center;
        animation: vx-pulse 3.4s ease-in-out infinite;
      }
      @keyframes vx-pulse {
        0%, 100% { opacity: 0.35; transform: scale(0.8); }
        50%      { opacity: 0.95; transform: scale(1.35); }
      }
      .vx-glow-orb {
        position: absolute;
        top: -160px; right: -120px;
        width: 460px; height: 460px;
        background: radial-gradient(circle, rgba(168,85,247,0.14), transparent 65%);
        filter: blur(20px);
        z-index: 0;
        pointer-events: none;
      }

      /* reveal */
      .vx-reveal { opacity: 0; transform: translateY(14px); animation: vx-rise 0.7s cubic-bezier(.2,.7,.2,1) forwards; }
      @keyframes vx-rise { to { opacity: 1; transform: translateY(0); } }

      /* grid */
      .vx-grid {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: minmax(0, 1.15fr) minmax(0, 1.6fr);
        gap: 64px;
        align-items: center;
      }

      /* brand */
      .vx-brand { display: flex; align-items: center; gap: 12px; }
      .vx-logo-mark { filter: drop-shadow(0 0 10px rgba(168,85,247,0.35)); }
      .vx-wordmark {
        font-size: 24px; font-weight: 700; letter-spacing: -0.02em;
        background: linear-gradient(90deg, #ffffff, #e9d5ff);
        -webkit-background-clip: text; background-clip: text; color: transparent;
      }
      .vx-desc {
        margin-top: 14px;
        max-width: 360px;
        font-size: 14.5px;
        line-height: 1.7;
        color: var(--vx-muted);
      }
      .vx-socials { display: flex; gap: 12px; margin-top: 18px; position: relative; z-index: 10; }
      .vx-social {
        display: grid; place-items: center;
        width: 42px; height: 42px;
        border-radius: 12px;
        color: var(--vx-muted);
        background: rgba(255,255,255,0.025);
        border: 1px solid rgba(255,255,255,0.06);
        transition: all 0.28s cubic-bezier(.2,.7,.2,1);
        position: relative;
        z-index: 10;
        pointer-events: auto;
        cursor: pointer;
      }
      .vx-social:hover {
        color: #04140b;
        background: var(--vx-accent);
        border-color: var(--vx-accent);
        transform: translateY(-3px);
        box-shadow: 0 8px 24px -6px rgba(168,85,247,0.55);
      }

      /* right side */
      .vx-right { display: flex; flex-direction: column; gap: 38px; }
      .vx-cols {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 32px;
      }
      .vx-col-title {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--vx-accent);
        margin: 0 0 22px;
      }
      .vx-col-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
      .vx-link {
        position: relative;
        display: inline-flex; align-items: center; gap: 0;
        font-size: 14.5px;
        color: var(--vx-muted);
        text-decoration: none;
        transition: color 0.22s ease, transform 0.22s ease;
      }
      .vx-link-dot {
        width: 0; height: 5px; border-radius: 99px;
        background: var(--vx-accent);
        margin-right: 0;
        opacity: 0;
        transition: all 0.26s cubic-bezier(.2,.7,.2,1);
      }
      .vx-link:hover { color: var(--vx-text); transform: translateX(2px); }
      .vx-link:hover .vx-link-dot { width: 5px; opacity: 1; margin-right: 10px; box-shadow: 0 0 8px var(--vx-accent); }

      /* newsletter */
      .vx-news {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        padding: 26px 28px;
        border-radius: 22px;
        background: linear-gradient(135deg, rgba(168,85,247,0.06), rgba(255,255,255,0.015));
        border: 1px solid rgba(168,85,247,0.14);
      }
      .vx-eyebrow {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase;
        color: var(--vx-accent);
      }
      .vx-news-text { margin: 8px 0 0; font-size: 17px; font-weight: 600; letter-spacing: -0.01em; max-width: 280px; }
      .vx-news-form { display: flex; gap: 10px; flex-wrap: wrap; }
      .vx-input {
        min-width: 200px;
        flex: 1;
        background: rgba(0,0,0,0.4);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 13px 16px;
        color: var(--vx-text);
        font-family: 'Sora', sans-serif;
        font-size: 14px;
        outline: none;
        transition: border-color 0.22s ease, box-shadow 0.22s ease;
      }
      .vx-input::placeholder { color: #5b635e; }
      .vx-input:focus { border-color: var(--vx-accent); box-shadow: 0 0 0 3px rgba(168,85,247,0.15); }
      .vx-cta {
        cursor: pointer;
        white-space: nowrap;
        border: none;
        border-radius: 12px;
        padding: 13px 24px;
        background: var(--vx-accent);
        color: #04140b;
        font-family: 'Sora', sans-serif;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.26s cubic-bezier(.2,.7,.2,1);
      }
      .vx-cta:hover {
        transform: translateY(-2px);
        box-shadow: 0 0 0 1px var(--vx-accent), 0 10px 30px -6px rgba(168,85,247,0.7), 0 0 28px rgba(168,85,247,0.45);
      }
      .vx-cta:active { transform: translateY(0); }

      /* bottom */
      .vx-divider {
        position: relative; z-index: 1;
        height: 1px; margin: 38px 0 18px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1) 20%, rgba(255,255,255,0.1) 80%, transparent);
      }
      .vx-bottom {
        position: relative; z-index: 1;
        display: flex; align-items: center; justify-content: space-between;
        flex-wrap: wrap; gap: 14px;
      }
      .vx-copy { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #5f6863; }
      .vx-legal { display: flex; align-items: center; gap: 18px; }
      .vx-legal-link { font-size: 13px; color: var(--vx-muted); text-decoration: none; transition: color 0.2s ease; }
      .vx-legal-link:hover { color: var(--vx-accent); }
      .vx-legal-sep { width: 4px; height: 4px; border-radius: 99px; background: #3a403c; }

      /* tablet */
      @media (max-width: 980px) {
        .vx-container { padding: 40px 32px 24px; }
        .vx-grid { grid-template-columns: 1fr; gap: 34px; }
        .vx-news { flex-direction: column; align-items: flex-start; }
        .vx-news-form { width: 100%; }
      }

      /* mobile */
      @media (max-width: 600px) {
        .vx-root { padding: 14px 14px 0px; }
        .vx-container { padding: 30px 20px 14px; border-radius: 26px; }
        .vx-cols { grid-template-columns: 1fr 1fr; gap: 20px 16px; }
        .vx-bottom { flex-direction: column; align-items: flex-start; }
        .vx-news-text { max-width: 100%; }
        .vx-input { min-width: 0; width: 100%; }
        .vx-cta { width: 100%; }
      }

      @media (prefers-reduced-motion: reduce) {
        .vx-flow, .vx-node, .vx-reveal { animation: none !important; }
        .vx-reveal { opacity: 1; transform: none; }
      }
    ` }} />
  );
}
