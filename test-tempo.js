import { readFileSync } from 'fs';
import MidiParser from 'midi-parser-js';

const midiData = readFileSync('data/midi/leo_10s_basic_pitch.mid');
const parsed = MidiParser.parse(midiData);

for (let i = 0; i < parsed.track.length; i++) {
  console.log(`\nTrack ${i}:`);
  for (const event of parsed.track[i].event) {
    if (event.type === 255 && event.metaType === 81) {
      console.log('  Tempo event found!');
      console.log('  event.data:', event.data);
      console.log('  typeof event.data:', typeof event.data);
      const bytes = event.data;
      const tempo = (bytes[0] << 16) | (bytes[1] << 8) | bytes[2];
      console.log(`  Calculated tempo: ${tempo}µs`);
      console.log(`  BPM: ${60000000 / tempo}`);
    }
  }
}
