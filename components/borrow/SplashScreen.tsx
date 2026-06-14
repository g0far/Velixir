import React, { useEffect, useRef, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  color: string;
}

const logoUrl = '/favicon.png';

const COLORS = ['#818cf8', '#a78bfa', '#60a5fa', '#c4b5fd', '#6366f1', '#7c3aed'];

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');
  const [barWidth, setBarWidth] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  // Init particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const count = Math.floor((window.innerWidth * window.innerHeight) / 8000);
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.6 + 0.1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p) => {
        // drift
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // draw star
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();

        // draw line to center if close enough
        const dx = cx - p.x;
        const dy = cy - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(cx, cy);
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = (1 - dist / 180) * 0.12;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      });

      // connect nearby particles
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const a = particlesRef.current[i];
          const b = particlesRef.current[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 80) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = '#6366f1';
            ctx.globalAlpha = (1 - d / 80) * 0.08;
            ctx.lineWidth = 0.4;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Phase transitions
  useEffect(() => {
    const t1 = setTimeout(() => { setPhase('show'); setBarWidth(100); }, 120);
    const t2 = setTimeout(() => setPhase('exit'), 3000);
    const t3 = setTimeout(() => onFinish(), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  return (
    <div style={{
      opacity: phase === 'exit' ? 0 : 1,
      transition: 'opacity 0.5s ease',
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#020617',
      pointerEvents: phase === 'exit' ? 'none' : 'all',
      overflow: 'hidden',
    }}>
      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {/* Radial glow blobs */}
      <div style={{
        position: 'absolute', top: '42%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 700, height: 700,
        background: 'radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* === Main content === */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Logo + rings */}
        <div style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 36,
          opacity: phase === 'enter' ? 0 : 1,
          transform: phase === 'enter' ? 'scale(0.55)' : 'scale(1)',
          transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          {/* Outer pulse ring */}
          <div style={{
            position: 'absolute', width: 200, height: 200, borderRadius: '50%',
            border: '1px solid rgba(139,92,246,0.12)',
            animation: 'pulseRing 2.4s ease-in-out infinite',
          }} />
          {/* Spinning outer */}
          <div style={{
            position: 'absolute', width: 170, height: 170, borderRadius: '50%',
            border: '1.5px solid rgba(139,92,246,0.15)',
            borderTopColor: 'rgba(139,92,246,0.8)',
            borderRightColor: 'rgba(99,102,241,0.4)',
            animation: 'spin 2.8s linear infinite',
          }} />
          {/* Counter-spin middle */}
          <div style={{
            position: 'absolute', width: 140, height: 140, borderRadius: '50%',
            border: '1px dashed rgba(167,139,250,0.2)',
            borderBottomColor: 'rgba(167,139,250,0.6)',
            animation: 'spin 4.5s linear infinite reverse',
          }} />
          {/* Static inner */}
          <div style={{
            position: 'absolute', width: 110, height: 110, borderRadius: '50%',
            border: '1px solid rgba(99,102,241,0.18)',
          }} />
          {/* Dot orbit */}
          <div style={{
            position: 'absolute', width: 150, height: 150, borderRadius: '50%',
            animation: 'spin 3s linear infinite',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: 6, height: 6, borderRadius: '50%',
              background: 'radial-gradient(circle, #a78bfa, #6366f1)',
              boxShadow: '0 0 8px 2px rgba(167,139,250,0.7)',
            }} />
          </div>
          {/* Second dot orbit (reverse) */}
          <div style={{
            position: 'absolute', width: 130, height: 130, borderRadius: '50%',
            animation: 'spin 5s linear infinite reverse',
          }}>
            <div style={{
              position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
              width: 4, height: 4, borderRadius: '50%',
              background: 'radial-gradient(circle, #60a5fa, #818cf8)',
              boxShadow: '0 0 6px 2px rgba(96,165,250,0.6)',
            }} />
          </div>

          {/* Logo */}
          <img src={logoUrl} alt="VELIXIR" style={{
            width: 88, height: 88,
            objectFit: 'contain',
            position: 'relative', zIndex: 1,
            filter: phase === 'show'
              ? 'drop-shadow(0 0 18px rgba(139,92,246,1)) drop-shadow(0 0 48px rgba(99,102,241,0.6)) drop-shadow(0 0 80px rgba(109,40,217,0.3))'
              : 'drop-shadow(0 0 6px rgba(139,92,246,0.3))',
            transition: 'filter 1s ease',
          }} />
        </div>

        {/* Brand name with letter-by-letter reveal */}
        <div style={{
          textAlign: 'center',
          opacity: phase === 'enter' ? 0 : 1,
          transform: phase === 'enter' ? 'translateY(20px)' : 'translateY(0)',
          transition: 'opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s',
        }}>
          <div style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 900, fontSize: 40,
            letterSpacing: '0.35em',
            background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 50%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textTransform: 'uppercase',
          }}>
            VELIXIR
          </div>
          <div style={{
            fontFamily: 'monospace', fontSize: 11,
            letterSpacing: '0.45em',
            color: '#818cf8',
            textTransform: 'uppercase', marginTop: 6,
          }}>
            Reputation Finance
          </div>
        </div>

        {/* Divider line */}
        <div style={{
          marginTop: 28,
          width: phase === 'enter' ? 0 : 240,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), rgba(99,102,241,0.5), transparent)',
          transition: 'width 0.9s ease 0.5s',
        }} />

        {/* Loading bar track */}
        <div style={{
          marginTop: 20,
          width: 220,
          height: 3,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 999,
          overflow: 'hidden',
          opacity: phase === 'enter' ? 0 : 1,
          transition: 'opacity 0.4s ease 0.5s',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
        }}>
          <div style={{
            height: '100%',
            width: `${barWidth}%`,
            background: 'linear-gradient(90deg, #7c3aed, #6366f1, #3b82f6, #818cf8)',
            borderRadius: 999,
            transition: 'width 2.4s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: '0 0 10px 2px rgba(139,92,246,0.5)',
          }} />
        </div>

        {/* Status text */}
        <div style={{
          marginTop: 14,
          fontFamily: 'monospace', fontSize: 10,
          letterSpacing: '0.18em',
          color: 'rgba(100,116,139,0.7)',
          textTransform: 'uppercase',
          opacity: phase === 'enter' ? 0 : 1,
          transition: 'opacity 0.5s ease 0.6s',
        }}>
          Initializing DeFi Credit Engine...
        </div>

        {/* Scanning hex grid decoration */}
        <div style={{
          display: 'flex', gap: 5, marginTop: 24,
          opacity: phase === 'enter' ? 0 : 1,
          transition: 'opacity 0.5s ease 0.7s',
        }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{
              width: 4, height: 4, borderRadius: 1,
              background: i < 5 ? 'rgba(139,92,246,0.7)' : 'rgba(255,255,255,0.07)',
              boxShadow: i < 5 ? '0 0 4px rgba(139,92,246,0.6)' : 'none',
              animation: 'blink 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.18}s`,
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseRing {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.08); opacity: 0.1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
