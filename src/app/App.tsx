import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LevelSelect } from './components/LevelSelect';
import { RaceScreen } from './components/RaceScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { StoryVideoScreen } from './components/StoryVideoScreen';
import { LEVELS } from './data/levels';

type Screen = 'title' | 'levelSelect' | 'story' | 'racing' | 'results';

interface GameResult {
  won: boolean;
  score: number;
  stars: number;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('level_1');
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [levelStars, setLevelStars] = useState<Record<string, number>>({});
  const [raceKey, setRaceKey] = useState(0);

  const UNLOCK_STORAGE_KEY = 'teta_lo2is_unlockedLevelIds_v1';

  const [unlockedLevelIds, setUnlockedLevelIds] = useState<Record<string, boolean>>(() => ({
    level_1: true,
  }));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(UNLOCK_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') return;

      const ids = parsed as { unlockedLevelIds?: string[] };
      const unlocked = Array.isArray(ids.unlockedLevelIds) ? ids.unlockedLevelIds : [];

      const next: Record<string, boolean> = {};
      for (const id of unlocked) {
        if (typeof id === 'string') next[id] = true;
      }
      // Always keep level_1 unlocked for safety.
      next.level_1 = true;
      setUnlockedLevelIds(next);
    } catch {
      // ignore malformed storage
    }
  }, []);

  const unlockedLevelIdsForSelect = useMemo(() => unlockedLevelIds, [unlockedLevelIds]);

  const selectedLevel = LEVELS.find((l) => l.id === selectedLevelId) ?? LEVELS[0];


  const handleSelectLevel = (levelId: string) => {
    setSelectedLevelId(levelId);
    setRaceKey((k) => k + 1);
    setScreen('story');
  };

  const handleGameOver = (result: GameResult) => {
    setGameResult(result);
    if (result.won) {
      setLevelStars((prev) => ({
        ...prev,
        [selectedLevelId]: Math.max(prev[selectedLevelId] ?? 0, result.stars),
      }));

      const currentIndex = LEVELS.findIndex((l) => l.id === selectedLevelId);
      const nextLevel = currentIndex >= 0 ? LEVELS[currentIndex + 1] : undefined;
      if (nextLevel) {
        setUnlockedLevelIds((prev) => {
          const next = { ...prev, [nextLevel.id]: true };
          try {
            localStorage.setItem(
              UNLOCK_STORAGE_KEY,
              JSON.stringify({ unlockedLevelIds: Object.keys(next).filter((id) => next[id]) }),
            );
          } catch {
            // ignore storage write issues
          }
          return next;
        });
      }
    }
    setScreen('results');
  };

  const handleRetry = () => {
    // Retry goes straight to race — no story replay needed
    setRaceKey((k) => k + 1);
    setScreen('racing');
  };

  return (
    <div
      className="w-full h-full relative overflow-hidden"
      style={{ fontFamily: "'Cairo', sans-serif", background: '#1E3A5F' }}
    >
      <AnimatePresence mode="wait">
        {screen === 'title' && (
          <motion.div
            key="title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0"
          >
            <TitleScreen onStart={() => setScreen('levelSelect')} />
          </motion.div>
        )}

        {screen === 'levelSelect' && (
          <motion.div
            key="levelSelect"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <LevelSelect onSelectLevel={handleSelectLevel} levelStars={levelStars} unlockedLevelIds={unlockedLevelIdsForSelect} />
          </motion.div>
        )}

        {screen === 'story' && (
          <motion.div
            key={`story-${selectedLevelId}`}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <StoryVideoScreen
              level={selectedLevel}
              onPlay={() => { setRaceKey((k) => k + 1); setScreen('racing'); }}
              onBack={() => setScreen('levelSelect')}
            />
          </motion.div>
        )}

        {screen === 'racing' && (
          <motion.div
            key={`race-${raceKey}`}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            <RaceScreen
              level={selectedLevel}
              onGameOver={handleGameOver}
              onBack={() => setScreen('levelSelect')}
            />
          </motion.div>
        )}

        {screen === 'results' && gameResult && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0"
          >
            <ResultsScreen
              won={gameResult.won}
              score={gameResult.score}
              stars={gameResult.stars}
              levelName={selectedLevel.nameAr}
              onRetry={handleRetry}
              onBack={() => setScreen('levelSelect')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div
      dir="rtl"
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #1E3A5F 0%, #1D4ED8 40%, #60A5FA 100%)',
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      {/* Stars background */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            top: `${(i * 7) % 60}%`,
            left: `${(i * 13 + 5) % 95}%`,
            opacity: 0.4 + (i % 5) * 0.1,
            animation: `twinkle ${2 + (i % 3)}s ease-in-out infinite`,
            animationDelay: `${(i * 0.3) % 2}s`,
          }}
        />
      ))}

      {/* Road strip at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-20 flex items-center"
        style={{ background: 'linear-gradient(180deg, #44403C, #292524)' }}
      >
        {/* Dashed center line */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex gap-6 px-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex-1 h-1.5 bg-white/70 rounded-full" />
          ))}
        </div>
        {/* Player car on road */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-8 text-5xl" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>
          🏎️
        </div>
      </div>

      {/* Title card */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: -20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        className="flex flex-col items-center gap-3 z-10 mb-8"
      >
        <img 
          src="logos/logo.png" 
          alt="Teta Lo2is Logo" 
          className="w-32 h-auto object-contain mb-2 drop-shadow-lg"
        />
        <div
          className="px-10 py-4 rounded-3xl shadow-2xl text-center"
          style={{
            background: 'linear-gradient(135deg, #F97316, #EF4444)',
            border: '4px solid #FCD34D',
            boxShadow: '0 8px 32px rgba(239,68,68,0.4), 0 0 0 4px rgba(252,211,77,0.3)',
          }}
        >
          <p
            className="text-yellow-200 mb-1"
            style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.9rem)', fontWeight: 700, letterSpacing: '0.05em' }}
          >
            لعبة السيارات التعليمية
          </p>
          <h1
            className="text-white"
            style={{
              fontSize: 'clamp(2rem, 6vw, 3.5rem)',
              fontWeight: 900,
              textShadow: '0 3px 12px rgba(0,0,0,0.4)',
              lineHeight: 1.1,
            }}
          >
            تيتا لوئيس
          </h1>
          <p className="text-orange-200 mt-1" style={{ fontSize: 'clamp(0.65rem, 1.5vw, 0.85rem)', fontWeight: 600 }}>
            🏁 تعالى نلعب مع تيتا! 🏁
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
          className="px-10 py-3 rounded-2xl shadow-xl"
          style={{
            background: 'linear-gradient(135deg, #22C55E, #16A34A)',
            color: 'white',
            fontWeight: 900,
            fontSize: 'clamp(0.95rem, 2.5vw, 1.3rem)',
            fontFamily: "'Cairo', sans-serif",
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            border: '3px solid #4ADE80',
            boxShadow: '0 8px 24px rgba(34,197,94,0.4)',
          }}
        >
          🎮 ابدأ اللعب
        </motion.button>

        <p
          className="text-blue-200 text-center"
          style={{ fontSize: 'clamp(0.6rem, 1.3vw, 0.75rem)', fontWeight: 600, opacity: 0.8 }}
        >
          استخدم ▶ ◀ أو اضغط على الشاشة للتحكم
        </p>
      </motion.div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}
