/**
 * Pipeline orchestrateur
 * Gère le batch processing avec cache et variantes
 */

import { join, basename, extname } from 'path';
import { spawn } from 'child_process';
import Logger from './utils/logger.js';
import CONFIG from './config.js';
import { ensureDir, readJSON, writeJSON, listFiles, fileExists, removeDir, fileHash } from './utils/fsx.js';
import { analyzeAudio } from './audio/analyzeAudio.node.js';
import { generateLevel } from './level/generateLevel.js';
import { encodeVideo, getVideoInfo } from './export/encodeVideo.js';
import retry from './utils/retry.js';

// Quiz mode imports (legacy)
import { extractMidi } from './quiz/extractMidi.js';
import { parseMidi } from './quiz/parseMidi.js';
import { simplifyMelody } from './quiz/simplifyMelody.js';
import { chooseHook } from './quiz/chooseHook.js';
import { generateLevelFromNotes } from './quiz/generateLevelFromNotes.js';
import useProfessionalMidi from './quiz/useProfessionalMidi.js';

// Nouveau pipeline MIDI propre
import { audioToMelodyMidiAndWav } from './quiz/midiPipeline.js';

const logger = new Logger('PIPELINE');

export async function processSingleTrack(audioPath, variantIndex = 0) {
  const startTime = Date.now();
  const trackName = basename(audioPath, extname(audioPath));

  logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  logger.info(`Traitement: ${trackName}`);
  logger.info(`Variante: ${variantIndex}`);
  logger.info(`Mode: ${CONFIG.mode === 'quiz_xylophone' ? 'QUIZ XYLOPHONE 🎵' : CONFIG.mode === 'midi_clean' ? 'MIDI CLEAN 🎹' : 'NORMAL'}`);
  logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  try {
    // MODE MIDI CLEAN (nouveau pipeline propre)
    if (CONFIG.mode === 'midi_clean') {
      return await processMidiClean(audioPath, trackName, variantIndex, startTime);
    }

    // MODE QUIZ XYLOPHONE (legacy, compatible ancien système)
    if (CONFIG.mode === 'quiz_xylophone') {
      return await processQuizXylophone(audioPath, trackName, variantIndex, startTime);
    }

    // MODE NORMAL
    // 1. ANALYSE AUDIO
    logger.info('\n[1/5] Analyse audio...');
    const eventsPath = join(CONFIG.paths.data, `${trackName}_events.json`);
    
    let events;
    if (fileExists(eventsPath)) {
      logger.info('Utilisation cache events.json');
      events = await readJSON(eventsPath);
    } else {
      events = await analyzeAudio(audioPath, eventsPath);
    }

    // 2. GÉNÉRATION LEVEL
    logger.info('\n[2/5] Génération level 3D...');
    const level = generateLevel(events, variantIndex);
    const levelPath = join(CONFIG.paths.data, `${trackName}_level_v${variantIndex}.json`);
    await writeJSON(levelPath, level);
    logger.success(`Level sauvegardé: ${levelPath}`);

    // 3. RENDU BLENDER
    logger.info('\n[3/5] Rendu Blender...');
    const framesDir = join(CONFIG.paths.frames, `${trackName}_v${variantIndex}`);
    await ensureDir(framesDir);

    if (!CONFIG.skipRender) {
      await renderBlender(levelPath, framesDir);
    } else {
      logger.warn('Rendu skippé (SKIP_RENDER=true)');
    }

    // 4. ENCODAGE VIDÉO
    logger.info('\n[4/5] Encodage vidéo...');
    const outputDir = join(CONFIG.paths.output, trackName);
    await ensureDir(outputDir);
    const outputPath = join(outputDir, `variant_${variantIndex.toString().padStart(2, '0')}.mp4`);

    await encodeVideo(framesDir, audioPath, outputPath);

    // Info vidéo
    try {
      const info = await getVideoInfo(outputPath);
      const duration = parseFloat(info.format.duration).toFixed(2);
      const sizeMB = (parseInt(info.format.size) / 1024 / 1024).toFixed(2);
      logger.info(`Durée: ${duration}s, Taille: ${sizeMB}MB`);
    } catch (error) {
      logger.debug('Info vidéo non disponible');
    }

    // 5. NETTOYAGE
    logger.info('\n[5/5] Nettoyage...');
    if (!CONFIG.keepFrames) {
      removeDir(framesDir);
      logger.success('Frames supprimées');
    } else {
      logger.info('Frames conservées');
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info('\n' + '━'.repeat(45));
    logger.success(`✨ Génération terminée en ${elapsed}s`);
    logger.info(`Vidéo: ${outputPath}`);
    logger.info('━'.repeat(45) + '\n');

    return {
      success: true,
      outputPath,
      trackName,
      variantIndex,
      elapsedSeconds: elapsed,
    };

  } catch (error) {
    logger.error('Erreur pipeline', error.message);
    if (CONFIG.debug) {
      logger.error(error.stack);
    }

    return {
      success: false,
      error: error.message,
      trackName,
      variantIndex,
    };
  }
}

/**
 * Lance Blender en mode headless pour le rendu
 */
async function renderBlender(levelPath, framesDir) {
  const blenderPath = CONFIG.blender.path;
  const scriptPath = CONFIG.paths.blenderScript;

  if (!fileExists(blenderPath)) {
    throw new Error(`Blender introuvable: ${blenderPath}\nVérifiez BLENDER_PATH dans .env`);
  }

  if (!fileExists(scriptPath)) {
    throw new Error(`Script Blender introuvable: ${scriptPath}`);
  }

  return retry(async () => {
    return new Promise((resolve, reject) => {
      const args = [
        '-b',  // Background (headless)
        '-P', scriptPath,  // Python script
        '--',
        '--level', levelPath,
        '--outFrames', framesDir,
      ];

      logger.info(`Lancement Blender: ${blenderPath}`);
      logger.debug(`Args: ${args.join(' ')}`);

      const process = spawn(blenderPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
        // Log en temps réel
        const lines = data.toString().trim().split('\n');
        lines.forEach(line => {
          if (line.includes('ERROR')) {
            logger.error(line);
          } else if (line.includes('SUCCESS')) {
            logger.success(line);
          } else if (line.includes('Rendering') || line.includes('Frame') || line.includes('Created')) {
            logger.info(line);
          } else {
            logger.debug(line);
          }
        });
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
        logger.debug(data.toString().trim());
      });

      process.on('close', (code) => {
        if (code !== 0) {
          logger.error('Blender stderr:', stderr.slice(-1000));
          reject(new Error(`Blender échoué (code ${code})`));
        } else {
          logger.success('Rendu Blender terminé');
          resolve();
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Erreur spawn Blender: ${error.message}`));
      });
    });
  }, {
    maxAttempts: 1,  // Pas de retry pour Blender (trop long)
  });
}

/**
 * Pipeline spécifique pour mode QUIZ XYLOPHONE
async function processQuizXylophone(audioPath, trackName, variantIndex, startTime) {
  const difficulty = CONFIG.quiz.difficulty;
  const hookDuration = CONFIG.quiz.hookDuration;
  const transposeSemitones = CONFIG.quiz.transposeSemitones[difficulty];

  // 1. EXTRACTION MIDI
  logger.info('\n[1/7] Vérification MIDI professionnel...');
  const midiDir = join(CONFIG.paths.data, 'midi');
  await ensureDir(midiDir);
  
  // Cherche d'abord un MIDI pro, sinon fallback sur basic-pitch
  let midiPath = await useProfessionalMidi(audioPath);
  if (!midiPath) {
    logger.info('→ Fallback sur basic-pitch (qualité moyenne)...');
    midiPath = await extractMidi(audioPath, midiDir);
  }

  // 2. PARSING MIDI
  // 2. PARSING MIDI
  logger.info('\n[2/7] Parsing MIDI...');
  const { notes, tempo } = parseMidi(midiPath);
  logger.success(`${notes.length} notes extraites, tempo: ${tempo.toFixed(1)} BPM`);

  // 3. SIMPLIFICATION MÉLODIQUE
  logger.info(`\n[3/7] Simplification mélodie (${difficulty})...`);
  const simplifiedNotes = simplifyMelody(notes, difficulty);

  // 4. SÉLECTION DU HOOK
  logger.info(`\n[4/7] Sélection hook (${hookDuration}s)...`);
  const { hookNotes, start: hookStart, end: hookEnd, score } = chooseHook(
    simplifiedNotes,
    hookDuration
  );

  // 5. RENDU XYLOPHONE
  logger.info(`\n[5/7] Rendu xylophone (transpose +${transposeSemitones})...`);
  const xylophoneDir = join(CONFIG.paths.data, 'xylophone');
  await ensureDir(xylophoneDir);
  const xylophonePath = join(xylophoneDir, `${trackName}_xylo_v${variantIndex}.wav`);

  await renderXylophone(midiPath, xylophonePath, {
    transposeSemitones,
    soundfontPath: CONFIG.quiz.soundfontPath,
  });

  // 6. GÉNÉRATION LEVEL 3D
  logger.info('\n[6/7] Génération level 3D depuis notes...');
  const metadata = {
    originalTrackName: trackName,
    difficulty,
    hookStart,
    hookEnd,
    transposeSemitones,
    hookScore: score,
  };

  const level = generateLevelFromNotes(hookNotes, metadata, variantIndex);
  const levelPath = join(CONFIG.paths.data, `${trackName}_quiz_level_v${variantIndex}.json`);
  await writeJSON(levelPath, level);
  logger.success(`Level sauvegardé: ${levelPath}`);

  // 7. RENDU BLENDER
  logger.info('\n[7/7] Rendu Blender...');
  const framesDir = join(CONFIG.paths.frames, `${trackName}_quiz_v${variantIndex}`);
  await ensureDir(framesDir);

  if (!CONFIG.skipRender) {
    await renderBlender(levelPath, framesDir);
  } else {
    logger.warn('Rendu skippé (SKIP_RENDER=true)');
  }

  // 8. ENCODAGE VIDÉO avec audio xylophone
  logger.info('\n[8/7] Encodage vidéo final...');
  const outputDir = join(CONFIG.paths.output, `${trackName}_quiz`);
  await ensureDir(outputDir);
  const outputPath = join(outputDir, `variant_${variantIndex.toString().padStart(2, '0')}.mp4`);

  await encodeVideo(framesDir, xylophonePath, outputPath);

  // Info vidéo
  try {
    const info = await getVideoInfo(outputPath);
    const duration = parseFloat(info.format.duration).toFixed(2);
    const sizeMB = (parseInt(info.format.size) / 1024 / 1024).toFixed(2);
    logger.info(`Durée: ${duration}s, Taille: ${sizeMB}MB`);
  } catch (error) {
    logger.debug('Info vidéo non disponible');
  }

  // 9. NETTOYAGE
  logger.info('\n[9/7] Nettoyage...');
  if (!CONFIG.keepFrames) {
    removeDir(framesDir);
    logger.success('Frames supprimées');
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  logger.info('\n' + '━'.repeat(45));
  logger.success(`✨ Quiz xylophone généré en ${elapsed}s`);
  logger.info(`Vidéo: ${outputPath}`);
  logger.info(`Hook: ${hookStart.toFixed(1)}s - ${hookEnd.toFixed(1)}s`);
  logger.info(`Difficulté: ${difficulty}, Transpose: +${transposeSemitones}`);
  logger.info('━'.repeat(45) + '\n');

  return {
    success: true,
    outputPath,
    trackName,
    variantIndex,
    elapsedSeconds: elapsed,
    metadata,
  };
}

/**
 * MODE: MIDI CLEAN (nouveau pipeline professionnel)
 * Audio → MIDI brut → MIDI propre → Xylophone WAV → Vidéo
 */
async function processMidiClean(audioPath, trackName, variantIndex, startTime) {
  logger.info('\n🎹 MODE: MIDI CLEAN PIPELINE\n');

  // 1. PIPELINE MIDI COMPLET
  logger.info('[1/3] Pipeline MIDI: Audio → MIDI propre → Xylophone WAV');
  
  const midiResult = await audioToMelodyMidiAndWav(audioPath, {
    workDir: CONFIG.midiPipeline.workDir,
    transposeSemitones: CONFIG.midiPipeline.transposeSemitones,
    minDurationMs: CONFIG.midiPipeline.minNoteDurationMs,
    maxNoteDurationSec: CONFIG.midiPipeline.maxNoteDurationSec,
    velocityMin: CONFIG.midiPipeline.velocityMin,
    velocityMax: CONFIG.midiPipeline.velocityMax,
    enableQuantize: CONFIG.midiPipeline.enableQuantize,
    quantizeStrength: CONFIG.midiPipeline.quantizeStrength,
    chooseHook: CONFIG.midiPipeline.chooseHook,
    hookDurationSec: CONFIG.midiPipeline.hookDurationSec,
    soundfontPath: CONFIG.midiPipeline.soundfontPath,
    gain: CONFIG.midiPipeline.gain,
    sampleRate: CONFIG.midiPipeline.sampleRate,
    instrument: CONFIG.midiPipeline.instrument,
    difficulty: CONFIG.midiPipeline.difficulty,
  });

  logger.success(`✓ MIDI pipeline terminé: ${midiResult.notesCount.clean} notes`);

  // 2. GÉNÉRATION LEVEL 3D depuis notes MIDI
  logger.info('\n[2/3] Génération level 3D depuis MIDI...');
  
  // Reparser le MIDI propre pour générer le level
  const { notes: cleanNotes } = parseMidi(midiResult.melodyMidiPath);
  
  const metadata = {
    originalTrackName: trackName,
    difficulty: midiResult.difficulty,
    hookStart: midiResult.hookStart,
    hookEnd: midiResult.hookEnd,
    transposeSemitones: midiResult.transposeSemitones,
    notesCount: midiResult.notesCount.clean,
    midiCleanPipeline: true,
  };

  const level = generateLevelFromNotes(cleanNotes, metadata, variantIndex);
  const levelPath = join(CONFIG.paths.data, `${trackName}_midi_clean_level_v${variantIndex}.json`);
  await writeJSON(levelPath, level);
  logger.success(`Level sauvegardé: ${levelPath} (${level.platforms.length} plateformes)`);

  // 3. RENDU BLENDER
  logger.info('\n[3/3] Rendu Blender...');
  const framesDir = join(CONFIG.paths.frames, `${trackName}_midi_v${variantIndex}`);
  await ensureDir(framesDir);

  if (!CONFIG.skipRender) {
    await renderBlender(levelPath, framesDir);
  } else {
    logger.warn('Rendu skippé (SKIP_RENDER=true)');
  }

  // 4. ENCODAGE VIDÉO FINALE
  logger.info('\nEncodage vidéo finale...');
  const outputPath = join(CONFIG.paths.output, `${trackName}_midi_clean_v${variantIndex}.mp4`);
  await encodeVideo(framesDir, midiResult.xylophoneWavPath, outputPath, {
    fps: 30,
    preset: 'medium',
  });

  // Nettoyage frames si demandé
  if (!CONFIG.keepFrames) {
    logger.info('Nettoyage frames...');
    await removeDir(framesDir);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  logger.info('\n' + '━'.repeat(45));
  logger.success(`✨ Vidéo MIDI Clean générée en ${elapsed}s`);
  logger.info(`Vidéo: ${outputPath}`);
  logger.info(`MIDI brut: ${midiResult.rawMidiPath}`);
  logger.info(`MIDI propre: ${midiResult.melodyMidiPath}`);
  logger.info(`Xylophone: ${midiResult.xylophoneWavPath}`);
  logger.info(`Notes: ${midiResult.notesCount.raw} → ${midiResult.notesCount.clean}`);
  logger.info(`Transpose: +${midiResult.transposeSemitones} demi-tons`);
  logger.info('━'.repeat(45) + '\n');

  return {
    success: true,
    outputPath,
    trackName,
    variantIndex,
    elapsedSeconds: elapsed,
    midiResult,
    metadata,
  };
}

/**
 * Pipeline batch
 */
export async function processBatch(audioFiles) {
  const startTime = Date.now();
  const results = [];

  logger.info(`\n🎬 BATCH: ${audioFiles.length} pistes`);

  for (const audioPath of audioFiles) {
    try {
      const result = await processSingleTrack(audioPath, 0, startTime);
      results.push(result);
    } catch (error) {
      logger.error(`Erreur: ${audioPath}`);
      results.push({ success: false, audioPath, error: error.message });
    }
  }

  // Statistiques
  const successful = results.filter(r => r.success).length;
  logger.info(`\n✅ ${successful}/${audioFiles.length} vidéos générées`);

  // Sauvegarde rapport
  const reportPath = join(CONFIG.paths.output, 'batch_report.json');
  await writeJSON(reportPath, results);
  logger.success(`Rapport: ${reportPath}`);

  return results;
}

export default {
  processSingleTrack,
  processBatch,
};
