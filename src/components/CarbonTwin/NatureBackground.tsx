import { motion } from 'framer-motion';
import { useState } from 'react';

// Leaf SVG
const LeafIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 21C12 21 4 15 4 8C4 3 8 2 12 2C16 2 20 3 20 8C20 15 12 21 12 21Z" fill="currentColor"/>
    <path d="M12 21V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Sparkle SVG
const SparkleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </svg>
);

// Bird SVG
const BirdIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 7h.01" />
    <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" />
    <path d="m20 7 2 .5-2 .5" />
    <path d="M10 18v3" />
    <path d="M14 17.75V21" />
    <path d="M7 18a6 6 0 0 0 3.84-10.61" />
  </svg>
);

export function NatureBackground() {
  const [elements] = useState(() => {
    const leaves = Array.from({ length: 12 }).map((_, i) => ({
      id: `leaf-${i}`,
      type: 'leaf',
      x: Math.random() * 100,
      y: -10,
      duration: 12 + Math.random() * 15,
      delay: Math.random() * 10,
      scale: 0.5 + Math.random() * 0.8,
      rotation: Math.random() * 360,
    }));
    
    const birds = Array.from({ length: 3 }).map((_, i) => ({
      id: `bird-${i}`,
      type: 'bird',
      x: -10,
      y: 10 + Math.random() * 40,
      duration: 20 + Math.random() * 10,
      delay: Math.random() * 15,
      scale: 0.4 + Math.random() * 0.4,
      rotation: -10 + Math.random() * 20,
    }));

    const sparkles = Array.from({ length: 6 }).map((_, i) => ({
      id: `sparkle-${i}`,
      type: 'sparkle',
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 5,
      scale: 0.3 + Math.random() * 0.5,
      rotation: 0,
    }));

    return [...leaves, ...birds, ...sparkles];
  });

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Paradise Sun Glow */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-amber-300/30 rounded-full blur-3xl" />
      <div className="absolute top-[20%] left-[-10%] w-72 h-72 bg-pink-300/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[10%] w-80 h-80 bg-teal-300/20 rounded-full blur-3xl" />

      {/* Wind Streams */}
      <motion.div
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="absolute top-1/4 left-0 w-[200%] h-32 opacity-20"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
          filter: 'blur(20px)'
        }}
      />

      {/* Animated Elements */}
      {elements.map((el) => {
        if (el.type === 'leaf') {
          return (
            <motion.div
              key={el.id}
              initial={{ top: '-10%', left: `${el.x}%`, rotate: el.rotation, opacity: 0 }}
              animate={{
                top: '110%',
                left: [`${el.x}%`, `${el.x + 10}%`, `${el.x - 5}%`, `${el.x + 5}%`],
                rotate: el.rotation + 360,
                opacity: [0, 0.8, 0.8, 0]
              }}
              transition={{
                duration: el.duration,
                repeat: Infinity,
                delay: el.delay,
                ease: 'linear',
                times: [0, 0.2, 0.8, 1]
              }}
              className="absolute text-emerald-600/40"
              style={{ transform: `scale(${el.scale})` }}
            >
              <LeafIcon className="w-6 h-6" />
            </motion.div>
          );
        }
        
        if (el.type === 'bird') {
          return (
            <motion.div
              key={el.id}
              initial={{ top: `${el.y}%`, left: '-10%', rotate: el.rotation, opacity: 0 }}
              animate={{
                left: '110%',
                top: [`${el.y}%`, `${el.y - 5}%`, `${el.y + 5}%`, `${el.y}%`],
                opacity: [0, 0.6, 0.6, 0]
              }}
              transition={{
                duration: el.duration,
                repeat: Infinity,
                delay: el.delay,
                ease: 'linear',
                times: [0, 0.1, 0.9, 1]
              }}
              className="absolute text-teal-800/40"
              style={{ transform: `scale(${el.scale})` }}
            >
              <BirdIcon className="w-8 h-8" />
            </motion.div>
          );
        }

        if (el.type === 'sparkle') {
          return (
            <motion.div
              key={el.id}
              initial={{ top: `${el.y}%`, left: `${el.x}%`, scale: 0, opacity: 0 }}
              animate={{
                scale: [0, el.scale, 0],
                opacity: [0, 0.7, 0],
                rotate: [0, 90, 180]
              }}
              transition={{
                duration: el.duration,
                repeat: Infinity,
                delay: el.delay,
                ease: 'easeInOut'
              }}
              className="absolute text-amber-400/60"
            >
              <SparkleIcon className="w-5 h-5" />
            </motion.div>
          );
        }

        return null;
      })}
    </div>
  );
}
