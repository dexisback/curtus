'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

type LandingCard = {
  title: string;
  description: string;
  className: string;
  skeleton: React.ReactNode;
  config: {
    y: number;
    x: number;
    zIndex: number;
    rotate: number;
  };
};

const CARD_WIDTH = 180;
const CARD_HEIGHT = 236;
const ACTIVE_CARD_WIDTH = 226;
const ACTIVE_CARD_HEIGHT = 292;
const ACTIVE_CARD_Y = 26;
const STAGE_LEFT = 'clamp(1rem, 4vw, 2.75rem)';
const STAGE_RIGHT = 'clamp(2.5rem, 7vw, 4.75rem)';

const CARDS: LandingCard[] = [
  {
    title: 'Focus sessions',
    description: 'Structured focus environments.',
    className: 'bg-orange-400 text-black',
    skeleton: <></>,
    config: { y: 52, x: 18, zIndex: 1, rotate: -12 },
  },
  {
    title: 'Live collaboration',
    description: 'Calm real-time study rooms.',
    className: 'bg-stone-100 text-black',
    skeleton: <></>,
    config: { y: 60, x: 104, zIndex: 3, rotate: 6 },
  },
  {
    title: 'Watch together',
    description: 'Shared sessions without friction.',
    className: 'bg-blue-400 text-white',
    skeleton: <></>,
    config: { y: 78, x: 188, zIndex: 5, rotate: -2 },
  },
  {
    title: 'Progress tracking',
    description: 'Quiet visibility into your rhythm.',
    className: 'bg-violet-400 text-white',
    skeleton: <></>,
    config: { y: 58, x: 272, zIndex: 6, rotate: 9 },
  },
  {
    title: 'Systems & planning',
    description: 'Repeatable structure for deep work.',
    className: 'bg-fuchsia-500 text-black',
    skeleton: <></>,
    config: { y: 50, x: 342, zIndex: 7, rotate: -4 },
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
      className={`relative mx-auto h-[28rem] w-full min-w-0 overflow-hidden rounded-2xl ${className}`}
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
      <div
        className="absolute inset-y-0"
        style={{ left: STAGE_LEFT, right: STAGE_RIGHT }}
      >
        {CARDS.map((card, index) => (
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
                y: isCurrentActive(index)
                  ? ACTIVE_CARD_Y
                  : isAnyCardActive()
                    ? 460
                    : card.config.y,
                x: isCurrentActive(index)
                  ? 138
                  : isAnyCardActive()
                    ? card.config.x * 0.52 + 104
                    : card.config.x,
                rotate: isCurrentActive(index)
                  ? 0
                  : isAnyCardActive()
                    ? card.config.rotate * 0.4
                    : card.config.rotate,
                scale: isCurrentActive(index) ? 1 : isAnyCardActive() ? 0.7 : 1,
                width: isCurrentActive(index) ? ACTIVE_CARD_WIDTH : CARD_WIDTH,
                height: isCurrentActive(index)
                  ? ACTIVE_CARD_HEIGHT
                  : CARD_HEIGHT,
                filter: 'blur(0px)',
              }}
              whileHover={{
                scale: isCurrentActive(index)
                  ? 1
                  : isAnyCardActive()
                    ? 0.7
                    : 1.05,
              }}
              transition={{
                type: 'spring',
                stiffness: 68,
                damping: 19,
                mass: 1.2,
                y: {
                  type: 'spring',
                  stiffness: 48,
                  damping: 24,
                  mass: 1.6,
                },
              }}
              style={{
                zIndex: isCurrentActive(index) ? 20 : card.config.zIndex,
              }}
              className={`absolute inset-0 flex cursor-pointer flex-col items-start justify-between overflow-hidden rounded-2xl border border-black/10 p-4 shadow-[0_8px_24px_rgba(22,25,37,0.13)] will-change-transform ${card.className}`}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/14 via-white/5 to-transparent" />
              <div className="h-16 w-full rounded-xl bg-black/10" />
              {card.skeleton}
              <div>
                <motion.h2 className="max-w-32 text-left text-[1.55rem] font-bold leading-[1.02] sm:max-w-36 sm:text-[1.7rem]">
                  {card.title}
                </motion.h2>
                {isCurrentActive(index) && (
                  <motion.p
                    initial={{ opacity: 0, x: 20, y: 20, height: 0 }}
                    animate={{ opacity: 1, x: 0, y: 0, height: 100 }}
                    exit={{ opacity: 0, x: 20, y: 20, height: 0 }}
                    className="mt-2 text-left text-[14px] text-black/80"
                  >
                    {card.description}
                  </motion.p>
                )}
              </div>
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
