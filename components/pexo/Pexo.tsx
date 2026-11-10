"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MOODS, type MouthShape, type PexoAccessory, type PexoProp, type PexoSize } from "@/components/pexo/moods";
import type { PexoMood } from "@/lib/pexo/engine";
import { motionMode } from "@/lib/motion/tokens";

/**
 * Pexo: the orange dot of the Prepex logo, alive. One inline SVG drawn in code (guide, section 2): a soft body in the logo
 * orange, two big eyes that blink and follow the pointer, brows, mouth, cheeks, two stubby arms, props and accessories.
 *
 * Motion is CSS on a few transforms, so it costs no React render. Blink, look-around and pointer-follow exist only in
 * full motion: lite and reduced motion get a static expression swap. Nothing here polls or fetches.
 */

const INK = "#1A1A2E";
const ORANGE = "var(--cta)";
/** The arms are the body colour, a shade deeper, so they read against the body they rest on. */
const ARM = "color-mix(in srgb, var(--cta) 80%, #000)";
const LID = "color-mix(in srgb, var(--cta) 88%, #000)";

// ---- the pointer: one passive listener for every Pexo on the page, applied in an animation frame ------------------

const followers = new Set<SVGSVGElement>();
let pointer: { x: number; y: number } | null = null;
let frame = 0;

function applyPointer() {
  frame = 0;
  if (!pointer) return;
  for (const svg of followers) {
    const r = svg.getBoundingClientRect();
    if (r.width === 0) continue;
    const dx = pointer.x - (r.left + r.width / 2);
    const dy = pointer.y - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, d / 160) * 3; // at most 3 units of travel
    svg.style.setProperty("--pexo-px", `${((dx / d) * reach).toFixed(2)}px`);
    svg.style.setProperty("--pexo-py", `${((dy / d) * reach).toFixed(2)}px`);
  }
}
function onPointer(e: PointerEvent) {
  pointer = { x: e.clientX, y: e.clientY };
  if (!frame) frame = requestAnimationFrame(applyPointer);
}
function follow(svg: SVGSVGElement): () => void {
  if (followers.size === 0) {
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
  }
  followers.add(svg);
  return () => {
    followers.delete(svg);
    if (followers.size === 0) {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
    }
  };
}

// ---- parts --------------------------------------------------------------------------------------------------------

function Mouth({ shape }: { shape: MouthShape }) {
  const stroke = { fill: "none", stroke: INK, strokeWidth: 3.2, strokeLinecap: "round" as const };
  switch (shape) {
    case "wide":
      return <path d="M48 80 Q60 93 72 80" {...stroke} />;
    case "open":
      return <path d="M49 79 Q60 96 71 79 Z" fill={INK} stroke={INK} strokeWidth={2} strokeLinejoin="round" />;
    case "o":
      return <circle cx={60} cy={84} r={3.6} fill={INK} />;
    case "side":
      return <path d="M54 84 L67 81" {...stroke} />;
    case "flat":
      return <path d="M54 83 L66 83" {...stroke} />;
    case "small":
      return <path d="M54 81 Q60 86 66 81" {...stroke} />;
    case "yawn":
      return <ellipse cx={60} cy={85} rx={4.2} ry={5.4} fill={INK} />;
    default:
      return <path d="M51 80 Q60 90 69 80" {...stroke} />;
  }
}

