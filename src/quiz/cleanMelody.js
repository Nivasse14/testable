/**
 * Nettoyage professionnel de mélodie MIDI
 * Conversion polyphonique → monophonique avec règles PRO
 */

import Logger from '../utils/logger.js';
import quantize, { smartQuantize } from './quantize.js';

const logger = new Logger('CLEAN-MELODY');

/**
 * Nettoie une mélodie MIDI polyphonique en mélodie monophonique professionnelle
 * @param {Array} notes - Notes brutes [{start, end, pitch, velocity, channel, track}]
 * @param {Object} options - Options de nettoyage
 * @returns {Object} - { cleanNotes, stats }
 */
export default function cleanMelody(notes, options = {}) {
  const {
    // Règles de nettoyage
    timeBinMs = 20, // Regroupement temporel (20ms = tolérance humaine)
    minDurationMs = 110, // Durée minimum par note (90-120ms recommandé)
    maxNoteDurationSec = 0.6, // Durée max pour xylophone (0.45-0.7s)
    
    // Transformation
    transposeSemitones = 12, // +12 = 1 octave up (xylophone aigu)
    velocityMin = 70, // Normalisation velocity
    velocityMax = 115,
    
    // Options avancées
    enableQuantize = false, // Quantification sur grille
    quantizeStrength = 0.8,
    tempo = 120, // BPM pour quantize
    
    // Sélection hook (extrait court)
    chooseHook = false,
    hookDurationSec = 8, // 7-9s recommandé
    
    // Règles de sélection note dominante
    priorityHighPitch = true, // Mélodie = note haute
    priorityHighVelocity = true, // En cas d'égalité pitch
  } = options;

  logger.info(`Nettoyage mélodie: ${notes.length} notes brutes`);
  logger.info(`  → time bin: ${timeBinMs}ms, min: ${minDurationMs}ms, max: ${maxNoteDurationSec}s`);
  logger.info(`  → transpose: ${transposeSemitones > 0 ? '+' : ''}${transposeSemitones} demi-tons`);
  if (enableQuantize) logger.info(`  → quantize: activé (tempo ${tempo} BPM)`);

  const stats = {
    inputCount: notes.length,
    removedShort: 0,
    removedOverlaps: 0,
    transposed: transposeSemitones !== 0,
    velocityNormalized: true,
  };

  // ÉTAPE 1: Grouper les notes dans des bins temporels
  const timeBinSec = timeBinMs / 1000;
  const bins = new Map();

  for (const note of notes) {
    const binIndex = Math.floor(note.start / timeBinSec);
    if (!bins.has(binIndex)) {
      bins.set(binIndex, []);
    }
    bins.get(binIndex).push(note);
  }

  logger.info(`  → ${bins.size} bins temporels créés`);

  // ÉTAPE 2: Sélectionner UNE note par bin (note dominante)
  let monophonicNotes = [];

  for (const [binIndex, binNotes] of bins.entries()) {
    if (binNotes.length === 1) {
      monophonicNotes.push(binNotes[0]);
    } else {
      // Plusieurs notes dans le même bin → choisir la dominante
      let dominant = binNotes[0];

      for (let i = 1; i < binNotes.length; i++) {
        const candidate = binNotes[i];

        // Règle 1: Pitch le plus haut (mélodie)
        if (priorityHighPitch && candidate.pitch > dominant.pitch) {
          dominant = candidate;
        } else if (candidate.pitch === dominant.pitch) {
          // Règle 2: Velocity la plus forte (en cas d'égalité pitch)
          if (priorityHighVelocity && candidate.velocity > dominant.velocity) {
            dominant = candidate;
          }
        }
      }

      monophonicNotes.push(dominant);
      stats.removedOverlaps += binNotes.length - 1;
    }
  }

  logger.success(`  → ${monophonicNotes.length} notes monophoniques (${stats.removedOverlaps} overlaps supprimés)`);

  // ÉTAPE 3: Filtrer les notes trop courtes
  const minDurationSec = minDurationMs / 1000;
  monophonicNotes = monophonicNotes.filter((note) => {
    const duration = note.end - note.start;
    const keep = duration >= minDurationSec;
    if (!keep) stats.removedShort++;
    return keep;
  });

  logger.success(`  → ${monophonicNotes.length} notes conservées (${stats.removedShort} trop courtes supprimées)`);

  // ÉTAPE 4: Limiter la durée max + transpose + normalize velocity
  let cleanNotes = monophonicNotes.map((note) => {
    const duration = note.end - note.start;
    const cappedDuration = Math.min(duration, maxNoteDurationSec);

    // Transpose
    let newPitch = note.pitch + transposeSemitones;
    newPitch = Math.max(0, Math.min(127, newPitch)); // Clamp MIDI range

    // Normalize velocity
    const normalizedVelocity = Math.floor(
      velocityMin + ((note.velocity / 127) * (velocityMax - velocityMin))
    );

    return {
      start: note.start,
      end: note.start + cappedDuration,
      pitch: newPitch,
      velocity: Math.max(1, Math.min(127, normalizedVelocity)),
      channel: 0, // Mono channel
      track: 0,
    };
  });

  // ÉTAPE 5: Quantification optionnelle
  if (enableQuantize) {
    logger.info('  → Quantification...');
    cleanNotes = smartQuantize(cleanNotes, tempo, {
      subdivision: 16,
      strength: quantizeStrength,
      quantizeEnd: false,
    });
  }

  // ÉTAPE 6: Sélection hook optionnelle
  let hookStart = 0;
  let hookEnd = cleanNotes.length > 0 ? cleanNotes[cleanNotes.length - 1].end : 0;

  if (chooseHook && cleanNotes.length > 0) {
    logger.info(`  → Sélection hook (${hookDurationSec}s)...`);
    const hookResult = selectBestHook(cleanNotes, hookDurationSec);
    hookStart = hookResult.start;
    hookEnd = hookResult.end;

    // Filtrer notes dans le hook
    cleanNotes = cleanNotes.filter((note) => note.start >= hookStart && note.end <= hookEnd);

    // Décaler les temps pour commencer à 0
    const offset = hookStart;
    cleanNotes = cleanNotes.map((note) => ({
      ...note,
      start: note.start - offset,
      end: note.end - offset,
    }));

    logger.success(
      `  → Hook sélectionné: ${hookStart.toFixed(2)}s - ${hookEnd.toFixed(2)}s (score: ${hookResult.score.toFixed(2)})`
    );
  }

  stats.outputCount = cleanNotes.length;
  stats.hookStart = hookStart;
  stats.hookEnd = hookEnd;

  logger.success(`✨ Mélodie nettoyée: ${cleanNotes.length} notes finales`);

  return { cleanNotes, stats };
}

