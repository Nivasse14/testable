/**
 * Pipeline MIDI complet : Audio → MIDI propre → Xylophone WAV
 * Orchestration de toutes les étapes de transformation
 */

import { join, basename, extname } from 'path';
import Logger from '../utils/logger.js';
import { ensureDir } from '../utils/fsx.js';
import toolsCheck from './toolsCheck.js';
import runBasicPitch from './runBasicPitch.js';
import parseMidi from './parseMidi.js';
import cleanMelody from './cleanMelody.js';
import writeMidi from './writeMidi.js';
import renderXylophone, { findDefaultSoundfont } from './renderXylophone.js';

const logger = new Logger('MIDI-PIPELINE');

/**
 * Pipeline complet : Audio → MIDI brut → MIDI propre → Xylophone WAV
 * 
 * @param {string} inputAudioPath - Chemin du fichier audio (.mp3/.wav)
 * @param {Object} options - Options du pipeline
 * @returns {Promise<Object>} - Résultats complets
 */
export async function audioToMelodyMidiAndWav(inputAudioPath, options = {}) {
  const {
    // Répertoires
    workDir = './work',
    
    // Nettoyage mélodie
    transposeSemitones = 12, // +1 octave
    minDurationMs = 110,
    maxNoteDurationSec = 0.6,
    velocityMin = 70,
    velocityMax = 115,
    
    // Quantification
    enableQuantize = false,
    quantizeStrength = 0.8,
    tempo = 120,
    
    // Hook (extrait court)
    chooseHook = false,
    hookDurationSec = 8,
    
    // Rendu
    soundfontPath = null, // null = auto-detect
    gain = 1.0,
    sampleRate = 44100,
    
    // Instrument MIDI
    instrument = 13, // 13 = Xylophone, 11 = Vibraphone, 14 = Tubular Bells
    
    // Difficultés presets
    difficulty = null, // 'easy' | 'medium' | 'hard'
  } = options;

  const startTime = Date.now();
  const trackName = basename(inputAudioPath, extname(inputAudioPath));

  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info(`🎵 MIDI PIPELINE: ${trackName}`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Créer work directory
  const trackWorkDir = join(workDir, trackName);
  await ensureDir(trackWorkDir);

  const result = {
    trackName,
    workDir: trackWorkDir,
    rawMidiPath: null,
    melodyMidiPath: null,
    xylophoneWavPath: null,
    hookStart: 0,
    hookEnd: 0,
    notesCount: {
      raw: 0,
      clean: 0,
    },
    tempo: 120,
    transposeSemitones,
    difficulty: difficulty || 'custom',
    elapsed: 0,
  };

  try {
    // ═══════════════════════════════════════════════════════════
    // ÉTAPE 0: Vérification des outils
    // ═══════════════════════════════════════════════════════════
    logger.info('\n[0/6] Vérification des outils...');
    toolsCheck(['basic-pitch', 'fluidsynth']);
    logger.success('✓ Tous les outils disponibles\n');

    // ═══════════════════════════════════════════════════════════
    // ÉTAPE 1: Extraction MIDI brut (basic-pitch)
    // ═══════════════════════════════════════════════════════════
    logger.info('[1/6] Extraction MIDI brut...');
    result.rawMidiPath = await runBasicPitch(inputAudioPath, trackWorkDir, {
      minimum_note_length: minDurationMs,
      minimum_frequency: 80,
      maximum_frequency: 4000,
    });
    logger.success(`✓ MIDI brut: ${result.rawMidiPath}\n`);

    // ═══════════════════════════════════════════════════════════
    // ÉTAPE 2: Parsing MIDI
    // ═══════════════════════════════════════════════════════════
    logger.info('[2/6] Parsing MIDI...');
    const { notes: rawNotes, tempo: detectedTempo } = parseMidi(result.rawMidiPath);
    result.notesCount.raw = rawNotes.length;
    result.tempo = detectedTempo;
    logger.success(`✓ ${rawNotes.length} notes extraites, tempo: ${detectedTempo.toFixed(1)} BPM\n`);

    // ═══════════════════════════════════════════════════════════
    // ÉTAPE 3: Nettoyage mélodie (polyphonique → monophonique)
    // ═══════════════════════════════════════════════════════════
    logger.info('[3/6] Nettoyage mélodie...');
    
    // Appliquer preset difficulté si spécifié
    let cleanOptions = {
      transposeSemitones,
      minDurationMs,
      maxNoteDurationSec,
      velocityMin,
      velocityMax,
      enableQuantize,
      quantizeStrength,
      tempo: detectedTempo,
      chooseHook,
      hookDurationSec,
    };

    if (difficulty) {
      cleanOptions = applyDifficultyPreset(difficulty, cleanOptions, detectedTempo);
    }

    const { cleanNotes, stats } = cleanMelody(rawNotes, cleanOptions);
    result.notesCount.clean = cleanNotes.length;
    result.hookStart = stats.hookStart;
    result.hookEnd = stats.hookEnd;
    
    logger.success(`✓ Mélodie nettoyée: ${cleanNotes.length} notes finales`);
    if (chooseHook) {
      logger.success(`  Hook: ${result.hookStart.toFixed(2)}s - ${result.hookEnd.toFixed(2)}s`);
    }
    logger.info('');

    // ═══════════════════════════════════════════════════════════
    // ÉTAPE 4: Écriture MIDI propre
    // ═══════════════════════════════════════════════════════════
    logger.info('[4/6] Écriture MIDI propre...');
    result.melodyMidiPath = join(trackWorkDir, 'melody_xylophone.mid');
    writeMidi(cleanNotes, result.melodyMidiPath, {
      tempo: detectedTempo,
      instrument,
      trackName: `${trackName} - Xylophone`,
    });
    logger.success(`✓ MIDI propre: ${result.melodyMidiPath}\n`);

    // ═══════════════════════════════════════════════════════════
    // ÉTAPE 5: Détection soundfont
    // ═══════════════════════════════════════════════════════════
    logger.info('[5/6] Recherche soundfont...');
    const finalSoundfontPath = soundfontPath || findDefaultSoundfont();
    logger.success(`✓ Soundfont: ${finalSoundfontPath}\n`);

    // ═══════════════════════════════════════════════════════════
    // ÉTAPE 6: Rendu xylophone (FluidSynth)
    // ═══════════════════════════════════════════════════════════
    logger.info('[6/6] Rendu audio xylophone...');
    result.xylophoneWavPath = join(trackWorkDir, 'xylophone.wav');
    await renderXylophone(result.melodyMidiPath, finalSoundfontPath, result.xylophoneWavPath, {
      sampleRate,
      gain,
      reverb: false,
      chorus: false,
    });
    logger.success(`✓ Xylophone WAV: ${result.xylophoneWavPath}\n`);

    // ═══════════════════════════════════════════════════════════
    // FIN
    // ═══════════════════════════════════════════════════════════
    result.elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.success(`✨ PIPELINE TERMINÉ en ${result.elapsed}s`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`📁 Work dir: ${trackWorkDir}`);
    logger.info(`🎼 MIDI brut: ${basename(result.rawMidiPath)} (${result.notesCount.raw} notes)`);
    logger.info(`🎵 MIDI propre: ${basename(result.melodyMidiPath)} (${result.notesCount.clean} notes)`);
    logger.info(`🎹 Xylophone: ${basename(result.xylophoneWavPath)}`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return result;

  } catch (error) {
    logger.error(`❌ Pipeline échoué: ${error.message}`);
    throw error;
  }
}

/**
 * Applique un preset de difficulté
 */
function applyDifficultyPreset(difficulty, baseOptions, tempo) {
  const presets = {
    easy: {
      transposeSemitones: 12, // +1 octave
      minDurationMs: 150, // Notes plus longues
      maxNoteDurationSec: 0.8,
      enableQuantize: true,
      quantizeStrength: 0.9, // Quantize fort
      chooseHook: true,
      hookDurationSec: 7,
    },
    medium: {
      transposeSemitones: 12,
      minDurationMs: 110,
      maxNoteDurationSec: 0.6,
      enableQuantize: true,
      quantizeStrength: 0.7,
      chooseHook: true,
      hookDurationSec: 8,
    },
    hard: {
      transposeSemitones: 19, // +1 octave + 5th
      minDurationMs: 90,
      maxNoteDurationSec: 0.5,
      enableQuantize: false, // Pas de quantize (timing original)
      chooseHook: true,
      hookDurationSec: 9,
    },
  };

  const preset = presets[difficulty];
  if (!preset) {
    logger.warn(`Difficulté inconnue: ${difficulty}, utilisation des options par défaut`);
    return baseOptions;
  }

  logger.info(`Preset ${difficulty.toUpperCase()} appliqué`);
  return { ...baseOptions, ...preset, tempo };
}

export default audioToMelodyMidiAndWav;
