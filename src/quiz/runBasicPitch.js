/**
 * Wrapper Node.js pour basic-pitch (Spotify Audio-to-MIDI)
 * Exécute basic-pitch en CLI et récupère le MIDI généré
 */

import { spawn } from 'child_process';
import { join, basename, extname } from 'path';
import { existsSync, readdirSync } from 'fs';
import Logger from '../utils/logger.js';
import { checkSingleTool } from './toolsCheck.js';

const logger = new Logger('BASIC-PITCH');

/**
 * Exécute basic-pitch pour extraire MIDI depuis audio
 * @param {string} inputAudioPath - Chemin du fichier audio
 * @param {string} outDir - Répertoire de sortie
 * @param {Object} options - Options basic-pitch
 * @returns {Promise<string>} - Chemin du fichier MIDI généré
 */
export default async function runBasicPitch(inputAudioPath, outDir, options = {}) {
  const {
    timeout = 180000, // 3 minutes timeout
    onset_threshold = 0.5,
    frame_threshold = 0.3,
    minimum_note_length = 127.70, // ms
    minimum_frequency = 80, // Hz (xylophone range)
    maximum_frequency = 4000, // Hz
  } = options;

  // Vérifier que basic-pitch est disponible
  checkSingleTool('basic-pitch');

  if (!existsSync(inputAudioPath)) {
    throw new Error(`Fichier audio introuvable: ${inputAudioPath}`);
  }

  logger.info(`Extraction MIDI: ${basename(inputAudioPath)}`);
  logger.info(`  → Sortie: ${outDir}`);

  const args = [
    outDir,
    inputAudioPath,
    '--save-midi',
    '--onset-threshold', onset_threshold.toString(),
    '--frame-threshold', frame_threshold.toString(),
    '--minimum-note-length', minimum_note_length.toString(),
    '--minimum-frequency', minimum_frequency.toString(),
    '--maximum-frequency', maximum_frequency.toString(),
  ];

  const startTime = Date.now();

  await new Promise((resolve, reject) => {
    const proc = spawn('basic-pitch', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      // basic-pitch affiche sa progression sur stderr
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          logger.debug(line.trim());
        }
      }
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Timeout après ${timeout}ms`));
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        logger.error(`basic-pitch failed with code ${code}`);
        logger.error(`stderr: ${stderr}`);
        reject(new Error(`basic-pitch exited with code ${code}`));
      } else {
        resolve();
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Erreur exec basic-pitch: ${err.message}`));
    });
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  logger.success(`Extraction terminée en ${elapsed}s`);

  // Trouver le fichier MIDI généré
  const trackName = basename(inputAudioPath, extname(inputAudioPath));
  const expectedMidiPath = join(outDir, `${trackName}_basic_pitch.mid`);

  if (existsSync(expectedMidiPath)) {
    logger.success(`MIDI généré: ${expectedMidiPath}`);
    return expectedMidiPath;
  }

  // Chercher dans le répertoire si le nom ne correspond pas
  const files = readdirSync(outDir).filter((f) => f.endsWith('.mid'));
  if (files.length > 0) {
    const foundPath = join(outDir, files[0]);
    logger.warn(`MIDI trouvé avec nom différent: ${foundPath}`);
    return foundPath;
  }

  throw new Error(`MIDI non généré dans ${outDir}`);
}

/**
 * Version avec retry automatique
 */
export async function runBasicPitchWithRetry(inputAudioPath, outDir, options = {}, maxRetries = 2) {
  const { retries = maxRetries } = options;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await runBasicPitch(inputAudioPath, outDir, options);
    } catch (error) {
      if (attempt <= retries) {
        logger.warn(`Tentative ${attempt} échouée, retry...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        throw error;
      }
    }
  }
}
