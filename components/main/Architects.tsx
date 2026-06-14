"use client";

import React, { useState } from "react";

interface Architect {
  name: string;
  role: string;
  handle: string;
  xUrl: string;
  avatar: string;
}

const ARCHITECTS: Architect[] = [
  {
    name: "G0far",
    role: "BUILDER",
    handle: "@g0farrr",
    xUrl: "https://x.com/g0farrr",
    avatar: "/PFP/G0FAR.jpg",
  },
  {
    name: "Yuura",
    role: "BUILDER",
    handle: "@0xyuura",
    xUrl: "https://x.com/0xyuura",
    avatar: "/PFP/YUURA.jpg",
  },
  {
    name: "KippoXBT",
    role: "BUILDER",
    handle: "@0x_kippo",
    xUrl: "https://x.com/0x_kippo",
    avatar: "/PFP/KIPPO.jpg",
  },
];

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M13.86 10.47 21.3 2h-1.76l-6.46 7.35L7.92 2H2l7.8 11.12L2 22h1.76l6.82-7.76L16.08 22H22l-8.14-11.53Zm-2.42 2.75-.79-1.1L4.4 3.3h2.71l5.07 7.1.79 1.11 6.6 9.24h-2.71l-5.42-7.53Z" />
    </svg>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

const ArchitectCard = ({ architect }: { architect: Architect }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={architect.xUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="arch-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transform: hovered ? "translateY(-6px) scale(1.02)" : "translateY(0) scale(1)",
      }}
    >
      {/* Glow ring on hover */}
      <div
        className="arch-glow-ring"
        style={{ opacity: hovered ? 1 : 0 }}
      />

      {/* Card content */}
      <div className="arch-card-inner">
        {/* Avatar */}
        <div className="arch-avatar-wrap">
          <div
            className="arch-avatar-ring"
            style={{
              borderColor: hovered ? "rgba(168,85,247,0.8)" : "rgba(168,85,247,0.25)",
              boxShadow: hovered ? "0 0 20px rgba(168,85,247,0.4)" : "none",
            }}
          >
            <img
              src={architect.avatar}
              alt={architect.name}
              width={52}
              height={52}
              className="arch-avatar-img"
            />
          </div>
        </div>

        {/* Info */}
        <div className="arch-info">
          <div className="arch-name-row">
            <span className="arch-name">{architect.name}</span>
            <span
              className="arch-arrow"
              style={{
                opacity: hovered ? 1 : 0,
                transform: hovered ? "translate(0,0)" : "translate(-4px,4px)",
              }}
            >
              <ArrowUpRightIcon />
            </span>
          </div>
          <div className="arch-meta">
            <span className="arch-role">{architect.role}</span>
            <span className="arch-dot">·</span>
            <span className="arch-handle">
              <XIcon />
              {architect.handle}
            </span>
          </div>
        </div>
      </div>
    </a>
  );
};

export default function Architects() {
  return (
    <section className="arch-section">
      <ArchitectStyles />

      {/* Section header */}
      <div className="arch-header">
        <span className="arch-eyebrow">MEET THE TEAM</span>
        <h2 className="arch-title">The Builders Behind Velixir</h2>
      </div>

      {/* Cards */}
      <div className="arch-grid">
        {ARCHITECTS.map((a) => (
          <ArchitectCard key={a.handle} architect={a} />
        ))}
      </div>
    </section>
  );
}

