'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

type CardArt = {
  src: string;
  objectPosition: string;
  offsetX: string;
  offsetY: string;
  scale: number;
  rotate: string;
};

/** Per-card: blend SVG into substrate + ambient hue (no framed “picture box”). */
type ArtIntegration = {
  blendMode: NonNullable<React.CSSProperties['mixBlendMode']>;
  opacity: number;
  /** CSS filter — pulls neutrals toward each card’s personality */
  filter: string;
  /** Alpha mask only on the illustration (soft dissolve into type area) */
  maskImage: string;
};

type LandingCard = {
  title: string;
  description: string;
  surface: string;
  tone: 'light' | 'dark';
  art: CardArt;
  integration: ArtIntegration;
  config: {
    y: number;
    x: number;
    zIndex: number;
    rotate: number;
  };
};

const CARD_WIDTH = 236;
const CARD_HEIGHT = 302;
const ACTIVE_CARD_WIDTH = 292;
const ACTIVE_CARD_HEIGHT = 374;
const ACTIVE_CARD_Y = 34;

/** Bottom fade is an alpha mask on the graphic only — not a card-face gradient wash. */
function artMask(artFadeEnd: string): string {
  return `linear-gradient(to bottom, black 0%, black 42%, transparent ${artFadeEnd})`;
}

const CARDS: LandingCard[] = [
  {
    title: 'Focus sessions',
    description: 'Structured focus environments.',
    surface: 'bg-orange-400 text-black',
    tone: 'light',
    integration: {
      blendMode: 'multiply',
      opacity: 0.93,
      filter: 'saturate(1.45) brightness(1.06) contrast(1.02)',
      maskImage: artMask('88%'),
    },
    art: {
      src: '/svg-codes/card-one.svg',
      objectPosition: '50% 72%',
      offsetX: '-2%',
      offsetY: '10%',
      scale: 1.22,
      rotate: '-2deg',
    },
    config: { y: 34, x: 22, zIndex: 1, rotate: -14 },
  },
  {
    title: 'Live collaboration',
    description: 'Calm real-time study rooms.',
    surface: 'bg-stone-100 text-black',
    tone: 'light',
    integration: {
      blendMode: 'multiply',
      opacity: 0.88,
      filter: 'saturate(1.15) brightness(1.02) sepia(0.08)',
      maskImage: artMask('86%'),
    },
    art: {
      src: '/svg-codes/card-two.svg',
      objectPosition: '52% 68%',
      offsetX: '6%',
      offsetY: '14%',
      scale: 1.18,
      rotate: '1.4deg',
    },
    config: { y: 66, x: 138, zIndex: 3, rotate: 10 },
  },
  {
    title: 'Watch together',
    description: 'Shared sessions without friction.',
    surface: 'bg-blue-400 text-white',
    tone: 'dark',
    integration: {
      blendMode: 'soft-light',
      opacity: 0.82,
      filter:
        'saturate(1.25) brightness(1.18) contrast(0.92) hue-rotate(-12deg)',
      maskImage: artMask('87%'),
    },
    art: {
      src: '/svg-codes/card-three.svg',
      objectPosition: '48% 70%',
      offsetX: '-4%',
      offsetY: '12%',
      scale: 1.2,
      rotate: '-1deg',
    },
    config: { y: 92, x: 258, zIndex: 5, rotate: -6 },
  },
  {
    title: 'Progress tracking',
    description: 'Quiet visibility into your rhythm.',
    surface: 'bg-violet-400 text-white',
    tone: 'dark',
    integration: {
      blendMode: 'soft-light',
      opacity: 0.8,
      filter:
        'saturate(1.35) brightness(1.14) contrast(0.93) hue-rotate(18deg)',
      maskImage: artMask('85%'),
    },
    art: {
      src: '/svg-codes/card-four.svg',
      objectPosition: '44% 69%',
      offsetX: '5%',
      offsetY: '8%',
      scale: 1.17,
      rotate: '2.2deg',
    },
    config: { y: 46, x: 388, zIndex: 6, rotate: 12 },
  },
  {
    title: 'Systems & planning',
    description: 'Repeatable structure for deep work.',
    surface: 'bg-fuchsia-500 text-black',
    tone: 'light',
    integration: {
      blendMode: 'multiply',
      opacity: 0.9,
      filter: 'saturate(1.5) brightness(1.05) hue-rotate(12deg)',
      maskImage: artMask('87%'),
    },
    art: {
      src: '/svg-codes/card-five.svg',
      objectPosition: '51% 70%',
      offsetX: '0%',
      offsetY: '11%',
      scale: 1.19,
      rotate: '-1.6deg',
    },
    config: { y: 74, x: 500, zIndex: 7, rotate: -8 },
  },
];

