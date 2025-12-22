/**
 * Génération inverse de level 3D
 * Placement intelligent des plateformes pour une trajectoire 3D fluide
 */

import Logger from '../utils/logger.js';
import CONFIG from '../config.js';

const logger = new Logger('LEVEL');

/**
 * Génère un level 3D à partir des events audio
 * @param {Object} events - Events audio (onsets, beats, energy)
 * @param {number} variantIndex - Index de variante pour style
 * @returns {Object} - Level JSON
 */
export function generateLevel(events, variantIndex = 0) {
  logger.info(`Génération level 3D (variant ${variantIndex})`);

  const { duration, onsets, energy, bpm } = events;
  const fps = CONFIG.video.fps;

  // Sélection des onsets significatifs
  const selectedOnsets = selectSignificantOnsets(onsets);
  logger.info(`${selectedOnsets.length} plateformes sélectionnées`);

  // Génération des plateformes 3D
  const platforms = generatePlatforms3D(selectedOnsets, duration);

  // Style visuel basé sur la variante
  const style = selectStyle(variantIndex, energy);

  // Caméra settings
  const camera = {
    follow_smooth: CONFIG.camera.followSmooth,
    look_ahead: CONFIG.camera.lookAhead,
    fov: CONFIG.camera.fov,
    shake_intensity: CONFIG.camera.shakeIntensity,
  };

  // Balle settings
  const ball = {
    radius: CONFIG.physics.ballRadius,
    restitution: CONFIG.physics.ballRestitution,
    friction: CONFIG.physics.ballFriction,
  };

  const level = {
    fps,
    duration,
    bpm,
    gravity: CONFIG.physics.gravity,
    ball,
    camera,
    platforms,
    style,
  };

  logger.success('Level généré avec succès');
  return level;
}

/**
 * Sélectionne les onsets les plus significatifs
 */
function selectSignificantOnsets(onsets) {
  // Tri par force décroissante
  const sorted = [...onsets].sort((a, b) => b.strength - a.strength);

  // Seuil dynamique basé sur la distribution
  const threshold = CONFIG.level.onsetThreshold;
  const significant = sorted.filter(o => o.strength >= threshold);

  // Limite au nombre max de plateformes
  const maxPlatforms = CONFIG.level.maxPlatforms;
  const selected = significant.slice(0, maxPlatforms);

  // Retri chronologique
  selected.sort((a, b) => a.t - b.t);

  return selected;
}

/**
 * Génère les plateformes 3D avec placement intelligent
 */
function generatePlatforms3D(onsets, duration) {
  const platforms = [];
  const spacing = CONFIG.level.platformSpacing;

  let z = 0;  // Progression en profondeur
  let y = 0;  // Hauteur (varie)

  for (let i = 0; i < onsets.length; i++) {
    const onset = onsets[i];
    const intensity = onset.strength;

    // Position X: variation latérale douce (sinusoïdale)
    const x = Math.sin(i * 0.5) * 1.5;

    // Position Y: hauteur varie doucement avec progression
    const yVariation = Math.sin(i * 0.3) * 0.8;
    y = 2 + yVariation;

    // Position Z: avance régulièrement
    z = i * spacing;

    // Rotation: angles faibles pour fluidité
    const rotX = 0;
    const rotY = (Math.random() - 0.5) * 10 * (Math.PI / 180);  // ±10°
    const rotZ = (Math.random() - 0.5) * 15 * (Math.PI / 180);  // ±15°

    // Taille: varie avec l'intensité
    const [minW, minH, minD] = CONFIG.level.platformSizeMin;
    const [maxW, maxH, maxD] = CONFIG.level.platformSizeMax;

    const sizeW = minW + (maxW - minW) * intensity;
    const sizeH = minH + (maxH - minH) * 0.5;
    const sizeD = minD + (maxD - minD) * intensity;

    platforms.push({
      t: onset.t,
      pos: [x, y, z],
      rot: [rotX, rotY, rotZ],
      size: [sizeW, sizeH, sizeD],
      intensity,
    });
  }

  // Post-traitement: lissage des positions
  smoothPlatformPositions(platforms);

  return platforms;
}

/**
 * Lisse les positions pour éviter les sauts brusques
 */
function smoothPlatformPositions(platforms) {
  if (platforms.length < 3) return;

  for (let i = 1; i < platforms.length - 1; i++) {
    const prev = platforms[i - 1];
    const curr = platforms[i];
    const next = platforms[i + 1];

    // Moyenne des Y voisins
    curr.pos[1] = (prev.pos[1] + curr.pos[1] + next.pos[1]) / 3;
  }
}

/**
 * Sélectionne et applique un style visuel
 */
function selectStyle(variantIndex, energy) {
  const palettes = CONFIG.styles.palettes;
  const palette = palettes[variantIndex % palettes.length];

  // Intensité moyenne de l'énergie
  const avgEnergy = energy.reduce((sum, e) => sum + e.rms, 0) / energy.length;

  // Ajustements basés sur l'énergie
  const bloomStrength = CONFIG.styles.bloomStrength * (0.8 + avgEnergy * 0.4);
  const fogDensity = CONFIG.styles.fogDensity * (1 + avgEnergy * 0.3);

  return {
    palette: {
      name: palette.name,
      ball: palette.ball,
      platforms: palette.platforms,
      background: palette.background,
      fog: palette.fog,
    },
    bloom_strength: bloomStrength,
    glow_intensity: CONFIG.styles.glowIntensity,
    fog_density: fogDensity,
    dof: {
      focus_dist: CONFIG.camera.dofFocusDistance,
      aperture: CONFIG.camera.dofAperture,
    },
  };
}

/**
 * Rend le level loopable (optionnel)
 */
export function makeLoopable(level) {
  logger.info('Application du loop parfait');

  // Ajuster la dernière plateforme pour qu'elle ramène vers le début
  const platforms = level.platforms;
  if (platforms.length > 2) {
    const first = platforms[0];
    const last = platforms[platforms.length - 1];

    // Position finale similaire à la première
    last.pos[0] = first.pos[0];
    last.pos[1] = first.pos[1];
  }

  return level;
}

export default generateLevel;
