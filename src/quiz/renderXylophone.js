/**
 * Rendu audio xylophone depuis MIDI via FluidSynth
 * Wrapper Node.js pour fluidsynth CLI
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { dirname } from 'path';
import Logger from '../utils/logger.js';
import { ensureDir } from '../utils/fsx.js';
import { checkSingleTool } from './toolsCheck.js';

const logger = new Logger('FLUIDSYNTH');

/**
 * Rend un fichier MIDI en WAV via FluidSynth
 * @param {string} midiPath - Chemin du fichier MIDI
 * @param {string} soundfontPath - Chemin du soundfont SF2
 * @param {string} outWavPath - Chemin de sortie WAV
 * @param {Object} options - Options FluidSynth
 * @returns {Promise<string>} - Chemin du WAV généré
 */
export default async function renderXylophone(midiPath, soundfontPath, outWavPath, options = {}) {
  const {
    sampleRate = 44100,
    gain = 1.0, // 0.0 - 10.0
    reverb = false,
    chorus = false,
    timeout = 120000, // 2 minutes
  } = options;

  // Vérifier FluidSynth disponible
  checkSingleTool('fluidsynth');

  // Vérifier fichiers existent
  if (!existsSync(midiPath)) {
    throw new Error(`MIDI introuvable: ${midiPath}`);
  }
  if (!existsSync(soundfontPath)) {
    throw new Error(`Soundfont introuvable: ${soundfontPath}`);
  }

  // Créer répertoire de sortie
  await ensureDir(dirname(outWavPath));

  logger.info(`Rendu xylophone: ${midiPath}`);
  logger.info(`  → Soundfont: ${soundfontPath}`);
  logger.info(`  → Output: ${outWavPath}`);
  logger.info(`  → Sample rate: ${sampleRate} Hz, Gain: ${gain}`);

  // Construire commande FluidSynth (syntaxe v2.5+)
  const args = [
    '-ni', // Non-interactive
    '-F', outWavPath, // Fast render AVANT soundfont
    '-r', sampleRate.toString(),
    '-g', gain.toString(),
  ];

  // Options effets
  if (!reverb) args.push('-R', '0'); // Désactiver reverb
  if (!chorus) args.push('-C', '0'); // Désactiver chorus
  
  // Soundfont et MIDI en dernier
  args.push(soundfontPath, midiPath);

  const startTime = Date.now();

  await new Promise((resolve, reject) => {
    const proc = spawn('fluidsynth', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          logger.debug(line.trim());
        }
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`FluidSynth timeout après ${timeout}ms`));
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);

      if (code !== 0) {
        logger.error(`FluidSynth failed with code ${code}`);
        logger.error(`stderr: ${stderr}`);
        reject(new Error(`FluidSynth exited with code ${code}`));
      } else {
        resolve();
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Erreur exec FluidSynth: ${err.message}`));
    });
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Vérifier fichier créé
  if (!existsSync(outWavPath)) {
    throw new Error(`WAV non généré: ${outWavPath}`);
  }

  logger.success(`✓ Xylophone rendu en ${elapsed}s: ${outWavPath}`);

  return outWavPath;
}

/**
 * Trouve un soundfont xylophone par défaut
 * Cherche dans les emplacements communs
 */
export function findDefaultSoundfont() {
  const commonPaths = [
    './soundfonts/FluidR3_GM.sf2',
    './soundfonts/xylophone.sf2',
    './assets/sf2/xylophone.sf2',
    '/usr/share/sounds/sf2/FluidR3_GM.sf2',
    '/usr/share/soundfonts/FluidR3_GM.sf2',
  ];

  for (const path of commonPaths) {
    if (existsSync(path)) {
      logger.info(`Soundfont trouvé: ${path}`);
      return path;
    }
  }

  throw new Error(
    'Soundfont introuvable. Télécharge FluidR3_GM.sf2 et place-le dans ./soundfonts/'
  );
}
