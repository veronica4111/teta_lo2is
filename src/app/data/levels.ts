/*
 * ASSET MANIFEST — replace placeholder URLs with real files:
 *
 * VIDEO FILES  → place in /public/video/level[N]/story.mp4
 * AUDIO FILES  → place in /public/audio/levels/level[N]/question[Q].mp3
 *
 * Each level has:
 *   - 1 video file  (story.mp4)
 *   - 3 audio files (question1.mp3, question2.mp3, question3.mp3)
 *
 * Total: 6 videos + 18 audio files
 * No level shares video or audio with any other level.
 */

export interface LevelQuestion {
  id: string;           // e.g. "l1_q1"
  questionText: string; // Arabic question text
  answers: {
    id: string;                                     // "a" | "b" | "c" | "d"
    text: string;                                   // Arabic answer text
    color: 'red' | 'blue' | 'green' | 'yellow';    // fixed per slot: a=red, b=blue, c=green, d=yellow
  }[];
  correctAnswerId: string; // must match one answers[].id
  audioUrl: string;        // e.g. "/audio/levels/level1/question1.mp3"
}

export interface Level {
  id: string;                     // "level_1" through "level_6"
  nameAr: string;                 // Arabic level name
  videoUrl: string;               // "/video/level[N]/story.mp4"
  thumbnail: string;              // placeholder emoji or image path
  color: string;                  // hex accent color for this level's UI tile
  bgColor: string;                // light background tint for tile
  emoji: string;                  // decorative emoji for scene placeholder
  survivalTargetDistance: number; // score units player must reach to win
  obstacleSpeed: number;          // t-units per frame obstacles advance
  spawnRate: number;              // frames between obstacle spawns
  locked: boolean;                // whether this level is locked initially
  questions: LevelQuestion[];     // exactly 3 questions
}

// ── Helper: build a question with fixed a/b/c/d color slots ──────────────────
function q(
  id: string,
  questionText: string,
  a: string,
  b: string,
  c: string,
  d: string,
  correctId: 'a' | 'b' | 'c' | 'd',
  level: number,
  qNum: number,
): LevelQuestion {
  return {
    id,
    questionText,
    answers: [
      { id: 'a', text: a, color: 'red' },
      { id: 'b', text: b, color: 'blue' },
      { id: 'c', text: c, color: 'green' },
      { id: 'd', text: d, color: 'yellow' },
    ],
    correctAnswerId: correctId,
    audioUrl: `audio/levels/level${level}/question${qNum}.mp3`,
  };
}

