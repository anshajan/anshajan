"use client";

import { useEffect, useRef, useState } from "react";

const CYCLE_MS = 9000;
const PROMPT = "Minimalist luxury gym poster, opening soon";
const PALETTE = ["#FF5A3C", "#15181F", "#F4C95D", "#2A9D8F"];

/**
 * Canvas-drawn product tour: typing the prompt -> pulse to Pinterest ->
 * 4 trending cards -> color/type scan -> poster pops out with a Download
 * button. This runs even with zero external assets (no .mp4 required),
 * satisfying the "always show a working demo" requirement. If a real
 * demo video is later dropped at public/demo.mp4, it takes priority and
 * this canvas becomes the fallback (see the onError handler below).
 */
export default function HeroDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.scale(dpr, dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    function roundRect(x: number, y: number, w: number, h: number, r: number) {
      ctx!.beginPath();
      ctx!.moveTo(x + r, y);
      ctx!.arcTo(x + w, y, x + w, y + h, r);
      ctx!.arcTo(x + w, y + h, x, y + h, r);
      ctx!.arcTo(x, y + h, x, y, r);
      ctx!.arcTo(x, y, x + w, y, r);
      ctx!.closePath();
    }

    function ease(t: number) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function draw(tMs: number) {
      const t = tMs % CYCLE_MS;
      ctx!.clearRect(0, 0, width, height);

      // backdrop
      ctx!.fillStyle = "#0d0f14";
      roundRect(0, 0, width, height, 20);
      ctx!.fill();

      const padX = width * 0.06;
      const barY = height * 0.1;
      const barH = height * 0.09;
      const barW = width - padX * 2;

      // search bar
      ctx!.fillStyle = "#1e222b";
      roundRect(padX, barY, barW, barH, barH / 2);
      ctx!.fill();
      ctx!.strokeStyle = "rgba(255,255,255,0.08)";
      ctx!.stroke();

      // typing phase: 0 - 2200ms
      const typeDuration = 2200;
      const charCount = Math.min(PROMPT.length, Math.floor((Math.min(t, typeDuration) / typeDuration) * PROMPT.length));
      ctx!.fillStyle = "#f5f3ef";
      ctx!.font = `${Math.max(12, barH * 0.32)}px Inter, sans-serif`;
      ctx!.textBaseline = "middle";
      const caretX = padX + 24 + ctx!.measureText(PROMPT.slice(0, charCount)).width;
      ctx!.fillText(PROMPT.slice(0, charCount), padX + 24, barY + barH / 2);
      if (t < typeDuration && Math.floor(t / 300) % 2 === 0) {
        ctx!.fillRect(caretX + 2, barY + barH * 0.25, 2, barH * 0.5);
      }

      // pulse connecting line: 2200 - 3600ms
      const pulseStart = 2200;
      const pulseEnd = 3600;
      const cardsY = barY + barH + height * 0.08;
      const cardW = (barW - 3 * (width * 0.025)) / 4;
      const cardH = height * 0.32;
      const gap = width * 0.025;

      if (t > pulseStart) {
        const pulseT = Math.min(1, (t - pulseStart) / (pulseEnd - pulseStart));
        ctx!.strokeStyle = `rgba(255,90,60,${0.8 * (1 - pulseT * 0.3)})`;
        ctx!.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const cx = padX + i * (cardW + gap) + cardW / 2;
          ctx!.beginPath();
          ctx!.moveTo(padX + barW / 2, barY + barH);
          ctx!.quadraticCurveTo(cx, barY + barH + 20, cx, cardsY);
          ctx!.globalAlpha = Math.max(0, 1 - pulseT);
          ctx!.stroke();
          ctx!.globalAlpha = 1;
        }
      }

      // 4 pinterest cards fade/scale in: 2600 - 4400ms
      const cardsStart = 2600;
      const cardsEnd = 4400;
      const cardsT = ease(Math.max(0, Math.min(1, (t - cardsStart) / (cardsEnd - cardsStart))));

      // style-scan sweep: 4400 - 6200ms
      const scanStart = 4400;
      const scanEnd = 6200;
      const scanActive = t > scanStart && t < scanEnd + 400;
      const scanT = Math.max(0, Math.min(1, (t - scanStart) / (scanEnd - scanStart)));

      if (cardsT > 0) {
        for (let i = 0; i < 4; i++) {
          const x = padX + i * (cardW + gap);
          const scale = 0.85 + 0.15 * cardsT;
          const alpha = cardsT;
          const cx = x + cardW / 2;
          const cy = cardsY + cardH / 2;

          ctx!.save();
          ctx!.globalAlpha = alpha;
          ctx!.translate(cx, cy);
          ctx!.scale(scale, scale);
          ctx!.translate(-cx, -cy);

          ctx!.fillStyle = "#1e222b";
          roundRect(x, cardsY, cardW, cardH, 12);
          ctx!.fill();

          ctx!.fillStyle = PALETTE[i % PALETTE.length];
          roundRect(x + 8, cardsY + 8, cardW - 16, cardH * 0.62, 8);
          ctx!.globalAlpha = alpha * 0.85;
          ctx!.fill();
          ctx!.globalAlpha = alpha;

          ctx!.fillStyle = "rgba(255,255,255,0.75)";
          roundRect(x + 10, cardsY + cardH * 0.74, cardW * 0.6, 6, 3);
          ctx!.fill();
          ctx!.fillStyle = "rgba(255,255,255,0.4)";
          roundRect(x + 10, cardsY + cardH * 0.86, cardW * 0.4, 5, 3);
          ctx!.fill();

          if (scanActive) {
            const sweepY = cardsY + cardH * scanT;
            const grad = ctx!.createLinearGradient(x, sweepY - 14, x, sweepY + 14);
            grad.addColorStop(0, "rgba(255,255,255,0)");
            grad.addColorStop(0.5, "rgba(255,255,255,0.35)");
            grad.addColorStop(1, "rgba(255,255,255,0)");
            ctx!.fillStyle = grad;
            ctx!.fillRect(x, sweepY - 14, cardW, 28);
          }

          ctx!.restore();
        }
      }

      // extracted palette swatches appear during/after scan: 5200 - 6600ms
      const swatchStart = 5200;
      const swatchT = ease(Math.max(0, Math.min(1, (t - swatchStart) / 800)));
      if (swatchT > 0) {
        const swY = cardsY + cardH + height * 0.045;
        PALETTE.forEach((color, i) => {
          ctx!.globalAlpha = swatchT;
          ctx!.fillStyle = color;
          ctx!.beginPath();
          ctx!.arc(padX + 14 + i * 28, swY, 9 * swatchT, 0, Math.PI * 2);
          ctx!.fill();
        });
        ctx!.globalAlpha = 1;
      }

      // final poster pop + Download HD button: 6600 - 9000ms
      const posterStart = 6600;
      const posterT = ease(Math.max(0, Math.min(1, (t - posterStart) / 1200)));
      if (posterT > 0) {
        ctx!.globalAlpha = 1;
        ctx!.fillStyle = "rgba(7,8,11,0.82)";
        roundRect(0, 0, width, height, 20);
        ctx!.fill();

        const posterW = width * 0.34 * (0.9 + 0.1 * posterT);
        const posterH = height * 0.72 * (0.9 + 0.1 * posterT);
        const px = width / 2 - posterW / 2;
        const py = height / 2 - posterH / 2 - height * 0.03;

        ctx!.save();
        ctx!.globalAlpha = posterT;
        ctx!.fillStyle = "#15181f";
        roundRect(px, py, posterW, posterH, 16);
        ctx!.fill();

        const g = ctx!.createLinearGradient(px, py, px, py + posterH);
        g.addColorStop(0, PALETTE[0]);
        g.addColorStop(1, PALETTE[3]);
        ctx!.fillStyle = g;
        roundRect(px + 10, py + 10, posterW - 20, posterH * 0.68, 10);
        ctx!.fill();

        ctx!.fillStyle = "#ffffff";
        ctx!.font = `700 ${posterW * 0.14}px Bricolage Grotesque, sans-serif`;
        ctx!.textAlign = "center";
        ctx!.fillText("OPENING", px + posterW / 2, py + posterH * 0.3);
        ctx!.fillText("SOON", px + posterW / 2, py + posterH * 0.42);
        ctx!.textAlign = "left";

        if (posterT > 0.6) {
          const btnAlpha = ease(Math.min(1, (posterT - 0.6) / 0.4));
          const btnW = posterW * 0.74;
          const btnH = posterH * 0.09;
          const bx = px + posterW / 2 - btnW / 2;
          const by = py + posterH + 16;
          ctx!.globalAlpha = btnAlpha;
          ctx!.fillStyle = "#ff5a3c";
          roundRect(bx, by, btnW, btnH, btnH / 2);
          ctx!.fill();
          ctx!.fillStyle = "#ffffff";
          ctx!.font = `600 ${btnH * 0.42}px Inter, sans-serif`;
          ctx!.textAlign = "center";
          ctx!.fillText("Download HD", bx + btnW / 2, by + btnH / 2 + 1);
          ctx!.textAlign = "left";
        }
        ctx!.restore();
      }
    }

    let start = performance.now();
    function loop(now: number) {
      draw(now - start);
      if (!reducedMotion) {
        raf = requestAnimationFrame(loop);
      }
    }

    if (reducedMotion) {
      draw(posterHoldFrame());
    } else {
      raf = requestAnimationFrame(loop);
    }

    function posterHoldFrame() {
      return 7200;
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl glass">
      {!videoFailed && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          onError={() => setVideoFailed(true)}
        >
          <source src="/demo.mp4" type="video/mp4" />
        </video>
      )}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full ${videoFailed ? "" : "opacity-0"}`}
        aria-label="Animated walkthrough of the anshaj poster generation pipeline"
      />
    </div>
  );
}
