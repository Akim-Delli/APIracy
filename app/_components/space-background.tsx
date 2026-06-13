"use client";

import { useEffect, useRef } from "react";

/* Deterministic PRNG so the static starfield matches between SSR and client. */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STARS = (() => {
  const rand = mulberry32(42);
  return Array.from({ length: 80 }, () => ({
    top: rand() * 100,
    left: rand() * 100,
    size: rand() * 1.6 + 0.5,
    delay: rand() * 5,
    duration: rand() * 4 + 3,
  }));
})();

/* Stellar's signature: a drifting, twinkling particle field rendered on a canvas. */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    interface P {
      x: number;
      y: number;
      r: number;
      vy: number;
      vx: number;
      a: number;
      tw: number;
    }
    let particles: P[] = [];

    function seed() {
      width = canvas!.offsetWidth;
      height = canvas!.offsetHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.floor((width * height) / 18000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.6 + 0.4,
        vy: -(Math.random() * 0.25 + 0.05),
        vx: (Math.random() - 0.5) * 0.12,
        a: Math.random() * 0.5 + 0.2,
        tw: Math.random() * 0.02 + 0.005,
      }));
    }

    let frame = 0;
    let phase = 0;
    function draw() {
      ctx!.clearRect(0, 0, width, height);
      phase += 0.02;
      for (const p of particles) {
        p.y += p.vy;
        p.x += p.vx;
        if (p.y < -4) {
          p.y = height + 4;
          p.x = Math.random() * width;
        }
        if (p.x < -4) p.x = width + 4;
        if (p.x > width + 4) p.x = -4;
        const twinkle = p.a + Math.sin(phase + p.tw * 1000) * 0.15;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(199, 210, 254, ${Math.max(0.05, twinkle)})`;
        ctx!.fill();
      }
      frame = requestAnimationFrame(draw);
    }

    seed();
    if (reduceMotion) {
      draw();
      cancelAnimationFrame(frame);
    } else {
      draw();
    }

    const onResize = () => seed();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}

export function SpaceBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* base radial wash */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-10%,#1e1b4b_0%,transparent_55%)]" />
      {/* faint grid, masked to fade out */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[length:64px_64px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_55%,transparent_100%)]" />
      {/* glow orbs */}
      <div className="animate-pulse-glow absolute -top-40 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[130px]" />
      <div className="animate-pulse-glow absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-fuchsia-600/10 blur-[110px] [animation-delay:2s]" />
      <div className="animate-pulse-glow absolute bottom-0 -left-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-[110px] [animation-delay:4s]" />
      {/* static twinkling stars */}
      <div className="absolute inset-0">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="animate-twinkle absolute rounded-full bg-white"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
      </div>
      {/* drifting particle canvas */}
      <ParticleField />
    </div>
  );
}
