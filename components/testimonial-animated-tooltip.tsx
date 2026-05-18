'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

type TestimonialPerson = {
  id: number;
  name: string;
  designation: string;
  image: string;
};

const people: TestimonialPerson[] = [
  {
    id: 1,
    name: 'Diptanshu',
    designation: 'UI/UX designer',
    image: '/curtus-testimonials/diptanshutsx-pfp.png',
  },
  {
    id: 2,
    name: 'LowkeyDevs',
    designation: 'Platform Dev',
    image: '/curtus-testimonials/lowkeydevs-pfp.png',
  },
  {
    id: 3,
    name: 'Subhraneel',
    designation: 'FullStack and Agentic Engineer',
    image: '/curtus-testimonials/subhraneel-pfp.png',
  },
  {
    id: 4,
    name: 'Vennictus',
    designation: 'Fullstack Dev',
    image: '/curtus-testimonials/vennictus-pfp.png',
  },
  {
    id: 5,
    name: 'Yash',
    designation: 'Design | Film ',
    image: '/curtus-testimonials/yash-pfp.png',
  },
];

export default function TestimonialAnimatedTooltip() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipX, setTooltipX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const avatarRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const setHovered = (index: number | null) => {
    setHoveredIndex(index);
    if (index === null) return;
    const container = containerRef.current;
    const avatar = avatarRefs.current[index];
    if (!container || !avatar) return;
    const containerRect = container.getBoundingClientRect();
    const avatarRect = avatar.getBoundingClientRect();
    const centerX = avatarRect.left - containerRect.left + avatarRect.width / 2;
    setTooltipX(centerX);
  };

  return (
    <section className="w-full max-w-none">
      <div
        ref={containerRef}
        className="group relative flex w-full items-end justify-center overflow-visible"
        onMouseLeave={() => setHovered(null)}
      >
        <AnimatePresence initial={false}>
          {hoveredIndex !== null ? (
            <motion.div
              key={people[hoveredIndex]?.id ?? 'tooltip'}
              initial={{ opacity: 0, y: 6, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.985 }}
              transition={{
                type: 'spring',
                stiffness: 320,
                damping: 24,
                mass: 0.5,
              }}
              className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] z-50 -translate-x-1/2"
              style={{ left: tooltipX }}
            >
              <div className="w-[15.5rem] rounded-xl border border-black/[0.06] bg-[rgba(253,252,250,0.96)] px-3.5 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.07)] backdrop-blur-[6px] ring-1 ring-black/[0.03]">
                <p className="text-[15px] font-semibold leading-tight tracking-tight text-neutral-800">
                  {people[hoveredIndex]?.name}
                </p>
                <p className="mt-0.5 text-[12px] leading-snug text-neutral-500">
                  {people[hoveredIndex]?.designation}
                </p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div
          className="inline-flex rounded-xl border px-3 py-2.5 shadow-[0_6px_26px_rgba(22,25,37,0.045)] backdrop-blur-[6px]"
          style={{
            backgroundColor: 'rgba(237, 233, 226, 0.88)',
            borderColor: 'rgba(0,0,0,0.045)',
          }}
        >
          <div className="flex flex-row items-center">
            {people.map((person, index) => (
              <motion.button
                ref={(el) => {
                  avatarRefs.current[index] = el;
                }}
                key={person.id}
                type="button"
                onMouseEnter={() => setHovered(index)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={`relative h-11 w-11 overflow-hidden rounded-full border border-black/[0.06] bg-neutral-100 shadow-[0_2px_8px_rgba(22,25,37,0.07)] ring-[0.5px] ring-white/90 ${
                  index === 0 ? '' : '-ml-2'
                }`}
                style={{
                  zIndex: hoveredIndex === index ? 40 : people.length - index,
                }}
                aria-label={`${person.name}, ${person.designation}`}
              >
                <span
                  aria-hidden
                  className="block h-full w-full rounded-full bg-cover bg-center bg-no-repeat opacity-[0.94]"
                  style={{ backgroundImage: `url("${person.image}")` }}
                />
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
