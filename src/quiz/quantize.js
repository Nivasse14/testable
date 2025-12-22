/**
 * Quantification MIDI sur grille temporelle
 * Utile pour nettoyer le timing des notes
 */

import Logger from '../utils/logger.js';

const logger = new Logger('QUANTIZE');

/**
 * Quantifie les notes sur une grille temporelle
 * @param {Array} notes - Notes à quantifier [{start, end, pitch, velocity}]
 * @param {Object} options - Options de quantification
 * @param {number} options.gridSize - Taille de la grille en secondes (ex: 0.0625 = 1/16 note à 120 BPM)
 * @param {number} options.strength - Force de quantification 0-1 (1 = snap complet)
 * @param {boolean} options.quantizeEnd - Quantifier aussi la fin des notes
 * @returns {Array} - Notes quantifiées
 */
export default function quantize(notes, options = {}) {
  const {
    gridSize = 0.0625, // 1/16 note à 120 BPM (0.5s par beat / 8 = 0.0625s)
    strength = 0.8,
    quantizeEnd = false,
  } = options;

  logger.info(`Quantification: grille=${gridSize * 1000}ms, force=${strength}`);

  return notes.map((note) => {
    const quantizedNote = { ...note };

    // Quantifier le début
    const startGrid = Math.round(note.start / gridSize);
    const quantizedStart = startGrid * gridSize;
    quantizedNote.start = note.start + (quantizedStart - note.start) * strength;

    // Quantifier la fin si demandé
    if (quantizeEnd) {
      const endGrid = Math.round(note.end / gridSize);
      const quantizedEnd = endGrid * gridSize;
      quantizedNote.end = note.end + (quantizedEnd - note.end) * strength;
    } else {
      // Conserver la durée originale
      const duration = note.end - note.start;
      quantizedNote.end = quantizedNote.start + duration;
    }

    // Assurer durée minimum
    if (quantizedNote.end <= quantizedNote.start) {
      quantizedNote.end = quantizedNote.start + gridSize;
    }

    return quantizedNote;
  });
}

/**
 * Calcule la taille de grille optimale basée sur le tempo
 * @param {number} tempo - Tempo en BPM
 * @param {number} subdivision - Subdivision (4=1/4, 8=1/8, 16=1/16)
 * @returns {number} - Taille de grille en secondes
 */
export function getGridSize(tempo = 120, subdivision = 16) {
  const beatDuration = 60 / tempo; // Durée d'un beat en secondes
  return beatDuration / (subdivision / 4); // Division par subdivision
}

/**
 * Quantification intelligente avec détection de tempo
 * @param {Array} notes - Notes à quantifier
 * @param {number} detectedTempo - Tempo détecté (BPM)
 * @param {Object} options - Options supplémentaires
 * @returns {Array} - Notes quantifiées
 */
export function smartQuantize(notes, detectedTempo = 120, options = {}) {
  const {
    subdivision = 16, // 1/16 notes par défaut
    strength = 0.8,
    quantizeEnd = false,
  } = options;

  const gridSize = getGridSize(detectedTempo, subdivision);

  logger.info(
    `Quantification smart: tempo=${detectedTempo} BPM, subdivision=1/${subdivision}, grille=${(gridSize * 1000).toFixed(1)}ms`
  );

  return quantize(notes, { gridSize, strength, quantizeEnd });
}
