/**
 * Sélectionne le meilleur segment (hook) de 7-9 secondes
 * Critères: densité de notes, variété mélodique, énergie
 */

import Logger from '../utils/logger.js';

const logger = new Logger('HOOK');

/**
 * Choisit le meilleur hook de 7-9 secondes
 * @param {Array} notes - Notes [{t, pitch, duration, velocity}]
 * @param {number} targetDuration - Durée cible (7-9s)
 * @returns {Object} - { hookNotes, start, end, score }
 */
export function chooseHook(notes, targetDuration = 8.0) {
  logger.info(`Sélection du meilleur hook (${targetDuration}s)...`);

  if (notes.length === 0) {
    throw new Error('Aucune note disponible pour le hook');
  }

  const totalDuration = notes[notes.length - 1].t + notes[notes.length - 1].duration;
  
  if (totalDuration < targetDuration) {
    logger.warn(`Durée totale (${totalDuration.toFixed(1)}s) < target (${targetDuration}s), utilisation complète`);
    return {
      hookNotes: notes,
      start: 0,
      end: totalDuration,
      score: 1.0,
    };
  }

  // Fenêtre glissante pour trouver le meilleur segment
  const stepSize = 0.5; // secondes
  let bestSegment = null;
  let bestScore = -Infinity;

  for (let start = 0; start <= totalDuration - targetDuration; start += stepSize) {
    const end = start + targetDuration;
    const segmentNotes = notes.filter(n => n.t >= start && n.t < end);

    if (segmentNotes.length === 0) continue;

    const score = scoreSegment(segmentNotes, start, end);

    if (score > bestScore) {
      bestScore = score;
      bestSegment = { start, end, notes: segmentNotes };
    }
  }

  if (!bestSegment) {
    // Fallback: prendre le début
    logger.warn('Impossible de scorer, utilisation du début');
    const end = Math.min(targetDuration, totalDuration);
    const hookNotes = notes.filter(n => n.t < end);
    return { hookNotes, start: 0, end, score: 0 };
  }

  logger.success(
    `Hook sélectionné: ${bestSegment.start.toFixed(1)}s - ${bestSegment.end.toFixed(1)}s ` +
    `(${bestSegment.notes.length} notes, score: ${bestScore.toFixed(2)})`
  );

  return {
    hookNotes: bestSegment.notes,
    start: bestSegment.start,
    end: bestSegment.end,
    score: bestScore,
  };
}

/**
 * Score un segment selon plusieurs critères
 */
function scoreSegment(notes, start, end) {
  const duration = end - start;

  // 1. Densité de notes (notes/seconde)
  const density = notes.length / duration;
  const densityScore = Math.min(density / 5.0, 1.0); // Normaliser, ~5 notes/s = optimal

  // 2. Variété mélodique (range de pitches)
  const pitches = notes.map(n => n.pitch);
  const pitchRange = Math.max(...pitches) - Math.min(...pitches);
  const varietyScore = Math.min(pitchRange / 24, 1.0); // 2 octaves = 1.0

  // 3. Énergie moyenne (velocity)
  const avgVelocity = notes.reduce((sum, n) => sum + n.velocity, 0) / notes.length;
  const energyScore = avgVelocity / 127;

  // 4. Continuité (pas trop de silences)
  const gaps = [];
  for (let i = 1; i < notes.length; i++) {
    const gap = notes[i].t - (notes[i - 1].t + notes[i - 1].duration);
    if (gap > 0) gaps.push(gap);
  }
  const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  const continuityScore = Math.max(0, 1.0 - avgGap / 2.0); // Pénaliser gaps > 2s

  // Score composite
  const score =
    densityScore * 0.35 +
    varietyScore * 0.30 +
    energyScore * 0.20 +
    continuityScore * 0.15;

  return score;
}