/* ---- Scoped styles ---------------------------------------------- */
function ArchitectStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

      .arch-section {
        width: 100%;
        max-width: 1240px;
        margin: 0 auto;
        padding: 36px 28px 28px;
        font-family: 'Sora', system-ui, sans-serif;
        -webkit-font-smoothing: antialiased;
      }

      /* Header */
      .arch-header {
        text-align: center;
        margin-bottom: 24px;
        opacity: 0;
        transform: translateY(20px);
        animation: arch-fadeUp 0.7s cubic-bezier(.2,.7,.2,1) forwards;
      }
      .arch-eyebrow {
        display: inline-block;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: #a855f7;
        margin-bottom: 10px;
        background: rgba(168,85,247,0.08);
        border: 1px solid rgba(168,85,247,0.15);
        padding: 4px 14px;
        border-radius: 999px;
      }
      .arch-title {
        font-size: 36px;
        font-weight: 700;
        letter-spacing: -0.03em;
        color: #eef2f0;
        margin: 8px 0 0;
        background: linear-gradient(135deg, #ffffff 0%, #e9d5ff 50%, #a855f7 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .arch-subtitle {
        font-size: 15px;
        line-height: 1.6;
        color: #818b85;
        max-width: 440px;
        margin: 8px auto 0;
      }

      /* Grid */
      .arch-grid {
        display: flex;
        justify-content: center;
        gap: 24px;
        flex-wrap: wrap;
        opacity: 0;
        transform: translateY(20px);
        animation: arch-fadeUp 0.7s cubic-bezier(.2,.7,.2,1) 0.15s forwards;
      }

      /* Card */
      .arch-card {
        position: relative;
        display: flex;
        align-items: center;
        min-width: 290px;
        max-width: 340px;
        padding: 22px 28px;
        border-radius: 20px;
        background: linear-gradient(145deg, rgba(12,8,24,0.95), rgba(6,4,14,0.98));
        border: 1px solid rgba(255,255,255,0.06);
        text-decoration: none;
        color: inherit;
        cursor: pointer;
        transition: all 0.38s cubic-bezier(.2,.7,.2,1);
        overflow: hidden;
      }
      .arch-card:hover {
        border-color: rgba(168,85,247,0.3);
        box-shadow:
          0 20px 60px -15px rgba(0,0,0,0.6),
          0 0 30px -5px rgba(168,85,247,0.15),
          inset 0 1px 0 rgba(255,255,255,0.04);
      }

      .arch-glow-ring {
        position: absolute;
        inset: -1px;
        border-radius: 20px;
        background: linear-gradient(135deg, rgba(168,85,247,0.15), transparent 50%, rgba(168,85,247,0.08));
        pointer-events: none;
        transition: opacity 0.38s ease;
        z-index: 0;
      }

      .arch-card-inner {
        display: flex;
        align-items: center;
        gap: 18px;
        position: relative;
        z-index: 1;
      }

      /* Avatar */
      .arch-avatar-wrap {
        flex-shrink: 0;
      }
      .arch-avatar-ring {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        border: 2px solid rgba(168,85,247,0.25);
        padding: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.38s ease;
        background: rgba(168,85,247,0.04);
        overflow: hidden;
      }
      .arch-avatar-img {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        object-fit: cover;
      }

      /* Info */
      .arch-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }
      .arch-name-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .arch-name {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 0.04em;
        color: #eef2f0;
      }
      .arch-arrow {
        color: #a855f7;
        transition: all 0.3s cubic-bezier(.2,.7,.2,1);
      }
      .arch-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12.5px;
        color: #818b85;
      }
      .arch-role {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10.5px;
        font-weight: 500;
        letter-spacing: 0.12em;
        color: #a855f7;
        background: rgba(168,85,247,0.1);
        padding: 2px 8px;
        border-radius: 6px;
      }
      .arch-dot {
        font-size: 14px;
        color: #3a403c;
      }
      .arch-handle {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        color: #818b85;
        transition: color 0.2s ease;
      }
      .arch-card:hover .arch-handle {
        color: #c4b5fd;
      }

      /* Animation */
      @keyframes arch-fadeUp {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Responsive */
      @media (max-width: 600px) {
        .arch-section {
          padding: 24px 16px 20px;
        }
        .arch-title {
          font-size: 26px;
        }
        .arch-grid {
          flex-direction: column;
          align-items: center;
        }
        .arch-card {
          min-width: 0;
          width: 100%;
          max-width: 100%;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .arch-header, .arch-grid {
          animation: none !important;
          opacity: 1;
          transform: none;
        }
      }
    ` }} />
  );
}
