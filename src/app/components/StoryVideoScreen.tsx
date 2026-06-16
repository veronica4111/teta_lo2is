import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipForward, ChevronLeft } from 'lucide-react';
import { Level } from '../data/levels';

interface StoryVideoScreenProps {
  level: Level;
  onPlay: () => void;
  onBack: () => void;
}

type VideoState = 'playing' | 'paused' | 'ended';

const VIDEO_DURATION = 18; // simulated seconds

function toArabicNumerals(n: number): string {
  return String(Math.round(n)).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

// Distinct palette per level using the level's own color + emoji
const SCENE_BG: Record<string, { from: string; to: string }> = {
  level_1: { from: '#065F46', to: '#34D399' },
  level_2: { from: '#1E3A8A', to: '#60A5FA' },
  level_3: { from: '#92400E', to: '#FBBF24' },
  level_4: { from: '#4C1D95', to: '#A78BFA' },
  level_5: { from: '#831843', to: '#F472B6' },
  level_6: { from: '#78350F', to: '#FCD34D' },
};

export function StoryVideoScreen({ level, onPlay, onBack }: StoryVideoScreenProps) {
  const [videoState, setVideoState] = useState<VideoState>('playing');
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const sceneBg = SCENE_BG[level.id] ?? SCENE_BG['level_1'];

  const clearControlsTimer = () => {
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
  };

  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    clearControlsTimer();
    if (videoState === 'playing') {
      controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, [videoState]);

  useEffect(() => {
    if (videoState === 'playing') {
      controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    } else {
      clearControlsTimer();
      setControlsVisible(true);
    }
    return clearControlsTimer;
  }, [videoState]);

  // Simulated playback tick (real video handled by <video> element via videoRef)
  useEffect(() => {
    if (videoState === 'playing') {
      tickRef.current = setInterval(() => {
        setElapsed((e) => {
          const next = e + 0.25;
          setProgress(Math.min(100, (next / VIDEO_DURATION) * 100));
          if (next >= VIDEO_DURATION) {
            setVideoState('ended');
            if (tickRef.current) clearInterval(tickRef.current);
          }
          return next;
        });
      }, 250);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [videoState]);

  // Wire real <video> element if present
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (videoState === 'playing') vid.play().catch(() => {});
    else if (videoState === 'paused') vid.pause();
  }, [videoState]);

  const togglePlayPause = () => {
    if (videoState === 'ended') return;
    setVideoState((s) => (s === 'playing' ? 'paused' : 'playing'));
  };

  const handleSkip = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    setVideoState('ended');
    setProgress(100);
    setElapsed(VIDEO_DURATION);
    if (videoRef.current) videoRef.current.pause();
  };

  const elapsedLabel = `${toArabicNumerals(Math.floor(elapsed / 60))}:${String(Math.floor(elapsed % 60)).padStart(2, '0').replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])}`;
  const totalLabel   = `${toArabicNumerals(Math.floor(VIDEO_DURATION / 60))}:${String(VIDEO_DURATION % 60).padStart(2, '0').replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])}`;

  return (
    <div
      dir="rtl"
      className="relative w-full h-full overflow-hidden"
      style={{ fontFamily: "'Cairo', sans-serif", background: '#000' }}
      onClick={() => { if (videoState !== 'ended') showControlsTemporarily(); }}
    >
      {/* ── VIDEO ELEMENT (hidden if src 404s; fallback scene shows behind) ── */}
      <video
        ref={videoRef}
        src={level.videoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        onError={() => { /* fail silently — fallback scene is already visible */ }}
        style={{ opacity: 0.001 }} // keep DOM but rely on fallback; set to 1 once real assets exist
      />

      {/* ── FALLBACK ILLUSTRATED SCENE ── */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(160deg, ${sceneBg.from} 0%, ${sceneBg.to} 100%)` }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 select-none pointer-events-none">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            style={{ fontSize: 'clamp(3rem, 12vw, 6rem)' }}
          >
            {level.emoji} 🚗
          </motion.div>
          <p className="text-white/70 text-center px-8" style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)', fontWeight: 700 }}>
            قصة {level.nameAr}
          </p>
          {videoState === 'playing' && (
            <div className="flex gap-1.5 mt-1">
              {[0, 1, 2].map((i) => (
                <motion.div key={i} className="w-2 h-2 rounded-full bg-white/60"
                  animate={{ scale: [1, 1.6, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.25 }} />
              ))}
            </div>
          )}
        </div>
        {/* Gradient overlays for controls readability */}
        <div className="absolute top-0 inset-x-0 h-24 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.55), transparent)' }} />
        <div className="absolute bottom-0 inset-x-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.7), transparent)' }} />
      </div>

      {/* ── TOP BAR ── */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-4 z-20">
        {/* Level name (top-right in RTL = left visual side) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}>
          <span style={{ fontSize: '1.1rem' }}>{level.emoji}</span>
          <span className="text-white" style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.9rem)', fontWeight: 700 }}>{level.nameAr}</span>
        </div>

        {/* Skip button (top-left in RTL = right visual side) */}
        {videoState !== 'ended' && (
          <motion.button
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.5 }}
            onClick={(e) => { e.stopPropagation(); handleSkip(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl transition-all hover:scale-105 active:scale-95"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
          >
            <span className="text-white" style={{ fontSize: 'clamp(0.65rem, 1.5vw, 0.8rem)', fontWeight: 700 }}>تخطي</span>
            <SkipForward size={14} className="text-white" />
          </motion.button>
        )}
      </div>

      {/* ── CENTER PLAY BUTTON (paused state) ── */}
      <AnimatePresence>
        {videoState === 'paused' && (
          <motion.button
            key="center-play"
            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
            className="absolute inset-0 flex items-center justify-center z-30"
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl"
              style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              <Play size={36} fill="#F97316" stroke="none" style={{ marginRight: -3 }} />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── ENDED STATE ── */}
      <AnimatePresence>
        {videoState === 'ended' && (
          <motion.div
            key="ended"
            initial={{ opacity: 0, scale: 0.85, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.15 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-30"
          >
            <motion.div
              animate={{ rotate: [0, -8, 8, -5, 5, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 0.6, delay: 0.2 }}
              style={{ fontSize: 'clamp(3rem, 10vw, 5rem)' }}
            >
              🎬
            </motion.div>
            <p className="text-white text-center" style={{ fontSize: 'clamp(0.85rem, 2.5vw, 1.1rem)', fontWeight: 700, opacity: 0.85 }}>
              شوفت القصة؟ دلوقتي تعالى نلعب!
            </p>
            <motion.button
              whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
              onClick={(e) => { e.stopPropagation(); onPlay(); }}
              className="flex items-center gap-3 px-10 py-4 rounded-3xl shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #F97316, #EF4444)',
                border: '3px solid #FCD34D',
                color: 'white', fontWeight: 900,
                fontSize: 'clamp(1rem, 3vw, 1.4rem)',
                fontFamily: "'Cairo', sans-serif",
                textShadow: '0 2px 6px rgba(0,0,0,0.35)',
                boxShadow: '0 8px 28px rgba(249,115,22,0.55)',
              }}
            >
              <span>يلا نلعب!</span>
              <span style={{ fontSize: '1.4em' }}>🏎️</span>
            </motion.button>
            <button
              onClick={(e) => { e.stopPropagation(); onBack(); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl transition-all hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, fontSize: 'clamp(0.7rem, 1.6vw, 0.85rem)', fontFamily: "'Cairo', sans-serif" }}
            >
              <ChevronLeft size={16} />
              <span>رجوع للمستويات</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BOTTOM CONTROLS BAR ── */}
      <AnimatePresence>
        {controlsVisible && videoState !== 'ended' && (
          <motion.div
            key="controls"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22 }}
            className="absolute bottom-0 inset-x-0 px-4 pb-4 pt-2 z-20 flex flex-col gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress row */}
            <div className="flex items-center gap-3">
              <span className="text-white/80 flex-shrink-0" style={{ fontSize: 'clamp(0.6rem, 1.4vw, 0.75rem)', fontWeight: 700 }}>
                {elapsedLabel}
              </span>
              <div className="flex-1 relative h-3 flex items-center">
                <div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #F97316, #FCD34D)', transition: 'none' }} />
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-lg border-2 border-white"
                  style={{ left: `calc(${progress}% - 8px)`, background: '#F97316' }} />
              </div>
              <span className="text-white/60 flex-shrink-0" style={{ fontSize: 'clamp(0.6rem, 1.4vw, 0.75rem)', fontWeight: 600 }}>
                {totalLabel}
              </span>
            </div>

            {/* Play/Pause button */}
            <div className="flex items-center justify-center">
              <button
                onClick={togglePlayPause}
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-90"
                style={{ background: 'linear-gradient(135deg, #F97316, #EF4444)', border: '3px solid rgba(255,255,255,0.4)' }}
              >
                {videoState === 'playing'
                  ? <Pause size={22} className="text-white" fill="white" />
                  : <Play size={22} className="text-white" fill="white" style={{ marginRight: -2 }} />
                }
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
