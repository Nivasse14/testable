/**
 * Extract MIDI from audio using basic-pitch
 */

import { spawn, execSync } from 'child_process';
import { join, basename, extname } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import Logger from '../utils/logger.js';
import { fileHash } from '../utils/fsx.js';
import retry from '../utils/retry.js';

const logger = new Logger('MIDI');

export async function extractMidi(audioPath, outputDir) {
  const trackName = basename(audioPath, extname(audioPath));
  const midiPath = join(outputDir, `${trackName}_basic_pitch.mid`);
  const cacheFile = join(outputDir, `${trackName}_midi.hash`);
  const currentHash = await fileHash(audioPath);

  if (existsSync(midiPath) && existsSync(cacheFile)) {
    const cachedHash = readFileSync(cacheFile, 'utf-8').trim();
    if (cachedHash === currentHash) {
      logger.info(`Utilisation cache MIDI: ${midiPath}`);
      return midiPath;
    }
  }

  logger.info(`Extraction MIDI avec basic-pitch: ${audioPath}`);

  const basicPitchCmd = findBasicPitch();
  try {
    await runCommand(basicPitchCmd, ['--help'], { capture: true });
  } catch (error) {
    throw new Error('basic-pitch non trouvé. pip3 install basic-pitch');
  }

  const args = [outputDir, audioPath, '--save-midi'];
  await retry(async () => { await runCommand(basicPitchCmd, args); }, 1);

  if (!existsSync(midiPath)) throw new Error(`MIDI non généré: ${midiPath}`);

  writeFileSync(cacheFile, currentHash, 'utf-8');
  logger.success(`MIDI extrait: ${midiPath}`);
  return midiPath;
}

function findBasicPitch() {
  const paths = [
    '/Users/mounissamynivasse/.pyenv/versions/bubbles-quiz/bin/basic-pitch',
    'basic-pitch',
    '/Library/Frameworks/Python.framework/Versions/3.13/bin/basic-pitch'
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      return p;
    }
    // Fallback: try which command for non-absolute paths
    if (!p.startsWith('/')) {
      try {
        execSync(`which ${p}`, { stdio: 'ignore' });
        return p;
      } catch {}
    }
  }
  return 'basic-pitch';
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: options.capture ? 'pipe' : 'inherit' });
    let stdout = '', stderr = '';
    if (options.capture) {
      proc.stdout?.on('data', d => stdout += d);
      proc.stderr?.on('data', d => stderr += d);
    }
    proc.on('close', code => code !== 0 ? reject(new Error(`${command} failed ${code}`)) : resolve(stdout));
    proc.on('error', err => reject(err));
  });
}
