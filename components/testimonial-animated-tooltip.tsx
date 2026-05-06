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
    name: 'John Doe',
    designation: 'Software Engineer',
    image:
      'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=3387&q=80',
  },
  {
    id: 2,
    name: 'Robert Johnson',
    designation: 'Product Manager',
    image:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=800&q=60',
  },
  {
    id: 3,
    name: 'Jane Smith',
    designation: 'Data Scientist',
    image:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=60',
  },
  {
    id: 4,
    name: 'Emily Davis',
    designation: 'UX Designer',
    image:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=800&q=60',
  },
  {
    id: 5,
    name: 'Tyler Durden',
    designation: 'Soap Developer',
    image:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=3540&q=80',
  },
  {
    id: 6,
    name: 'Dora',
    designation: 'The Explorer',
    image:
      'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=3534&q=80',
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
    <section className="w-full max-w-none rounded-2xl bg-transparent px-1 py-1">
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
              className="pointer-events-none absolute bottom-[calc(100%+0.45rem)] z-50 -translate-x-1/2 text-white"
              style={{ left: tooltipX }}
            >
              <div className="w-64 rounded-xl border border-white/10 bg-neutral-950/95 px-4 py-3 shadow-[0_8px_20px_rgba(0,0,0,0.34)] backdrop-blur-sm">
                <p className="text-[17px] font-semibold leading-tight text-white">
                  {people[hoveredIndex]?.name}
                </p>
                <p className="mt-1 text-[13px] leading-snug text-white/70">
                  {people[hoveredIndex]?.designation}
                </p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="inline-flex rounded-2xl border border-white/10 bg-neutral-900/68 px-4 py-3 shadow-[0_6px_14px_rgba(0,0,0,0.2)] backdrop-blur-md">
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
                whileHover={{ y: -3, scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className={`relative h-14 w-14 rounded-full border-2 border-white/75 bg-neutral-900 shadow-[0_3px_8px_rgba(0,0,0,0.28)] ${
                  index === 0 ? '' : '-ml-2.5'
                }`}
                style={{
                  zIndex: hoveredIndex === index ? 40 : people.length - index,
                }}
                aria-label={`${person.name}, ${person.designation}`}
              >
                <span
                  aria-hidden
                  className="block h-full w-full rounded-full bg-cover bg-center bg-no-repeat"
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
