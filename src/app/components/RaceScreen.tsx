import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Pause, Play, ChevronRight } from 'lucide-react';
import { Level } from '../data/levels';
import { GasStationModal } from './GasStationModal';

interface Obstacle {
  id: number;
  lane: number; // 0=left, 1=center, 2=right
  t: number; // 0=far, 1=very close
  color: string;
  colorDark: string;
}

interface RaceScreenProps {
  level: Level;
  onGameOver: (result: { won: boolean; score: number; stars: number }) => void;
  onBack: () => void;
}

const OBSTACLE_COLORS = [
  { color: '#3B82F6', dark: '#1D4ED8' },
  { color: '#8B5CF6', dark: '#6D28D9' },
  { color: '#22C55E', dark: '#15803D' },
  { color: '#EC4899', dark: '#BE185D' },
  { color: '#F59E0B', dark: '#B45309' },
];

function toArabicNumerals(n: number): string {
  return String(Math.round(n)).replace(/[0-9]/g, (d) => ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'][parseInt(d)]);
}

// Road geometry (percentage units of 100x100 viewBox)
const VP = { x: 50, y: 37 }; // vanishing point
const ROAD_LEFT_BOTTOM = 13;
const ROAD_RIGHT_BOTTOM = 87;
const ROAD_BOTTOM = 100;

// 4 lane edge x-positions at bottom
const LANE_EDGES_BOTTOM = [ROAD_LEFT_BOTTOM, 37, 63, ROAD_RIGHT_BOTTOM];
// Lane centers at bottom
const LANE_CENTERS_BOTTOM = [25, 50, 75];

function laneXAtT(lane: number, t: number): number {
  return VP.x + (LANE_CENTERS_BOTTOM[lane] - VP.x) * t;
}
function yAtT(t: number): number {
  return VP.y + (ROAD_BOTTOM - VP.y) * t;
}
function edgeXAtT(edgeIdx: number, t: number): number {
  return VP.x + (LANE_EDGES_BOTTOM[edgeIdx] - VP.x) * t;
}

export function RaceScreen({ level, onGameOver, onBack }: RaceScreenProps) {
  const [fuel, setFuel] = useState(100);
  const [score, setScore] = useState(0);
  const [playerLane, setPlayerLane] = useState(1);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [paused, setPaused] = useState(false);
  const [showGasStation, setShowGasStation] = useState(false);
  const [gasStationVisited, setGasStationVisited] = useState(false);
  const [showCollision, setShowCollision] = useState(false);
  const [laneIndicator, setLaneIndicator] = useState<'left' | 'right' | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  const frameRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const distanceRef = useRef(0);
  const fuelRef = useRef(100);
  const scoreRef = useRef(0);
  const playerLaneRef = useRef(1);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const pausedRef = useRef(false);
  const gasStationVisitedRef = useRef(false);
  const showGasStationRef = useRef(false);
  const obstacleIdCounter = useRef(0);
  const spawnFrameCounter = useRef(0);
  const gameOverFiredRef = useRef(false);
  const collisionCooldownRef = useRef(0);

  const TARGET_DURATION_SECONDS = 90;
  const DISTANCE_SPEED = level.survivalTargetDistance / TARGET_DURATION_SECONDS;
  const FUEL_DRAIN_PER_SECOND = 100 / (TARGET_DURATION_SECONDS * 1.15);

  // Sync refs with state
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { playerLaneRef.current = playerLane; }, [playerLane]);

  const moveLeft = useCallback(() => {
    setPlayerLane((l) => {
      const next = Math.max(0, l - 1);
      playerLaneRef.current = next;
      setLaneIndicator('right'); // RTL: left button = move right visually
      setTimeout(() => setLaneIndicator(null), 300);
      return next;
    });
  }, []);

  const moveRight = useCallback(() => {
    setPlayerLane((l) => {
      const next = Math.min(2, l + 1);
      playerLaneRef.current = next;
      setLaneIndicator('left');
      setTimeout(() => setLaneIndicator(null), 300);
      return next;
    });
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') moveLeft();
      if (e.key === 'ArrowRight') moveRight();
      if (e.key === 'Escape' || e.key === ' ') setPaused((p) => !p);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [moveLeft, moveRight]);

  // Touch / swipe
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 30) {
      if (dx < 0) moveLeft();
      else moveRight();
    }
    touchStartX.current = null;
  };

  // Main game loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      if (!pausedRef.current && !showGasStationRef.current && !gameOverFiredRef.current) {
        const now = performance.now();
        const deltaSeconds = Math.min(0.05, (now - lastTimeRef.current) / 1000);
        lastTimeRef.current = now;

        const distanceProgress = distanceRef.current / level.survivalTargetDistance;

        // Keep a visible score UI updated even while Gas Station modal is open.
        // Minimal change: prevents progress bar from freezing due to showGasStationRef gating.
        // (Do not alter fuel/score refs while modal is open.)
        if (showGasStationRef.current) {
          setScore(scoreRef.current);
        }



        // Frame-rate independent progression
        distanceRef.current += DISTANCE_SPEED * deltaSeconds;
        scoreRef.current = Math.floor(distanceRef.current);

        // Fuel drains by real elapsed time
        fuelRef.current = Math.max(0, fuelRef.current - (FUEL_DRAIN_PER_SECOND * deltaSeconds));

        // Road scroll animation
        setScrollOffset((s) => (s + level.obstacleSpeed * deltaSeconds * 6000) % 10);

        // Spawn obstacles
        spawnFrameCounter.current += deltaSeconds * 60;
        if (spawnFrameCounter.current >= level.spawnRate) {
          spawnFrameCounter.current -= level.spawnRate;
          const lane = Math.floor(Math.random() * 3);
          const colorPick = OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)];
          const newObs: Obstacle = {
            id: obstacleIdCounter.current++,
            lane,
            t: 0.05,
            color: colorPick.color,
            colorDark: colorPick.dark,
          };
          obstaclesRef.current = [...obstaclesRef.current, newObs];
        }

        // Move obstacles
        obstaclesRef.current = obstaclesRef.current
          .map((obs) => ({ ...obs, t: obs.t + (level.obstacleSpeed * deltaSeconds * 60) }))
          .filter((obs) => obs.t < 1.15);

        // Collision detection
        if (collisionCooldownRef.current > 0) {
          collisionCooldownRef.current -= deltaSeconds * 60;
        } else {
          const hitting = obstaclesRef.current.find(
            (obs) => obs.lane === playerLaneRef.current && obs.t > 0.88 && obs.t < 1.05
          );
          if (hitting) {
            collisionCooldownRef.current = 90;
            fuelRef.current = Math.max(0, fuelRef.current - 20);
            setShowCollision(true);
            setTimeout(() => setShowCollision(false), 600);
          }
        }

        // Distance progress (use score as distance)
        // (distanceProgress already computed for debug logging above)


        // Gas station trigger (mid-race + low fuel)
        if (!gasStationVisitedRef.current && distanceProgress >= 0.45 && fuelRef.current <= 50) {
          gasStationVisitedRef.current = true;
          showGasStationRef.current = true;
          setGasStationVisited(true);
          setShowGasStation(true);
        }

        // Game over: fuel empty (before finish)
        if (fuelRef.current <= 0 && !gameOverFiredRef.current) {
          gameOverFiredRef.current = true;
          const finalScore = scoreRef.current;
          const stars = finalScore >= level.survivalTargetDistance ? 3 : finalScore >= level.survivalTargetDistance * 0.6 ? 2 : finalScore >= level.survivalTargetDistance * 0.3 ? 1 : 0;
          onGameOver({ won: false, score: finalScore, stars });
          return;
        }

        // Win: full distance completed AND still have fuel
        if (distanceRef.current >= level.survivalTargetDistance && fuelRef.current > 0 && !gameOverFiredRef.current) {
          gameOverFiredRef.current = true;
          const finalScore = scoreRef.current;
          const stars = fuelRef.current >= 60 ? 3 : fuelRef.current >= 30 ? 2 : 1;
          onGameOver({ won: true, score: finalScore, stars });
          return;
        }


        setFuel(fuelRef.current);
        setScore(scoreRef.current);
        setObstacles([...obstaclesRef.current]);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [level, onGameOver]);

  const handleGasStationComplete = (correctCount: number) => {
    const fuelBonus = correctCount * 25; // 0, 25, 50, or 75
    fuelRef.current = Math.min(100, fuelRef.current + fuelBonus);
    setFuel(fuelRef.current);
    showGasStationRef.current = false;
    setShowGasStation(false);
  };

  // Fuel state
  const fuelState: 'critical' | 'low' | 'normal' =
    fuel < 5 ? 'critical' : fuel < 25 ? 'low' : 'normal';

  const fuelBarColor =
    fuelState === 'critical' ? '#EF4444' :
    fuelState === 'low' ? '#F59E0B' : '#22C55E';

  // Clouds positions (static for now)
  const clouds = [
    { x: 12, y: 8, w: 14, h: 6 },
    { x: 35, y: 5, w: 18, h: 7 },
    { x: 65, y: 9, w: 12, h: 5 },
    { x: 82, y: 6, w: 16, h: 6 },
  ];

  return (
    <div
      dir="rtl"
      className="relative w-full h-full overflow-hidden select-none"
      style={{ fontFamily: "'Cairo', sans-serif", cursor: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── GAME SCENE (SVG) ── */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="60%" stopColor="#BAE6FD" />
            <stop offset="100%" stopColor="#E0F7FF" />
          </linearGradient>
          <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ADE80" />
            <stop offset="100%" stopColor="#16A34A" />
          </linearGradient>
          <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#78716C" />
            <stop offset="100%" stopColor="#44403C" />
          </linearGradient>
          <radialGradient id="redVignette" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="transparent" />
            <stop offset="100%" stopColor={fuelState !== 'normal' ? '#EF4444' : 'transparent'} stopOpacity={fuelState === 'critical' ? 0.35 : 0.18} />
          </radialGradient>
        </defs>

        {/* Sky */}
        <rect width="100" height={VP.y + 3} fill="url(#sky)" />

        {/* Clouds */}
        {clouds.map((c, i) => (
          <ellipse key={i} cx={c.x} cy={c.y} rx={c.w / 2} ry={c.h / 2} fill="white" opacity="0.85" />
        ))}

        {/* Horizon hills */}
        <ellipse cx="20" cy={VP.y} rx="18" ry="8" fill="#86EFAC" />
        <ellipse cx="80" cy={VP.y} rx="18" ry="8" fill="#86EFAC" />
        <ellipse cx="50" cy={VP.y + 1} rx="8" ry="4" fill="#4ADE80" />

        {/* Grass */}
        <rect x="0" y={VP.y - 2} width="100" height={ROAD_BOTTOM - VP.y + 5} fill="url(#grass)" />

        {/* Palm trees left side */}
        {[30, 55, 78].map((yPos, i) => {
          const t = (yPos - VP.y) / (ROAD_BOTTOM - VP.y);
          const x = edgeXAtT(0, t) - 4 * t;
          const scale = t * 0.8 + 0.2;
          return (
            <g key={i} transform={`translate(${x}, ${yPos}) scale(${scale})`}>
              <rect x="-0.8" y="-6" width="1.6" height="6" fill="#92400E" />
              <ellipse cx="0" cy="-6" rx="3.5" ry="2.5" fill="#15803D" />
              <ellipse cx="-2" cy="-5.5" rx="2.5" ry="1.5" fill="#16A34A" />
              <ellipse cx="2" cy="-5.5" rx="2.5" ry="1.5" fill="#16A34A" />
            </g>
          );
        })}

        {/* Trees right side */}
        {[32, 58, 75].map((yPos, i) => {
          const t = (yPos - VP.y) / (ROAD_BOTTOM - VP.y);
          const x = edgeXAtT(3, t) + 4 * t;
          const scale = t * 0.8 + 0.2;
          return (
            <g key={i} transform={`translate(${x}, ${yPos}) scale(${scale})`}>
              <rect x="-0.8" y="-7" width="1.6" height="7" fill="#713F12" />
              <polygon points="0,-12 -3.5,-5 3.5,-5" fill="#15803D" />
              <polygon points="0,-10 -4,-4 4,-4" fill="#16A34A" />
            </g>
          );
        })}

        {/* Road trapezoid */}
        <polygon
          points={`${VP.x},${VP.y} ${ROAD_RIGHT_BOTTOM},${ROAD_BOTTOM} ${ROAD_LEFT_BOTTOM},${ROAD_BOTTOM}`}
          fill="url(#road)"
        />

        {/* Road edge lines */}
        <line x1={VP.x} y1={VP.y} x2={ROAD_LEFT_BOTTOM} y2={ROAD_BOTTOM} stroke="white" strokeWidth="0.4" opacity="0.9" />
        <line x1={VP.x} y1={VP.y} x2={ROAD_RIGHT_BOTTOM} y2={ROAD_BOTTOM} stroke="white" strokeWidth="0.4" opacity="0.9" />

        {/* Lane dividers (dashed, animated scroll) */}
        {[1, 2].map((edgeIdx) => {
          const segments = 8;
          return Array.from({ length: segments }).map((_, seg) => {
            const tStart = ((seg / segments) + scrollOffset / 100) % 1;
            const tEnd = tStart + 0.06;
            if (tEnd > 1) return null;
            return (
              <line
                key={`${edgeIdx}-${seg}`}
                x1={edgeXAtT(edgeIdx, tStart)}
                y1={yAtT(tStart)}
                x2={edgeXAtT(edgeIdx, tEnd)}
                y2={yAtT(tEnd)}
                stroke="white"
                strokeWidth="0.3"
                opacity="0.7"
              />
            );
          });
        })}

        {/* Obstacle cars */}
        {obstacles.map((obs) => {
          const cx = laneXAtT(obs.lane, obs.t);
          const cy = yAtT(obs.t);
          const s = obs.t * 5; // car size
          if (s < 0.5) return null;
          return (
            <g key={obs.id} transform={`translate(${cx}, ${cy})`}>
              {/* Car body */}
              <rect x={-s * 0.6} y={-s * 0.55} width={s * 1.2} height={s * 0.9} rx={s * 0.15} fill={obs.color} />
              {/* Roof */}
              <rect x={-s * 0.38} y={-s * 0.9} width={s * 0.76} height={s * 0.5} rx={s * 0.12} fill={obs.colorDark} />
              {/* Windshield */}
              <rect x={-s * 0.32} y={-s * 0.88} width={s * 0.64} height={s * 0.38} rx={s * 0.08} fill="#BAE6FD" opacity="0.8" />
              {/* Headlights */}
              <rect x={-s * 0.5} y={s * 0.22} width={s * 0.22} height={s * 0.14} rx={s * 0.04} fill="#FCD34D" />
              <rect x={s * 0.28} y={s * 0.22} width={s * 0.22} height={s * 0.14} rx={s * 0.04} fill="#FCD34D" />
              {/* Wheels */}
              <ellipse cx={-s * 0.5} cy={s * 0.32} rx={s * 0.2} ry={s * 0.12} fill="#1C1917" />
              <ellipse cx={s * 0.5} cy={s * 0.32} rx={s * 0.2} ry={s * 0.12} fill="#1C1917" />
            </g>
          );
        })}

        {/* Player car — motion.g animates x smoothly between lanes */}
        {(() => {
          const s = 10; // size — ~28% of road width, visible at bottom
          const cy = 95; // slightly above bottom edge so top 65% is visible
          return (
            <motion.g
              animate={{ x: laneXAtT(playerLane, 1.0), y: cy }}
              transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
            >
              {/* Drop shadow */}
              <ellipse cx="0" cy={s * 0.15} rx={s * 0.85} ry={s * 0.22} fill="black" opacity="0.22" />
              {/* Body — bright red #E53935 */}
              <rect x={-s * 0.68} y={-s * 0.55} width={s * 1.36} height={s * 0.95} rx={s * 0.18} fill="#E53935" />
              {/* Roof / cabin */}
              <rect x={-s * 0.44} y={-s * 1.15} width={s * 0.88} height={s * 0.68} rx={s * 0.15} fill="#C62828" />
              {/* Rear window (blue glass) */}
              <rect x={-s * 0.36} y={-s * 1.11} width={s * 0.72} height={s * 0.48} rx={s * 0.09} fill="#BAE6FD" opacity="0.82" />
              {/* Rear spoiler */}
              <rect x={-s * 0.72} y={-s * 0.6} width={s * 1.44} height={s * 0.12} rx={s * 0.06} fill="#B71C1C" />
              {/* Tail lights (bright) */}
              <rect x={-s * 0.6} y={-s * 0.52} width={s * 0.24} height={s * 0.18} rx={s * 0.05} fill="#FF8A80" />
              <rect x={s * 0.36} y={-s * 0.52} width={s * 0.24} height={s * 0.18} rx={s * 0.05} fill="#FF8A80" />
              {/* Exhaust pipes */}
              <rect x={-s * 0.5} y={s * 0.32} width={s * 0.16} height={s * 0.08} rx={s * 0.03} fill="#78716C" />
              <rect x={s * 0.34} y={s * 0.32} width={s * 0.16} height={s * 0.08} rx={s * 0.03} fill="#78716C" />
              {/* Rear wheels */}
              <rect x={-s * 0.88} y={-s * 0.32} width={s * 0.3} height={s * 0.52} rx={s * 0.1} fill="#1C1917" />
              <rect x={s * 0.58} y={-s * 0.32} width={s * 0.3} height={s * 0.52} rx={s * 0.1} fill="#1C1917" />
              {/* Wheel rims */}
              <ellipse cx={-s * 0.73} cy={-s * 0.06} rx={s * 0.12} ry={s * 0.12} fill="#9CA3AF" />
              <ellipse cx={s * 0.73} cy={-s * 0.06} rx={s * 0.12} ry={s * 0.12} fill="#9CA3AF" />
              {/* Stripe detail */}
              <rect x={-s * 0.68} y={-s * 0.08} width={s * 1.36} height={s * 0.1} rx={s * 0.04} fill="#EF9A9A" opacity="0.5" />
            </motion.g>
          );
        })()}

        {/* Red vignette for low/critical fuel */}
        {fuelState !== 'normal' && (
          <rect width="100" height="100" fill="url(#redVignette)" />
        )}

        {/* Collision flash */}
        {showCollision && (
          <rect width="100" height="100" fill="#EF4444" opacity="0.35" />
        )}
      </svg>

      {/* ── HUD OVERLAY ── */}
      <div className="absolute inset-0 pointer-events-none flex flex-col">
        {/* Top HUD bar */}
        <div className="flex items-center justify-between px-3 pt-2 gap-2">
          {/* Score (top-left in RTL = right side visually) */}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-2xl shadow-lg"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', pointerEvents: 'none' }}
          >
            <span className="text-yellow-300" style={{ fontSize: '0.75rem' }}>⭐</span>
            <span
              className="text-white"
              style={{ fontWeight: 900, fontSize: 'clamp(0.85rem, 2.5vw, 1.2rem)', fontFamily: "'Cairo', sans-serif" }}
            >
              {toArabicNumerals(score)}
            </span>
          </div>

          {/* Pause button (center) */}
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
            style={{
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
              pointerEvents: 'all',
            }}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? (
              <Play size={16} className="text-white" fill="white" />
            ) : (
              <Pause size={16} className="text-white" />
            )}
          </button>

          {/* Fuel gauge (top-right in RTL = left side visually) */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl shadow-lg"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', pointerEvents: 'none', minWidth: '30%' }}
          >
            <span
              style={{
                fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
                animation: fuelState === 'critical' ? 'pulse 0.5s infinite' : fuelState === 'low' ? 'pulse 1s infinite' : 'none',
              }}
            >
              ⛽
            </span>
            <div className="flex-1 h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${fuel}%`,
                  backgroundColor: fuelBarColor,
                  boxShadow: fuelState !== 'normal' ? `0 0 6px ${fuelBarColor}` : 'none',
                }}
              />
            </div>
            <span
              className="text-white"
              style={{ fontSize: 'clamp(0.6rem, 1.5vw, 0.8rem)', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}
            >
              {toArabicNumerals(Math.round(fuel))}٪
            </span>
          </div>
        </div>

        {/* Lane indicators */}
        <div className="flex justify-center mt-1 gap-2">
          {[0, 1, 2].map((lane) => (
            <div
              key={lane}
              className="w-2.5 h-2.5 rounded-full transition-all duration-200 shadow"
              style={{
                backgroundColor: lane === playerLane ? '#FCD34D' : 'rgba(255,255,255,0.35)',
                transform: lane === playerLane ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Level progress bar */}
        <div className="px-3 mt-1">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (score / level.survivalTargetDistance) * 100)}%`,
                background: 'linear-gradient(90deg, #22C55E, #FCD34D)',
              }}
            />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Touch controls */}
        <div className="flex justify-between px-2 pb-2 pointer-events-all">
          <button
            onTouchStart={(e) => { e.preventDefault(); moveLeft(); }}
            onClick={moveLeft}
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', border: '2px solid rgba(255,255,255,0.3)' }}
          >
            <span className="text-white text-2xl">▶</span>
          </button>

          <button
            onTouchStart={(e) => { e.preventDefault(); moveRight(); }}
            onClick={moveRight}
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', border: '2px solid rgba(255,255,255,0.3)' }}
          >
            <span className="text-white text-2xl">◀</span>
          </button>
        </div>
      </div>

      {/* ── PAUSE OVERLAY ── */}
      {paused && !showGasStation && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-40"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          dir="rtl"
        >
          <div className="text-6xl">⏸️</div>
          <h2 className="text-white" style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', fontWeight: 900, fontFamily: "'Cairo', sans-serif" }}>
            اللعبة واقفة
          </h2>
          <button
            onClick={() => setPaused(false)}
            className="flex items-center gap-2 px-8 py-3 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #F97316, #EF4444)', color: 'white', fontWeight: 900, fontSize: '1rem', fontFamily: "'Cairo', sans-serif" }}
          >
            <Play size={20} fill="white" />
            <span>استمر</span>
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-2 rounded-2xl shadow-md transition-all hover:scale-105"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, fontSize: '0.9rem', fontFamily: "'Cairo', sans-serif" }}
          >
            <ChevronRight size={18} />
            <span>رجوع للمستويات</span>
          </button>
        </div>
      )}

      {/* ── GAS STATION MODAL ── */}
      <AnimatePresence>
        {showGasStation && (
          <GasStationModal
            questions={level.questions}
            onComplete={handleGasStationComplete}
          />
        )}
      </AnimatePresence>

      {/* Low fuel warning */}
      {fuelState === 'low' && !showGasStation && !gasStationVisited && (
        <div
          className="absolute top-14 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full shadow-lg"
          style={{
            background: 'rgba(245, 158, 11, 0.95)',
            color: 'white',
            fontWeight: 900,
            fontSize: 'clamp(0.65rem, 1.5vw, 0.85rem)',
            fontFamily: "'Cairo', sans-serif",
            animation: 'pulse 1s infinite',
          }}
        >
          ⚠️ الوقود قليل! محطة الوقود جاية!
        </div>
      )}

      {fuelState === 'critical' && !showGasStation && (
        <div
          className="absolute top-14 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full shadow-lg"
          style={{
            background: 'rgba(239, 68, 68, 0.95)',
            color: 'white',
            fontWeight: 900,
            fontSize: 'clamp(0.65rem, 1.5vw, 0.85rem)',
            fontFamily: "'Cairo', sans-serif",
            animation: 'pulse 0.5s infinite',
          }}
        >
          🔴 الوقود خلص! بسرعة بسرعة!
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