export default function LandingCardStack({
  className = '',
}: {
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pendingDeactivateRef = useRef<number | null>(null);
  const justActivatedUntilRef = useRef(0);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setActiveIndex(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const isAnyCardActive = () => activeIndex !== null;
  const isCurrentActive = (index: number) => activeIndex === index;

  const triggerReset = () => {
    if (activeIndex === null) return;
    if (pendingDeactivateRef.current !== null) {
      window.clearTimeout(pendingDeactivateRef.current);
      pendingDeactivateRef.current = null;
    }
    setActiveIndex(null);
    justActivatedUntilRef.current = 0;
  };

  const evaluateActivePointer = (clientX: number, clientY: number) => {
    if (activeIndex === null) return;
    if (Date.now() < justActivatedUntilRef.current) return;
    const activeEl = cardRefs.current[activeIndex];
    if (!activeEl) return;
    const rect = activeEl.getBoundingClientRect();
    const insideActive =
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom;
    if (insideActive) {
      if (pendingDeactivateRef.current !== null) {
        window.clearTimeout(pendingDeactivateRef.current);
        pendingDeactivateRef.current = null;
      }
    } else if (pendingDeactivateRef.current === null) {
      pendingDeactivateRef.current = window.setTimeout(() => {
        pendingDeactivateRef.current = null;
        triggerReset();
      }, 280);
    }
  };

  return (
    <div
      ref={ref}
      className={`relative mx-auto h-[31rem] w-full min-w-0 overflow-hidden rounded-2xl ${className}`}
      onMouseMove={(event) => {
        evaluateActivePointer(event.clientX, event.clientY);
      }}
      onMouseLeave={() => {
        triggerReset();
      }}
      onPointerLeave={() => {
        triggerReset();
      }}
    >
      {CARDS.map((card, index) => {
        const active = isCurrentActive(index);
        const art = card.art;
        const dark = card.tone === 'dark';
        const int = card.integration;
        const scaleArt = active ? Math.min(art.scale + 0.06, 1.34) : art.scale;

        return (
          <motion.div key={card.title}>
            <motion.button
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              type="button"
              onPointerEnter={() => {
                if (activeIndex !== null) return;
                if (pendingDeactivateRef.current !== null) {
                  window.clearTimeout(pendingDeactivateRef.current);
                  pendingDeactivateRef.current = null;
                }
                setActiveIndex(index);
                justActivatedUntilRef.current = Date.now() + 260;
              }}
              onFocus={() => {
                if (activeIndex !== null) return;
                setActiveIndex(index);
                justActivatedUntilRef.current = Date.now() + 260;
              }}
              onClick={() => {
                setActiveIndex(index);
                justActivatedUntilRef.current = Date.now() + 260;
              }}
              initial={{
                y: 400,
                x: 0,
                scale: 0,
                filter: 'blur(10px)',
              }}
              animate={{
                y: active
                  ? ACTIVE_CARD_Y
                  : isAnyCardActive()
                    ? 460
                    : card.config.y,
                x: active
                  ? 214
                  : isAnyCardActive()
                    ? card.config.x * 0.56 + 136
                    : card.config.x,
                rotate: active
                  ? 0
                  : isAnyCardActive()
                    ? card.config.rotate * 0.42
                    : card.config.rotate,
                scale: active ? 1 : isAnyCardActive() ? 0.68 : 1,
                width: active ? ACTIVE_CARD_WIDTH : CARD_WIDTH,
                height: active ? ACTIVE_CARD_HEIGHT : CARD_HEIGHT,
                filter: 'blur(0px)',
              }}
              whileHover={{
                scale: active ? 1 : isAnyCardActive() ? 0.68 : 1.06,
              }}
              transition={{
                type: 'spring',
                stiffness: 62,
                damping: 18,
                mass: 1.25,
                y: {
                  type: 'spring',
                  stiffness: 44,
                  damping: 23,
                  mass: 1.65,
                },
              }}
              style={{ zIndex: active ? 20 : card.config.zIndex }}
              className={`absolute inset-0 flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-black/15 p-0 text-left shadow-[0_8px_26px_rgba(22,25,37,0.16),0_2px_0_rgba(22,25,37,0.05)] will-change-transform ${card.surface}`}
            >
              {/* Graphic printed into the substrate — full bleed, masked fade into copy only */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl"
                style={{
                  WebkitMaskImage: int.maskImage,
                  maskImage: int.maskImage,
                  WebkitMaskSize: '100% 100%',
                  maskSize: '100% 100%',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                }}
              >
                <div
                  className="absolute left-1/2 top-[58%] h-[135%] w-[118%] max-w-none"
                  style={{
                    transform: `translate(calc(-50% + ${art.offsetX}), calc(-50% + ${art.offsetY})) scale(${scaleArt}) rotate(${art.rotate})`,
                    transformOrigin: '50% 55%',
                    mixBlendMode: int.blendMode,
                    opacity: int.opacity,
                    filter: int.filter,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={art.src}
                    alt=""
                    decoding="async"
                    draggable={false}
                    className="h-full w-full select-none object-cover [image-rendering:auto]"
                    style={{ objectPosition: art.objectPosition }}
                  />
                </div>
              </div>

              {/* ~40% type band — sits on pure surface; art tails off above via mask only */}
              <div
                className={`relative z-[1] mt-auto flex min-h-[38%] flex-col justify-end gap-1 px-4 pb-4 pt-2 ${
                  dark ? '[text-shadow:0_1px_14px_rgba(0,0,0,0.35)]' : ''
                }`}
              >
                <motion.h2
                  className={`max-w-[13.5rem] text-left font-bold tracking-tight antialiased ${
                    dark ? 'text-white' : 'text-black'
                  } ${active ? 'text-[1.08rem] leading-snug' : 'text-[0.98rem] leading-snug'}`}
                >
                  {card.title}
                </motion.h2>
                <p
                  className={`max-w-[15rem] text-left text-[11px] font-medium leading-relaxed antialiased ${
                    dark ? 'text-white/88' : 'text-black/76'
                  } ${active ? 'line-clamp-none' : 'line-clamp-2'}`}
                >
                  {card.description}
                </p>
              </div>
            </motion.button>
          </motion.div>
        );
      })}
    </div>
  );
}
