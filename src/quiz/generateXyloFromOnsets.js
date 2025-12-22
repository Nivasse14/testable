/**
 * Génère audio xylophone depuis onsets (pas de MIDI)
 * Plus fiable que extraction MIDI
 */
import { spawn } from 'child_process';
import { join } from 'path';
import Logger from '../utils/logger.js';

const logger = new Logger('XYLO-ONSETS');

export async function generateXyloFromOnsets(onsets, duration, outputPath) {
  logger.info(`Génération xylophone depuis ${onsets.length} onsets`);
  
  // Extraire fréquences dominantes à chaque onset
  const notes = await extractPitchAtOnsets(onsets);
  
  // Créer samples xylophone
  const samples = notes.map(note => ({
    time: note.t,
    pitch: note.pitch,
    velocity: note.energy
  }));
  
  // Mixer avec sox ou ffmpeg
  await mixXyloSamples(samples, duration, outputPath);
  
  logger.success(`Xylophone généré: ${outputPath}`);
  return outputPath;
}

async function extractPitchAtOnsets(onsets) {
  // TODO: Utiliser librosa ou essentia pour pitch detection
  // Pour l'instant, simulation
  return onsets.map((t, i) => ({
    t,
    pitch: 60 + (i % 24), // Simulation
    energy: 0.8
  }));
}

async function mixXyloSamples(samples, duration, outputPath) {
  // TODO: Implémenter avec sox ou générer wav programmatically
  logger.warn('mixXyloSamples not implemented yet');
}