function Eye({ cx, clip, lid, lowerLid, pupil, sparkle, blink }: { cx: number; clip: string; lid: number; lowerLid: number; pupil: [number, number]; sparkle: boolean; blink: boolean }) {
  const cy = 58;
  const upper = blink ? 1 : lid;
  return (
    <>
      <clipPath id={clip}>
        <ellipse cx={cx} cy={cy} rx={9.6} ry={11} />
      </clipPath>
      {/* everything is clipped to the eye, so a lid that is "open" simply sits outside it */}
      <g clipPath={`url(#${clip})`}>
        <ellipse cx={cx} cy={cy} rx={9.6} ry={11} fill="#FFFFFF" />
        <g data-part="pupil" style={{ transform: `translate(calc(var(--pexo-px, 0px) + ${pupil[0]}px), calc(var(--pexo-py, 0px) + ${pupil[1]}px))` }}>
          <circle cx={cx} cy={cy} r={4.8} fill={INK} />
          <circle cx={cx - 1.6} cy={cy - 2} r={1.6} fill="#FFFFFF" />
          {sparkle && <circle cx={cx + 2} cy={cy + 1.6} r={0.9} fill="#FFFFFF" />}
        </g>
        <g data-part="lid" style={{ transform: `translateY(${-(1 - upper) * 24}px)` }}>
          <rect x={cx - 11} y={cy - 12} width={22} height={24} fill={LID} />
          {/* the lash line: hidden above the eye when open, the edge of a half-closed lid, a closed eye when shut */}
          <path d={`M${cx - 10} ${cy + 9.5} Q${cx} ${cy + 12.5} ${cx + 10} ${cy + 9.5}`} fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        </g>
        <rect data-part="lid" x={cx - 11} y={cy - 12} width={22} height={24} fill={LID} style={{ transform: `translateY(${(1 - lowerLid) * 24}px)` }} />
      </g>
    </>
  );
}

function Prop({ name }: { name: PexoProp }) {
  switch (name) {
    case "book":
      return (
        <g data-prop="book">
          <path d="M40 101 L60 97 L80 101 L80 111 L60 107 L40 111 Z" fill="var(--surface)" stroke="var(--brand)" strokeWidth={2} strokeLinejoin="round" />
          <path d="M60 97 L60 107" stroke="var(--brand)" strokeWidth={2} />
        </g>
      );
    case "lamp":
      return (
        <g data-prop="lamp">
          <path d="M104 112 L104 92 L96 84" fill="none" stroke="var(--brand)" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M88 80 L100 80 L104 90 L84 90 Z" fill="var(--saffron)" stroke="var(--brand)" strokeWidth={1.6} strokeLinejoin="round" />
          <path d="M98 112 L110 112" stroke="var(--brand)" strokeWidth={2.6} strokeLinecap="round" />
        </g>
      );
    case "flag":
      return (
        <g data-prop="flag">
          <path d="M104 66 L104 20" stroke="var(--brand)" strokeWidth={2.6} strokeLinecap="round" />
          <path d="M104 21 L118 26 L104 32 Z" fill="var(--success)" stroke="var(--brand)" strokeWidth={1.4} strokeLinejoin="round" />
        </g>
      );
    case "hammer":
      return (
        <g data-prop="hammer">
          <path d="M103 66 L109 30" stroke="var(--brand)" strokeWidth={3} strokeLinecap="round" />
          <rect x={99} y={20} width={20} height={11} rx={2.5} fill="var(--muted)" stroke="var(--brand)" strokeWidth={1.4} transform="rotate(9 109 26)" />
        </g>
      );
    case "gem":
      return (
        <g data-prop="gem">
          <path d="M8 96 L14 88 L24 88 L30 96 L19 110 Z" fill="var(--info)" stroke="var(--brand)" strokeWidth={1.6} strokeLinejoin="round" />
          <path d="M8 96 L30 96 M14 88 L19 96 L24 88 M19 96 L19 110" fill="none" stroke="var(--brand)" strokeWidth={1} />
        </g>
      );
    case "nightcap":
      return (
        <g data-prop="nightcap">
          <path d="M30 40 Q58 6 92 36 Q104 22 110 34 Q96 30 90 46 Q60 22 30 40 Z" fill="var(--brand)" />
          <circle cx={111} cy={36} r={5} fill="#FFFFFF" stroke="var(--brand)" strokeWidth={1.2} />
        </g>
      );
    default:
      return (
        <g data-prop="popper">
          <path d="M6 70 L22 52 L28 60 Z" fill="var(--saffron)" stroke="var(--brand)" strokeWidth={1.4} strokeLinejoin="round" />
          <circle cx={30} cy={40} r={2.2} fill="var(--success)" />
          <circle cx={18} cy={34} r={1.8} fill="var(--info)" />
          <circle cx={38} cy={30} r={1.8} fill="var(--saffron)" />
          <path d="M26 46 L30 50 M12 42 L16 46" stroke="var(--brand)" strokeWidth={1.6} strokeLinecap="round" />
        </g>
      );
  }
}

