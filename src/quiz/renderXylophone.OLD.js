/**
 * Rend un fichier MIDI en WAV avec soundfont xylophone
 * Utilise FluidSynth + transposition
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, basename, extname } from 'path';
import Logger from '../utils/logger.js';
import retry from '../utils/retry.js';

const logger = new Logger('XYLOPHONE');

/**
 * Rend un MIDI en WAV xylophone avec transposition
 * @param {string} midiPath - Chemin du fichier MIDI
 * @param {string} outputPath - Chemin du fichier WAV de sortie
 * @param {Object} options - { transposeSemitones, soundfontPath }
 * @returns {Promise<string>} - Chemin du WAV généré
 */
export async function renderXylophone(midiPath, outputPath, options = {}) {
  const {
    transposeSemitones = 12, // +1 octave par défaut
    soundfontPath = null,
  } = options;

  logger.info(`Rendu xylophone: transpose +${transposeSemitones} semitones`);

  // Vérifier FluidSynth
  try {
    await runCommand('fluidsynth', ['--version'], { capture: true });
  } catch (error) {
    throw new Error(
      'fluidsynth non trouvé. Installez: brew install fluidsynth (macOS) ou apt install fluidsynth (Linux)'
    );
  }

  // Chercher soundfont xylophone
  const soundfont = soundfontPath || await findSoundfont();

  // Si transposition nécessaire, créer un MIDI transposé temporaire
  let midiToRender = midiPath;
  if (transposeSemitones !== 0) {
    midiToRender = await transposeMidi(midiPath, transposeSemitones);
  }

  // FluidSynth command
  // fluidsynth -ni -F [output.wav] -r 44100 -g 1.0 [soundfont] [midi]
  const args = [
    '-ni',              // Non-interactive
    '-F', outputPath,   // Output WAV
    '-r', '44100',      // Sample rate
    '-g', '1.0',        // Gain
    soundfont,          // Soundfont file
    midiToRender,       // MIDI input
  ];

  await retry(async () => {
    await runCommand('fluidsynth', args);
  }, 1);

  // Nettoyer fichier temporaire transposé
  if (midiToRender !== midiPath) {
    (await import('fs')).unlinkSync(midiToRender);
  }

  if (!existsSync(outputPath)) {
    throw new Error(`WAV non généré: ${outputPath}`);
  }

  logger.success(`Xylophone WAV généré: ${outputPath}`);
  return outputPath;
}

/**
 * Cherche un soundfont xylophone
 */
async function findSoundfont() {
  // Chemins possibles de soundfonts
  const candidates = [
    '/usr/share/sounds/sf2/FluidR3_GM.sf2',           // Linux
    '/usr/share/soundfonts/FluidR3_GM.sf2',
    '/opt/homebrew/share/sound/sf2/FluidR3_GM.sf2',   // macOS Homebrew
    './soundfonts/xylophone.sf2',                     // Local
    './soundfonts/FluidR3_GM.sf2',
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      logger.info(`Soundfont trouvé: ${path}`);
      return path;
    }
  }

  throw new Error(
    'Soundfont introuvable. Téléchargez FluidR3_GM.sf2 ou un soundfont xylophone.\n' +
    'Exemple: mkdir soundfonts && cd soundfonts && ' +
    'wget https://keymusician01.s3.amazonaws.com/FluidR3_GM.zip && unzip FluidR3_GM.zip'
  );
}

/**
 * Transpose un fichier MIDI (créé un nouveau fichier temporaire)
 * Utilise un utilitaire externe ou manipulation binaire
 */
async function transposeMidi(midiPath, semitones) {
  const { readFileSync, writeFileSync } = await import('fs');
  const { tmpdir } = await import('os');
  
  const trackName = basename(midiPath, extname(midiPath));
  const transposedPath = join(tmpdir(), `${trackName}_transpose.mid`);

  // Stratégie simple: utiliser midi-transpose CLI si disponible
  // Sinon, manipulation basique du MIDI (note events)
  
  try {
    // Tenter avec utilitaire externe
    await runCommand('midi-transpose', [
      '-t', semitones.toString(),
      midiPath,
      transposedPath,
    ], { capture: true });
    
    return transposedPath;
  } catch (error) {
    // Fallback: transposition manuelle binaire (simplifié)
    logger.warn('midi-transpose non trouvé, transposition manuelle basique');
    
    const midiData = readFileSync(midiPath);
    const transposed = Buffer.from(midiData);
    
    // Parcourir et modifier les note events (0x90, 0x80)
    for (let i = 0; i < transposed.length - 2; i++) {
      const byte = transposed[i];
      
      // Note On (0x90-0x9F) ou Note Off (0x80-0x8F)
      if ((byte & 0xF0) === 0x90 || (byte & 0xF0) === 0x80) {
        const noteNumber = transposed[i + 1];
        const newNote = Math.max(0, Math.min(127, noteNumber + semitones));
        transposed[i + 1] = newNote;
      }
    }
    
    writeFileSync(transposedPath, transposed);
    return transposedPath;
  }
}

/**
 * Exécute une commande CLI
 */
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: options.capture ? 'pipe' : 'inherit',
    });

    let stdout = '';
    let stderr = '';

    if (options.capture) {
      proc.stdout?.on('data', (data) => (stdout += data.toString()));
      proc.stderr?.on('data', (data) => (stderr += data.toString()));
    }

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${command} échoué (code ${code}): ${stderr || stdout}`));
      } else {
        resolve(stdout);
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`${command} erreur: ${err.message}`));
    });
  });
}
