import { readFileSync } from 'fs';
import MidiParser from 'midi-parser-js';

const midiData = readFileSync('data/midi/leo_10s_basic_pitch.mid');
const parsed = MidiParser.parse(midiData);

console.log('Time Division (PPQ):', parsed.timeDivision);
console.log('Tracks:', parsed.track.length);
console.log('\nTrack 1 (first 20 events):');

let time = 0;
parsed.track[1].event.slice(0, 20).forEach((e, i) => {
  time += e.deltaTime;
  console.log(`${i}. time=${time} delta=${e.deltaTime} type=${e.type} data=${JSON.stringify(e.data)}`);
});