export const LEVELS: Level[] = [
  {
    id: 'level_1',
    nameAr: 'المستوى الأول',
    videoUrl: 'video/level1/story.mp4',
    thumbnail: '🌿',
    color: '#22C55E',
    bgColor: '#DCFCE7',
    emoji: '🌿',
    survivalTargetDistance: 1200,
    obstacleSpeed: 0.008,
    spawnRate: 120,
    locked: false,
    questions: [
      q('l1_q1', 'إيه لون السما في النهارده؟', 'أحمر', 'أزرق', 'أصفر', 'بنفسجي', 'b', 1, 1),
      q('l1_q2', 'الأسد بيعمل إيه؟', 'بيزعق', 'بيغني', 'بيرقص', 'بيعوم', 'a', 1, 2),
      q('l1_q3', 'كام إصبع في إيدك الواحدة؟', 'تلاتة', 'سبعة', 'خمسة', 'اتنين', 'c', 1, 3),
    ],
  },
  {
    id: 'level_2',
    nameAr: 'المستوى التاني',
    videoUrl: 'video/level2/story.mp4',
    thumbnail: '🌊',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    emoji: '🌊',
    survivalTargetDistance: 1500,
    obstacleSpeed: 0.010,
    spawnRate: 100,
    locked: true,
    questions: [

      q('l2_q1', 'أيه اللي بيطير في السما؟', 'سمكة', 'عصفور', 'قطة', 'حصان', 'b', 2, 1),
      q('l2_q2', '٢ + ٢ يساوي كام؟', 'تلاتة', 'خمسة', 'أربعة', 'ستة', 'c', 2, 2),
      q('l2_q3', 'أيه لون العشب؟', 'أحمر', 'بنفسجي', 'أخضر', 'أسود', 'c', 2, 3),
    ],
  },
  {
    id: 'level_3',
    nameAr: 'المستوى التالت',
    videoUrl: 'video/level3/story.mp4',
    thumbnail: '🏜️',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    emoji: '🏜️',
    survivalTargetDistance: 1800,
    obstacleSpeed: 0.012,
    spawnRate: 90,
    locked: true,
    questions: [

      q('l3_q1', 'أيه الفاكهة الحمرا دي؟', 'موزة', 'تفاحة', 'بطيخ', 'عنب', 'b', 3, 1),
      q('l3_q2', 'أيه اللي بيطلع من النهر؟', 'نار', 'رمل', 'هوا', 'ميه', 'd', 3, 2),
      q('l3_q3', 'كام رجل عند الكرسي؟', 'رجلين', 'ست', 'أربع', 'واحدة', 'c', 3, 3),
    ],
  },
  {
    id: 'level_4',
    nameAr: 'المستوى الرابع',
    videoUrl: 'video/level4/story.mp4',
    thumbnail: '⛰️',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    emoji: '⛰️',
    survivalTargetDistance: 2200,
    obstacleSpeed: 0.014,
    spawnRate: 80,
    locked: true,
    questions: [
      q('l4_q1', 'أيه بتعمل لما تيجي تنام؟', 'بتاكل', 'بتلعب', 'بتغمض عينيك', 'بترسم', 'c', 4, 1),
      q('l4_q2', 'أيه الحيوان اللي بيطلع العسل؟', 'فراشة', 'نحلة', 'دودة', 'نملة', 'b', 4, 2),
      q('l4_q3', '١ + ٣ يساوي كام؟', 'اتنين', 'خمسة', 'ستة', 'أربعة', 'd', 4, 3),
    ],
  },
  {
    id: 'level_5',
    nameAr: 'المستوى الخامس',
    videoUrl: 'video/level5/story.mp4',
    thumbnail: '🌸',
    color: '#EC4899',
    bgColor: '#FCE7F3',
    emoji: '🌸',
    survivalTargetDistance: 2800,
    obstacleSpeed: 0.016,
    spawnRate: 70,
    locked: true,
    questions: [
      q('l5_q1', 'أيه بتشرب لما بتكون عطشان؟', 'عصير', 'ميه', 'شاي', 'لبن', 'b', 5, 1),
      q('l5_q2', 'كام يوم في الأسبوع؟', 'خمسة', 'ستة', 'تمانية', 'سبعة', 'd', 5, 2),
      q('l5_q3', 'أيه بيضي بيض؟', 'كلب', 'قطة', 'دجاجة', 'فيل', 'c', 5, 3),
    ],
  },
  {
    id: 'level_6',
    nameAr: 'المستوى السادس',
    videoUrl: 'video/level6/story.mp4',
    thumbnail: '⭐',
    color: '#F97316',
    bgColor: '#FFEDD5',
    emoji: '⭐',
    survivalTargetDistance: 3500,
    obstacleSpeed: 0.018,
    spawnRate: 60,
    locked: true,
    questions: [
      q('l6_q1', 'أيه أكبر حيوان في العالم؟', 'أسد', 'حصان', 'فيل', 'زرافة', 'c', 6, 1),
      q('l6_q2', '٣ × ٢ يساوي كام؟', 'خمسة', 'أربعة', 'سبعة', 'ستة', 'd', 6, 2),
      q('l6_q3', 'أيه اللي بيضوي في الليل؟', 'الشمس', 'الغيمة', 'القمر والنجوم', 'المطر', 'c', 6, 3),
    ],
  },
];
