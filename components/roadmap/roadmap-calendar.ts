// Pure lunar-phase utilities — no external deps
// Algorithm: Meeus simplified synodic month from reference epoch

const FULL_MOON_NAMES: Record<number, { name: string; emoji: string; tagline: string }> = {
  1:  { name: 'Wolf Moon',       emoji: '🐺', tagline: 'Pack holds, protocols tested' },
  2:  { name: 'Snow Moon',       emoji: '❄️', tagline: 'Deep work beneath the snow' },
  3:  { name: 'Worm Moon',       emoji: '🪱', tagline: 'Ground thaws, pipes emerge' },
  4:  { name: 'Pink Moon',       emoji: '🌸', tagline: 'First blooms, branches reach' },
  5:  { name: 'Flower Moon',     emoji: '🌺', tagline: 'Commons in full flower' },
  6:  { name: 'Strawberry Moon', emoji: '🍓', tagline: 'Harvest ripens, value flows' },
  7:  { name: 'Buck Moon',       emoji: '🦌', tagline: 'Velvet falls, hard edges form' },
  8:  { name: 'Sturgeon Moon',   emoji: '🐟', tagline: 'Deep patterns surface' },
  9:  { name: 'Harvest Moon',    emoji: '🌾', tagline: 'Reap what was sown, store well' },
  10: { name: "Hunter's Moon",   emoji: '🍂', tagline: "Track what matters, prune rest" },
  11: { name: 'Beaver Moon',     emoji: '🦫', tagline: 'Build before the freeze comes' },
  12: { name: 'Cold Moon',       emoji: '❄️', tagline: 'Longest nights, roots deepen' },
};

export interface LunarPhase {
  name: 'New Moon' | 'First Quarter' | 'Full Moon' | 'Last Quarter';
  emoji: '🌑' | '🌓' | '🌕' | '🌗';
  date: Date; // UTC datetime of the primary phase
  moonName?: string;    // traditional name — Full Moon only
  moonEmoji?: string;   // seasonal emoji — Full Moon only
  moonTagline?: string; // short creative tagline — Full Moon only
}

// Reference New Moon: JD 2451550.259 = 2000-01-06 18:14 UTC
const EPOCH_JD = 2451550.259;
// Mean synodic month in days
const SYNODIC_MONTH = 29.530589;
// JD of Unix epoch (1970-01-01 00:00 UTC)
const UNIX_EPOCH_JD = 2440587.5;

const PHASE_OFFSETS: {
  offset: number;
  name: LunarPhase['name'];
  emoji: LunarPhase['emoji'];
}[] = [
  { offset: 0,    name: 'New Moon',       emoji: '🌑' },
  { offset: 0.25, name: 'First Quarter',  emoji: '🌓' },
  { offset: 0.5,  name: 'Full Moon',      emoji: '🌕' },
  { offset: 0.75, name: 'Last Quarter',   emoji: '🌗' },
];

function jdToDate(jd: number): Date {
  return new Date((jd - UNIX_EPOCH_JD) * 86400000);
}

function dateToJd(d: Date): number {
  return d.getTime() / 86400000 + UNIX_EPOCH_JD;
}

/**
 * Returns all 4 primary lunar phases whose dates fall within [start, end].
 * Results are sorted chronologically.
 */
export function getLunarPhasesInWindow(start: Date, end: Date): LunarPhase[] {
  const startJd = dateToJd(start);
  const endJd = dateToJd(end);

  // Integer cycle number at the start of the window (minus 1 for safety)
  const kStart = Math.floor((startJd - EPOCH_JD) / SYNODIC_MONTH) - 1;
  // Enough cycles to cover the full window
  const kEnd = Math.ceil((endJd - EPOCH_JD) / SYNODIC_MONTH) + 1;

  const phases: LunarPhase[] = [];

  for (let k = kStart; k <= kEnd; k++) {
    for (const { offset, name, emoji } of PHASE_OFFSETS) {
      const phaseJd = EPOCH_JD + (k + offset) * SYNODIC_MONTH;
      if (phaseJd >= startJd && phaseJd <= endJd) {
        const phaseDate = jdToDate(phaseJd);
        const moonData = name === 'Full Moon'
          ? FULL_MOON_NAMES[phaseDate.getUTCMonth() + 1]
          : undefined;
        phases.push({
          name, emoji, date: phaseDate,
          ...(moonData && { moonName: moonData.name, moonEmoji: moonData.emoji, moonTagline: moonData.tagline }),
        });
      }
    }
  }

  return phases.sort((a, b) => a.date.getTime() - b.date.getTime());
}
