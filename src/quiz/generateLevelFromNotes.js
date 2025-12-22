/**
 * Génère un level 3D à partir de notes MIDI
 * Mapping: pitch -> hauteur/couleur, velocity -> intensité, duration -> longueur tile
 */

import Logger from '../utils/logger.js';
import CONFIG from '../config.js';

const logger = new Logger('LEVEL-NOTES');

/**
 * Génère un level 3D depuis des notes MIDI
 * @param {Array} notes - Notes [{t, pitch, duration, velocity}]
 * @param {Object} metadata - { originalTrackName, difficulty, hookStart, hookEnd, transposeSemitones }
 * @param {number} variantIndex - Index de palette de couleurs
 * @returns {Object} - Level JSON compatible avec Blender
 */
export function generateLevelFromNotes(notes, metadata, variantIndex = 0) {
  logger.info(`Génération level 3D depuis ${notes.length} notes`);

  if (notes.length === 0) {
    throw new Error('Aucune note pour générer le level');
  }

  const fps = CONFIG.video.fps;
  
  // Convertir format notes si nécessaire (start/end → t/duration)
  const normalizedNotes = notes.map(n => ({
    t: n.start !== undefined ? n.start : n.t,
    duration: n.end !== undefined ? (n.end - n.start) : n.duration,
    pitch: n.pitch,
    velocity: n.velocity,
  }));
  
  const duration = normalizedNotes[normalizedNotes.length - 1].t + normalizedNotes[normalizedNotes.length - 1].duration;

  // Créer les plateformes à partir des notes
  const platforms = normalizedNotes.map((note, index) => {
    // Position X: variation sinusoïdale basée sur le pitch
    const x = Math.sin(note.pitch * 0.1) * 2.0;

    // Position Y: hauteur basée sur le pitch MIDI (C4 = 60)
    // Mapping: pitch 48-84 (C3-C6) -> Y 0-6
    const minPitch = 48;
    const maxPitch = 84;
    const normalizedPitch = Math.max(0, Math.min(1, (note.pitch - minPitch) / (maxPitch - minPitch)));
    const y = 1.0 + normalizedPitch * 5.0; // Y entre 1 et 6

    // Position Z: progression linéaire dans le temps
    const z = note.t * 2.5;

    // Taille de la plateforme basée sur duration
    const baseSize = [1.2, 0.12, 1.2];
    const lengthFactor = Math.min(note.duration * 0.5 + 0.8, 2.0); // Plus longue si note longue
    const size = [
      baseSize[0] * lengthFactor,
      baseSize[1],
      baseSize[2],
    ];

    // Rotation aléatoire légère
    const rotation = [0, (Math.random() - 0.5) * 20, 0];

    // Intensité basée sur velocity
    const intensity = note.velocity / 127;

    // Couleur basée sur le pitch (cycle chromatique)
    const colorIndex = note.pitch % 12;

    return {
      t: note.t,
      pos: [x, y, z],
      size,
      rot: rotation,  // Blender expects 'rot'
      intensity,
      colorIndex,
      pitch: note.pitch,
      velocity: note.velocity,
      duration: note.duration,
    };
  });

  // Style visuel
  const style = selectQuizStyle(variantIndex);

  // Caméra settings
  const camera = {
    follow_smooth: CONFIG.camera.followSmooth,
    look_ahead: CONFIG.camera.lookAhead,
    fov: CONFIG.camera.fov,
    shake_intensity: 0.01, // Moins de shake pour quiz mode
  };

  // Balle settings
  const ball = {
    radius: CONFIG.physics.ballRadius,
    restitution: 0.95, // Plus bouncy pour notes musicales
    friction: CONFIG.physics.ballFriction,
  };

  const level = {
    fps,
    duration,
    bpm: 120, // Placeholder
    gravity: CONFIG.physics.gravity,
    ball,
    camera,
    platforms,
    style,
    metadata: {
      mode: 'quiz_xylophone',
      ...metadata,
      notesCount: notes.length,
    },
  };

  logger.success(`Level généré: ${platforms.length} plateformes`);
  return level;
}

/**
 * Sélectionne un style visuel pour quiz mode
 */
function selectQuizStyle(variantIndex) {
  const palettes = CONFIG.styles.palettes;
  const palette = palettes[variantIndex % palettes.length];

  // Mapping des 12 notes chromatiques aux couleurs
  const chromaticColors = generateChromaticColors(palette.platforms);

  return {
    name: `quiz_${palette.name}`,
    palette: {
      name: `quiz_${palette.name}`,
      ball: palette.ball,
      platforms: chromaticColors,
      background: '#1a1a3a',  // Background plus lumineux (au lieu de palette.background trop sombre)
    },
    glow_intensity: 3.0,  // Émission plus forte (était 1.5)
    bloom_strength: CONFIG.render.bloomIntensity,
    fog_density: 0.008,  // Fog réduit pour meilleure visibilité (était 0.015)
    dof: {
      enabled: false,
      aperture: 2.8,
      focus_dist: 10,
    },
  };
}

/**
 * Génère 12 couleurs pour les notes chromatiques
 */
function generateChromaticColors(baseColors) {
  const colors = [];
  
  // Si moins de 12 couleurs de base, interpoler
  while (colors.length < 12) {
    for (const color of baseColors) {
      colors.push(color);
      if (colors.length >= 12) break;
    }
  }

  return colors.slice(0, 12);
}
