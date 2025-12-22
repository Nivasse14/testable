/**
 * Simplifie une mélodie MIDI polyphonique en monophonique
 * Applique filtres selon la difficulté (easy/medium/hard)
 */

import Logger from '../utils/logger.js';

const logger = new Logger('SIMPLIFY');

/**
 * Simplifie les notes selon la difficulté
 * @param {Array} notes - Notes [{t, pitch, duration, velocity}]
 * @param {string} difficulty - 'easy' | 'medium' | 'hard'
 * @returns {Array} - Notes simplifiées
 */
export function simplifyMelody(notes, difficulty = 'medium') {
  logger.info(`Simplification mélodie (difficulté: ${difficulty})`);

  let simplified = [...notes];

  // 1. Filtrer les notes trop courtes (grace notes, ornements)
  const minDuration = difficulty === 'easy' ? 0.15 : difficulty === 'medium' ? 0.1 : 0.05;
  simplified = simplified.filter(n => n.duration >= minDuration);

  // 2. Monophonic extraction: garder la note la plus haute par tranche temporelle
  simplified = extractTopNotes(simplified, difficulty);

  // 3. Quantization temporelle (optionnel, selon difficulté)
  if (difficulty === 'easy') {
    simplified = quantizeNotes(simplified, 0.25); // Grid 1/4 beat
  } else if (difficulty === 'medium') {
    simplified = quantizeNotes(simplified, 0.125); // Grid 1/8 beat
  }
  // hard: pas de quantization

  // 4. Filtrer notes trop proches en pitch (éviter tremolo)
  simplified = filterPitchRepetitions(simplified, difficulty);

  logger.success(`${simplified.length} notes après simplification`);
  return simplified;
}

/**
 * Extrait les notes les plus hautes (top melody line)
 */
function extractTopNotes(notes, difficulty) {
  if (notes.length === 0) return [];

  // Créer des bins temporels (fenêtre glissante)
  const windowSize = difficulty === 'easy' ? 0.3 : difficulty === 'medium' ? 0.2 : 0.1;
  const topNotes = [];

  let i = 0;
  while (i < notes.length) {
    const currentTime = notes[i].t;
    const windowEnd = currentTime + windowSize;

    // Trouver toutes les notes dans la fenêtre
    const windowNotes = [];
    let j = i;
    while (j < notes.length && notes[j].t < windowEnd) {
      windowNotes.push(notes[j]);
      j++;
    }

    // Prendre la note la plus haute (pitch max)
    const topNote = windowNotes.reduce((max, n) =>
      n.pitch > max.pitch ? n : max
    );
    topNotes.push(topNote);

    // Avancer au-delà de cette note
    i = notes.findIndex(n => n.t > topNote.t + topNote.duration);
    if (i === -1) break;
  }

  return topNotes;
}

/**
 * Quantize les notes sur une grille temporelle
 */
function quantizeNotes(notes, gridSize) {
  return notes.map(note => ({
    ...note,
    t: Math.round(note.t / gridSize) * gridSize,
  }));
}

/**
 * Filtre les répétitions de pitch trop rapprochées
 */
function filterPitchRepetitions(notes, difficulty) {
  if (notes.length === 0) return [];

  const minInterval = difficulty === 'easy' ? 0.4 : difficulty === 'medium' ? 0.25 : 0.15;
  const filtered = [notes[0]];

  for (let i = 1; i < notes.length; i++) {
    const prev = filtered[filtered.length - 1];
    const curr = notes[i];

    // Si même pitch et trop proche en temps, skip
    if (curr.pitch === prev.pitch && curr.t - prev.t < minInterval) {
      continue;
    }

    filtered.push(curr);
  }

  return filtered;
}