/**
 * Sélectionne le meilleur segment de durée fixe
 * Score = densité notes + variance pitch + énergie velocity
 */
function selectBestHook(notes, durationSec) {
  const totalDuration = notes[notes.length - 1].end;
  const stepSec = 0.5; // Fenêtre glissante par 0.5s

  let bestScore = -1;
  let bestStart = 0;
  let bestEnd = durationSec;

  for (let start = 0; start <= totalDuration - durationSec; start += stepSec) {
    const end = start + durationSec;
    const windowNotes = notes.filter((n) => n.start >= start && n.start < end);

    if (windowNotes.length === 0) continue;

    // Score = densité + variance pitch + énergie
    const density = windowNotes.length / durationSec;
    const pitches = windowNotes.map((n) => n.pitch);
    const pitchVariance = variance(pitches);
    const avgVelocity = windowNotes.reduce((sum, n) => sum + n.velocity, 0) / windowNotes.length;

    const score = density * 0.4 + pitchVariance * 0.3 + (avgVelocity / 127) * 0.3;

    if (score > bestScore) {
      bestScore = score;
      bestStart = start;
      bestEnd = end;
    }
  }

  return { start: bestStart, end: bestEnd, score: bestScore };
}

/**
 * Calcule la variance d'un tableau de nombres
 */
function variance(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
}
