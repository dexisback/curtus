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

const CARD_WIDTH = 236;
const CARD_HEIGHT = 302;
const ACTIVE_CARD_WIDTH = 292;
const ACTIVE_CARD_HEIGHT = 374;
const ACTIVE_CARD_Y = 34;

const CARDS: LandingCard[] = [
  {
    title: 'Working Knowledge',
    description:
      'Practical skills and insights gained through hands-on experience that drive real-world problem solving.',
    className: 'bg-orange-400 text-black',
    skeleton: <></>,
    config: { y: 42, x: 36, zIndex: 1, rotate: -12 },
  },
  {
    title: 'Practical Demonstration',
    description:
      'Step-by-step walkthroughs that showcase techniques and implementation clearly.',
    className: 'bg-stone-100 text-black',
    skeleton: <></>,
    config: { y: 58, x: 156, zIndex: 3, rotate: 6 },
  },
  {
    title: 'Collaborate with AI',
    description:
      'You can effectively work alongside AI tools to enhance your workflow.',
    className: 'bg-blue-400 text-white',
    skeleton: <></>,
    config: { y: 82, x: 276, zIndex: 5, rotate: -2 },
  },
  {
    title: 'Means & Methods',
    description:
      'Structured methods and repeatable systems that help you execute with consistency.',
    className: 'bg-violet-400 text-white',
    skeleton: <></>,
    config: { y: 58, x: 396, zIndex: 6, rotate: 9 },
  },
  {
    title: 'Interface Kit',
    description:
      'A comprehensive collection of UI components and patterns to build polished interfaces.',
    className: 'bg-fuchsia-500 text-black',
    skeleton: <></>,
    config: { y: 58, x: 516, zIndex: 7, rotate: -4 },
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
                ? 214
                : isAnyCardActive()
                  ? card.config.x * 0.56 + 136
                  : card.config.x,
              rotate: isCurrentActive(index)
                ? 0
                : isAnyCardActive()
                  ? card.config.rotate * 0.4
                  : card.config.rotate,
              scale: isCurrentActive(index) ? 1 : isAnyCardActive() ? 0.7 : 1,
              width: isCurrentActive(index) ? ACTIVE_CARD_WIDTH : CARD_WIDTH,
              height: isCurrentActive(index) ? ACTIVE_CARD_HEIGHT : CARD_HEIGHT,
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
            style={{ zIndex: isCurrentActive(index) ? 20 : card.config.zIndex }}
            className={`absolute inset-0 flex cursor-pointer flex-col items-start justify-between overflow-hidden rounded-2xl border border-black/10 p-5 shadow-[0_8px_24px_rgba(22,25,37,0.13)] will-change-transform ${card.className}`}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/14 via-white/5 to-transparent" />
            <div className="h-20 w-full rounded-xl bg-black/10" />
            {card.skeleton}
            <div>
              <motion.h2 className="max-w-36 text-left text-[1.8rem] font-bold leading-[1.04]">
                {card.title}
              </motion.h2>
              {isCurrentActive(index) && (
                <motion.p
                  initial={{ opacity: 0, x: 20, y: 20, height: 0 }}
                  animate={{ opacity: 1, x: 0, y: 0, height: 100 }}
                  exit={{ opacity: 0, x: 20, y: 20, height: 0 }}
                  className="mt-2.5 text-left text-[15px] text-black/80"
                >
                  {card.description}
                </motion.p>
              )}
            </div>
          </motion.button>
        </motion.div>
      ))}
    </div>
  );
}
