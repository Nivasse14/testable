#!/usr/bin/env node

/**
 * Point d'entrée principal
 * Gère les arguments CLI et lance le pipeline
 */

import { existsSync } from 'fs';
import { resolve } from 'path';
import Logger from './utils/logger.js';
import CONFIG from './config.js';
import { processSingleTrack, processBatch } from './pipeline.js';
import { ensureDir } from './utils/fsx.js';

const logger = new Logger('MAIN');

function showHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║            TIKTOK 3D VIDEO GENERATOR v2.0                     ║
║        Génération automatique de vidéos 3D avec Blender       ║
╚═══════════════════════════════════════════════════════════════╝

USAGE:
  node src/index.js <audio_file> [variant]      Génère une vidéo
  node src/index.js --batch                      Mode batch (tous les fichiers)
  node src/index.js --help                       Affiche l'aide

EXEMPLES:
  node src/index.js audio/song.mp3               Variante 0
  node src/index.js audio/song.mp3 2             Variante 2
  node src/index.js --batch                      Batch complet

OPTIONS:
  --batch         Traite tous les fichiers du dossier audio/
  --single        Alias pour mode single
  --help, -h      Affiche cette aide

CONFIGURATION:
  Fichier .env (ou variables d'environnement):
  - BLENDER_PATH        Chemin vers Blender
  - FFMPEG_PATH         Chemin vers FFmpeg
  - VARIANTS_PER_TRACK  Nombre de variantes par piste (batch)
  - FPS                 Images par seconde (30)
  - SAMPLES             Qualité rendu Blender (64)

SORTIES:
  Vidéos:  ./output/<track_name>/variant_XX.mp4
  Données: ./data/<track>_events.json, <track>_level_vX.json
  Logs:    Console avec progression en temps réel

PRÉREQUIS:
  1. Node.js >= 18
  2. Blender >= 3.0 installé
  3. FFmpeg installé
  4. Python 3 avec librosa (optionnel)
     pip3 install librosa numpy

SETUP:
  1. Copier .env.example vers .env
  2. Ajuster BLENDER_PATH et FFMPEG_PATH
  3. Placer vos fichiers audio dans ./audio/
  4. npm start
`);
}

function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  // Mode batch
  if (args.includes('--batch')) {
    return { mode: 'batch' };
  }

  // Mode single - le premier argument est le fichier audio
  const audioPath = args[0];
  
  if (!audioPath || audioPath.startsWith('--')) {
    logger.error('Fichier audio requis');
    showHelp();
    process.exit(1);
  }

  const absolutePath = resolve(audioPath);

  if (!existsSync(absolutePath)) {
    logger.error(`Fichier introuvable: ${absolutePath}`);
    process.exit(1);
  }

  // Variante - deuxième argument optionnel
  let variant = 0;
  if (args[1] && !isNaN(parseInt(args[1]))) {
    variant = parseInt(args[1]);
  }

  return { mode: 'single', audioPath: absolutePath, variant };
}

async function checkDependencies() {
  // Vérifier Blender
  if (!existsSync(CONFIG.blender.path)) {
    logger.error(`Blender introuvable: ${CONFIG.blender.path}`);
    logger.error('Définissez BLENDER_PATH dans .env');
    logger.error('macOS: /Applications/Blender.app/Contents/MacOS/Blender');
    logger.error('Linux: /usr/bin/blender');
    logger.error('Windows: C:\\Program Files\\Blender Foundation\\Blender\\blender.exe');
    return false;
  }

  // Vérifier FFmpeg
  try {
    const { execSync } = await import('child_process');
    execSync(`${CONFIG.ffmpeg.path} -version`, { stdio: 'ignore' });
  } catch (error) {
    logger.error('FFmpeg introuvable');
    logger.error('Installez FFmpeg: https://ffmpeg.org/download.html');
    logger.error('macOS: brew install ffmpeg');
    logger.error('Linux: sudo apt install ffmpeg');
    return false;
  }

  // Mode Quiz: vérifier dépendances supplémentaires
  if (CONFIG.mode === 'quiz_xylophone') {
    return await checkQuizDependencies();
  }

  return true;
}

/**
 * Vérifications spécifiques au mode quiz xylophone
 */
async function checkQuizDependencies() {
  const { execSync } = await import('child_process');
  const { existsSync } = await import('fs');
  let allOk = true;

  // basic-pitch (cherche dans pyenv d'abord)
  const basicPitchPaths = [
    '/Users/mounissamynivasse/.pyenv/versions/bubbles-quiz/bin/basic-pitch',
    'basic-pitch',
  ];
  
  let basicPitchFound = false;
  for (const path of basicPitchPaths) {
    try {
      if (path.startsWith('/')) {
        if (existsSync(path)) {
          execSync(`${path} --version 2>&1 | head -1`, { stdio: 'ignore' });
          basicPitchFound = true;
          break;
        }
      } else {
        execSync('basic-pitch --version', { stdio: 'ignore' });
        basicPitchFound = true;
        break;
      }
    } catch {}
  }
  
  if (basicPitchFound) {
    logger.success('✓ basic-pitch installé');
  } else {
    logger.error('✗ basic-pitch non trouvé');
    logger.error('  Installez: pip3 install basic-pitch');
    allOk = false;
  }

  // fluidsynth
  try {
    execSync('fluidsynth --version', { stdio: 'ignore' });
    logger.success('✓ fluidsynth installé');
  } catch (error) {
    logger.error('✗ fluidsynth non trouvé');
    logger.error('  macOS: brew install fluidsynth');
    logger.error('  Linux: sudo apt install fluidsynth');
    allOk = false;
  }

  // Soundfont (warning seulement)
  const soundfontPaths = [
    '/usr/share/sounds/sf2/FluidR3_GM.sf2',
    '/usr/share/soundfonts/FluidR3_GM.sf2',
    '/opt/homebrew/share/sound/sf2/FluidR3_GM.sf2',
    './soundfonts/FluidR3_GM.sf2',
    CONFIG.quiz.soundfontPath,
  ].filter(Boolean);

  const soundfontFound = soundfontPaths.some(path => existsSync(path));
  if (soundfontFound) {
    logger.success('✓ Soundfont trouvé');
  } else {
    logger.warn('⚠ Soundfont non trouvé (sera auto-téléchargé si nécessaire)');
    logger.warn('  Recommandé: télécharger FluidR3_GM.sf2 dans ./soundfonts/');
  }

  return allOk;
}

async function initializeDirs() {
  await ensureDir(CONFIG.paths.audio);
  await ensureDir(CONFIG.paths.output);
  await ensureDir(CONFIG.paths.data);
  await ensureDir(CONFIG.paths.frames);
  await ensureDir(CONFIG.paths.cache);
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════╗
║      TIKTOK 3D VIDEO GENERATOR v2.0           ║
║          Powered by Blender + Node.js         ║
╚═══════════════════════════════════════════════╝
`);

  // Check dépendances
  const depsOk = await checkDependencies();
  if (!depsOk) {
    process.exit(1);
  }

  // Init dossiers
  await initializeDirs();

  // Parse arguments
  const options = parseArgs();

  try {
    if (options.mode === 'batch') {
      logger.info('Mode BATCH');
      await processBatch();
    } else {
      logger.info(`Mode SINGLE: ${options.audioPath} (variant ${options.variant})`);
      await processSingleTrack(options.audioPath, options.variant);
    }

    logger.success('\n🎉 Terminé!');
    process.exit(0);

  } catch (error) {
    logger.error('Erreur fatale', error.message);
    if (CONFIG.debug) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}

// Gestion erreurs
process.on('uncaughtException', (error) => {
  logger.error('Exception non catchée', error.message);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Promise rejection', reason);
  process.exit(1);
});

// Lancement
main();
