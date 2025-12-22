/**
 * Vérification des outils externes requis
 * Vérifie : basic-pitch, fluidsynth, ffmpeg
 */

import { execSync } from 'child_process';
import Logger from '../utils/logger.js';

const logger = new Logger('TOOLS');

const REQUIRED_TOOLS = {
  'basic-pitch': {
    command: 'basic-pitch',
    checkArgs: ['--version'],
    installHelp: 'pip3 install basic-pitch',
    description: 'Audio to MIDI transcription (Spotify)',
  },
  'fluidsynth': {
    command: 'fluidsynth',
    checkArgs: ['--version'],
    installHelp: 'brew install fluid-synth (macOS) | apt install fluidsynth (Linux)',
    description: 'MIDI to WAV synthesis',
  },
  'ffmpeg': {
    command: 'ffmpeg',
    checkArgs: ['-version'],
    installHelp: 'brew install ffmpeg (macOS) | apt install ffmpeg (Linux)',
    description: 'Audio conversion',
  },
};

/**
 * Vérifie qu'un outil est disponible dans PATH
 */
function checkTool(toolName) {
  const tool = REQUIRED_TOOLS[toolName];
  if (!tool) {
    throw new Error(`Outil inconnu: ${toolName}`);
  }

  try {
    execSync(`which ${tool.command}`, { stdio: 'pipe', encoding: 'utf-8' });
    return { available: true, path: execSync(`which ${tool.command}`, { encoding: 'utf-8' }).trim() };
  } catch {
    return { available: false, tool };
  }
}

/**
 * Vérifie tous les outils requis
 * @param {Array<string>} requiredTools - Liste des outils à vérifier (default: tous)
 * @returns {Object} - { allAvailable: boolean, results: {...}, missing: [...] }
 */
export default function toolsCheck(requiredTools = Object.keys(REQUIRED_TOOLS)) {
  logger.info('Vérification des outils requis...');

  const results = {};
  const missing = [];

  for (const toolName of requiredTools) {
    const result = checkTool(toolName);
    results[toolName] = result;

    if (result.available) {
      logger.success(`✓ ${toolName}: ${result.path}`);
    } else {
      logger.error(`✗ ${toolName}: NON TROUVÉ`);
      logger.warn(`  → ${result.tool.description}`);
      logger.warn(`  → Installation: ${result.tool.installHelp}`);
      missing.push(toolName);
    }
  }

  const allAvailable = missing.length === 0;

  if (!allAvailable) {
    const error = new Error(`Outils manquants: ${missing.join(', ')}`);
    error.missing = missing;
    error.results = results;
    throw error;
  }

  logger.success(`Tous les outils sont disponibles (${requiredTools.length})`);
  return { allAvailable: true, results, missing: [] };
}

/**
 * Vérifie un outil spécifique
 */
export function checkSingleTool(toolName) {
  const result = checkTool(toolName);
  if (!result.available) {
    throw new Error(`${toolName} non disponible. ${result.tool.installHelp}`);
  }
  return result;
}
