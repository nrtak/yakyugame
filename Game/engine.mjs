// Pure batting rules shared by the playable prototype and its tests.
export const SWING_LEAD = 0.055; // Input-to-contact animation delay, seconds.
export const SESSION_LENGTH = 10;
export const SPEEDS = { relaxed: 1.65, standard: 1.25, quick: 0.98 };
export const ZONE = { halfWidth: 1, halfHeight: 1 };

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function makeSession(seed = 41, speed = 'standard') {
  const random = seededRandom(seed);
  const kinds = ['fast', 'fast', 'fast', 'change', 'curve', 'fast', 'curve', 'change', 'fast', 'curve'];
  return kinds.map((kind, index) => {
    const outside = [4, 6, 8].includes(index);
    const x = outside ? (random() > 0.5 ? 1 : -1) * (1.35 + random() * 0.2) : (random() - 0.5) * 1.35;
    const y = (random() - 0.5) * 1.3;
    return {
      index, kind, x, y,
      duration: (SPEEDS[speed] ?? SPEEDS.standard) * (kind === 'change' ? 1.25 : kind === 'curve' ? 1.13 : 1),
      bend: kind === 'curve' ? (x > 0 ? -1 : 1) * 0.85 : 0,
      inZone: Math.abs(x) <= ZONE.halfWidth && Math.abs(y) <= ZONE.halfHeight
    };
  });
}

export function judgeSwing(pitch, aim, impactTime) {
  const timingMs = (impactTime - pitch.duration) * 1000;
  const distance = Math.hypot(aim.x - pitch.x, aim.y - pitch.y);
  const absTime = Math.abs(timingMs);
  const timing = absTime <= 45 ? 'On time' : timingMs < 0 ? 'Early' : 'Late';
  if (absTime > 170 || distance > 0.9) {
    return { kind: 'miss', title: 'Swing and miss', points: 0, timing, timingMs, distance, quality: 0,
      detail: absTime > 170 ? (timingMs < 0 ? 'A little early. Let the ball travel closer to the plate.' : 'A little late. Start your swing just before the ball reaches the plate.') : 'Move the aiming ring closer to the ball.' };
  }
  if (absTime > 115 || distance > 0.64) {
    return { kind: 'foul', title: 'Foul ball', points: 20, timing, timingMs, distance, quality: 0.15,
      detail: 'You made contact. A little closer in timing and aim will keep it fair.' };
  }
  const quality = Math.max(0, 1 - 0.48 * absTime / 115 - 0.52 * distance / 0.64);
  const title = quality > 0.78 ? 'Perfect contact!' : quality > 0.48 ? 'Solid contact' : 'Fair contact';
  return { kind: 'hit', title, points: Math.round(40 + quality * 60), timing, timingMs, distance, quality,
    detail: quality > 0.78 ? 'Right on the barrel. Beautiful swing!' : 'Find the center of the ball and the timing will follow.' };
}

export function judgeTake(pitch) {
  return {
    kind: pitch.inZone ? 'strike' : 'ball',
    title: pitch.inZone ? 'Called strike' : 'Good eye — ball',
    points: pitch.inZone ? 0 : 50,
    detail: pitch.inZone ? 'That one crossed the strike zone. Try a swing next time.' : 'Outside the zone. Taking that pitch was the right call.',
    timing: 'No swing', timingMs: null, quality: 0
  };
}

export function summarize(results) {
  const swings = results.filter(r => r.timingMs !== null);
  const fairHits = results.filter(r => r.kind === 'hit').length;
  return {
    pitches: results.length, fairHits,
    contact: results.filter(r => ['hit', 'foul'].includes(r.kind)).length,
    goodTakes: results.filter(r => r.kind === 'ball').length,
    score: results.reduce((sum, r) => sum + r.points, 0),
    averageTimingMs: swings.length ? Math.round(swings.reduce((sum, r) => sum + Math.abs(r.timingMs), 0) / swings.length) : null
  };
}