function Accessory({ name }: { name: PexoAccessory }) {
  if (name === "cap")
    return (
      <g data-accessory="cap">
        <path d="M30 42 Q60 10 90 42 Z" fill="var(--brand)" />
        <path d="M84 40 Q104 38 108 46 L86 46 Z" fill="var(--brand)" />
      </g>
    );
  if (name === "scarf")
    return (
      <g data-accessory="scarf">
        <path d="M27 86 Q60 104 93 86 L93 94 Q60 112 27 94 Z" fill="var(--success)" stroke="var(--brand)" strokeWidth={1.2} strokeLinejoin="round" />
        <path d="M80 98 L84 114 L92 112 L90 96 Z" fill="var(--success)" stroke="var(--brand)" strokeWidth={1.2} strokeLinejoin="round" />
      </g>
    );
  return (
    <g data-accessory="headphones">
      <path d="M22 64 Q22 22 60 22 Q98 22 98 64" fill="none" stroke="var(--brand)" strokeWidth={4} strokeLinecap="round" />
      <rect x={14} y={56} width={11} height={20} rx={5} fill="var(--brand)" />
      <rect x={95} y={56} width={11} height={20} rx={5} fill="var(--brand)" />
    </g>
  );
}

// ---- Pexo ---------------------------------------------------------------------------------------------------------

export type PexoTap = "tap" | "poke3";

type Props = {
  mood?: PexoMood;
  size?: PexoSize;
  /** A prop (or several) to hold instead of the mood's own. `false` holds nothing. */
  prop?: PexoProp | PexoProp[] | false;
  accessory?: PexoAccessory | null;
  /** The mouth moves for a moment, as if saying the bubble next to it. */
  speaking?: boolean;
  /** Tappable: a tap waves, three quick taps giggle. The parent decides what Pexo says. */
  onTap?: (kind: PexoTap) => void;
  /** Only the slow breathing loop (the focus desk): no blink, no look-around, no pointer-follow. */
  subtle?: boolean;
  className?: string;
};

const TRIPLE_TAP_MS = 900;

