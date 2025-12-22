#!/usr/bin/env node

/**
 * Test rapide du mode quiz xylophone
 * Sans rendu Blender pour tester le pipeline complet rapidement
 */

import { extractMidi } from './src/quiz/extractMidi.js';
import { parseMidi } from './src/quiz/parseMidi.js';
import { simplifyMelody } from './src/quiz/simplifyMelody.js';
import { chooseHook } from './src/quiz/chooseHook.js';
import { generateLevelFromNotes } from './src/quiz/generateLevelFromNotes.js';
import { ensureDir, writeJSON } from './src/utils/fsx.js';
import { join } from 'path';

const audioFile = process.argv[2] || './audio/leo_10s.mp3';
const difficulty = process.argv[3] || 'medium';

console.log('🎵 Test Quiz Xylophone Pipeline');
console.log(`Audio: ${audioFile}`);
console.log(`Difficulty: ${difficulty}\n`);

async function test() {
  try {
    // 1. Extract MIDI
    console.log('1️⃣  Extracting MIDI...');
    await ensureDir('./data/midi');
    const midiPath = await extractMidi(audioFile, './data/midi');
    console.log(`   ✓ MIDI: ${midiPath}\n`);

    // 2. Parse MIDI
    console.log('2️⃣  Parsing MIDI...');
    const { notes, tempo } = parseMidi(midiPath);
    console.log(`   ✓ ${notes.length} notes, tempo: ${tempo.toFixed(1)} BPM\n`);

    // 3. Simplify
    console.log(`3️⃣  Simplifying (${difficulty})...`);
    const simplified = simplifyMelody(notes, difficulty);
    console.log(`   ✓ ${simplified.length} notes after simplification\n`);

    // 4. Choose Hook
    console.log('4️⃣  Choosing best hook...');
    const { hookNotes, start, end, score } = chooseHook(simplified, 8.0);
    console.log(`   ✓ Hook: ${start.toFixed(1)}s - ${end.toFixed(1)}s (score: ${score.toFixed(2)})`);
    console.log(`   ✓ ${hookNotes.length} notes in hook\n`);

    // 5. Generate Level
    console.log('5️⃣  Generating 3D level...');
    const metadata = {
      originalTrackName: 'test',
      difficulty,
      hookStart: start,
      hookEnd: end,
      transposeSemitones: 12,
      hookScore: score,
    };
    const level = generateLevelFromNotes(hookNotes, metadata, 0);
    
    const levelPath = './data/test_quiz_level.json';
    await writeJSON(levelPath, level);
    console.log(`   ✓ Level saved: ${levelPath}`);
    console.log(`   ✓ ${level.platforms.length} platforms\n`);

    // Summary
    console.log('✅ Pipeline test successful!');
    console.log(`\nNext steps:`);
    console.log(`  1. Install: pip3 install basic-pitch`);
    console.log(`  2. Install: brew install fluidsynth`);
    console.log(`  3. Download soundfont: mkdir soundfonts && cd soundfonts`);
    console.log(`  4. Run full: MODE=quiz_xylophone node src/index.js ${audioFile}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('basic-pitch')) {
      console.log('\n💡 Install basic-pitch: pip3 install basic-pitch');
    }
    process.exit(1);
  }
}

test();
