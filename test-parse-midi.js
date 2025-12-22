import { parseMidi } from './src/quiz/parseMidi.js';

const midiPath = 'data/midi/leo_10s_basic_pitch.mid';
const result = parseMidi(midiPath);
const notes = result.notes;

console.log(`Total notes: ${notes.length}`);
console.log(`Tempo: ${result.tempo.toFixed(1)} BPM\n`);

if (notes.length > 0) {
  console.log('First 10 notes:');
  notes.slice(0, 10).forEach((n, i) => {
    console.log(`${i+1}. t=${n.t.toFixed(2)}s pitch=${n.pitch} dur=${n.duration.toFixed(3)}s vel=${n.velocity}`);
  });
  
  console.log('\nStatistics:');
  const durations = notes.map(n => n.duration);
  const minDur = Math.min(...durations);
  const maxDur = Math.max(...durations);
  const avgDur = durations.reduce((a,b) => a+b, 0) / durations.length;
  console.log(`Duration range: ${minDur.toFixed(3)}s - ${maxDur.toFixed(3)}s (avg: ${avgDur.toFixed(3)}s)`);
}