export function Pexo({ mood = "happy", size = 48, prop, accessory = null, speaking = false, onTap, subtle = false, className = "" }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const [blink, setBlink] = useState(false);
  const [glance, setGlance] = useState<[number, number] | null>(null);
  const [gesture, setGesture] = useState<"wave" | "giggle" | null>(null);
  const taps = useRef<number[]>([]);
  const tiny = size === 24;
  const uid = useId();

  // alive: blink every 3 to 6 s, look around every 10 to 20 s, follow the pointer. Full motion only.
  useEffect(() => {
    if (tiny || subtle || motionMode() !== "full") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
    const blinkLoop = () =>
      later(() => {
        setBlink(true);
        later(() => setBlink(false), 130);
        blinkLoop();
      }, 3000 + Math.random() * 3000);
    const lookLoop = () =>
      later(() => {
        setGlance([Math.random() < 0.5 ? -3 : 3, Math.random() < 0.5 ? -1.5 : 1]);
        later(() => setGlance(null), 1300);
        lookLoop();
      }, 10_000 + Math.random() * 10_000);
    blinkLoop();
    lookLoop();
    const stop = svg.current ? follow(svg.current) : () => undefined;
    return () => {
      timers.forEach(clearTimeout);
      stop();
    };
  }, [tiny, subtle]);

  useEffect(() => {
    if (!gesture) return;
    const t = setTimeout(() => setGesture(null), 1200);
    return () => clearTimeout(t);
  }, [gesture]);

  function tap() {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < TRIPLE_TAP_MS), now];
    if (taps.current.length >= 3) {
      taps.current = [];
      setGesture("giggle");
      onTap?.("poke3");
    } else if (taps.current.length === 1) {
      setGesture("wave");
      onTap?.("tap");
    }
  }

  const spec = MOODS[gesture === "wave" ? "waving" : mood];
  const pupil = glance ?? spec.pupil;
  const props = prop === false ? [] : prop === undefined ? spec.props : Array.isArray(prop) ? prop : [prop];
  const desk = props.includes("book") && props.includes("lamp");
  const motion = gesture === "giggle" ? "pexo-wiggle" : subtle ? "pexo-breathe-slow" : spec.motion;
  const waving = gesture === "wave" || mood === "waving";

  const art = (
    <svg
      ref={svg}
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`pexo block shrink-0 overflow-visible ${onTap ? "" : className}`}
      data-testid="pexo"
      data-mood={mood}
      data-size={size}
      {...(onTap ? { "aria-hidden": true } : { role: "img", "aria-label": "Pexo" })}
    >
      {desk && !tiny && <path d="M4 112 L116 112" stroke="var(--brand)" strokeWidth={3} strokeLinecap="round" data-part="desk" />}
      <g className={motion} data-part="body" style={{ transformOrigin: motion === "pexo-jump" ? "60px 66px" : "60px 106px" }}>
        <g data-part="lean" style={{ transform: `rotate(${spec.tilt}deg)`, transformOrigin: "60px 100px" }}>
          <circle cx={60} cy={66} r={40} fill={ORANGE} />
          <ellipse cx={46} cy={42} rx={14} ry={7} fill="#FFFFFF" opacity={0.16} transform="rotate(-24 46 42)" />
          {!tiny && (
            <>
              <path data-part="arm" d="M27 74 L27 90" stroke={ARM} strokeWidth={9} strokeLinecap="round" style={{ transform: `rotate(${spec.armL}deg)`, transformOrigin: "27px 74px" }} />
              <path data-part="arm" className={waving ? "pexo-wave" : undefined} d="M93 74 L93 90" stroke={ARM} strokeWidth={9} strokeLinecap="round" style={{ transform: `rotate(${-spec.armR}deg)`, transformOrigin: "93px 74px" }} />
            </>
          )}
          {accessory === "scarf" && !tiny && <Accessory name="scarf" />}
          {spec.cheeks && !tiny && (
            <g data-part="cheeks">
              <circle cx={35} cy={73} r={5.5} fill="#FFFFFF" opacity={0.3} />
              <circle cx={85} cy={73} r={5.5} fill="#FFFFFF" opacity={0.3} />
            </g>
          )}
          <Eye cx={46} clip={`${uid}-l`} lid={spec.lid} lowerLid={spec.lowerLid} pupil={pupil} sparkle={spec.sparkle} blink={blink} />
          <Eye cx={74} clip={`${uid}-r`} lid={spec.lid} lowerLid={spec.lowerLid} pupil={pupil} sparkle={spec.sparkle} blink={blink} />
          {!tiny && (
            <g data-part="brows" stroke={INK} strokeWidth={3} strokeLinecap="round">
              <path data-part="brow" d="M39 42 L52 42" style={{ transform: `translateY(${spec.browL[0]}px) rotate(${spec.browL[1]}deg)`, transformOrigin: "46px 42px" }} />
              <path data-part="brow" d="M68 42 L81 42" style={{ transform: `translateY(${spec.browR[0]}px) rotate(${spec.browR[1]}deg)`, transformOrigin: "74px 42px" }} />
            </g>
          )}
          <g data-part="mouth" data-mouth={spec.mouth} className={speaking ? "pexo-talk" : undefined} style={{ transformOrigin: "60px 84px" }}>
            <Mouth shape={spec.mouth} />
          </g>
          {accessory && accessory !== "scarf" && !tiny && <Accessory name={accessory} />}
        </g>
      </g>
      {!tiny && props.map((p) => <Prop key={p} name={p} />)}
    </svg>
  );

  if (!onTap) return art;
  return (
    <button type="button" onClick={tap} aria-label="Pexo" data-testid="pexo-button" className={`inline-flex shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand ${className}`}>
      {art}
    </button>
  );
}
