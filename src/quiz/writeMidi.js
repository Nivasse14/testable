/**
 * Écriture MIDI manuelle - Génère fichier MIDI binaire sans dépendance
 */

import { writeFileSync } from 'fs';
import Logger from '../utils/logger.js';

const logger = new Logger('WRITE-MIDI');

export default function writeMidi(notes, outMidiPath, options = {}) {
  const {
    tempo = 120,
    ppq = 480,
    instrument = 13,
    trackName = 'Xylophone Melody',
  } = options;

  logger.info(`Écriture MIDI: ${notes.length} notes`);
  logger.info(`  → Instrument: GM ${instrument}, Tempo: ${tempo} BPM`);

  const midiBytes = buildMidiFile(notes, { tempo, ppq, instrument, trackName });
  writeFileSync(outMidiPath, Buffer.from(midiBytes));

  logger.success(`✓ MIDI écrit: ${outMidiPath}`);
  return outMidiPath;
}

function buildMidiFile(notes, { tempo, ppq, instrument, trackName }) {
  const bytes = [];
  
  // Header
  bytes.push(...str('MThd'), ...i32(6), ...i16(1), ...i16(2), ...i16(ppq));
  
  // Track 0: Metadata
  const t0 = [];
  t0.push(...vl(0), 0xFF, 0x03, ...vl(trackName.length), ...str(trackName));
  const us = Math.round(60000000 / tempo);
  t0.push(...vl(0), 0xFF, 0x51, 0x03, (us >> 16) & 0xFF, (us >> 8) & 0xFF, us & 0xFF);
  t0.push(...vl(0), 0xFF, 0x58, 0x04, 4, 2, 24, 8);
  t0.push(...vl(0), 0xFF, 0x2F, 0x00);
  bytes.push(...str('MTrk'), ...i32(t0.length), ...t0);
  
  // Track 1: Notes
  const t1 = [];
  t1.push(...vl(0), 0xC0, instrument);
  
  const events = [];
  notes.forEach(n => {
    const st = Math.round(n.start * (tempo / 60) * ppq);
    const et = Math.round(n.end * (tempo / 60) * ppq);
    events.push({ tick: st, on: true, pitch: n.pitch, vel: n.velocity });
    events.push({ tick: et, on: false, pitch: n.pitch, vel: 0 });
  });
  events.sort((a, b) => a.tick - b.tick);
  
  let last = 0;
  events.forEach(e => {
    const d = e.tick - last;
    t1.push(...vl(d), e.on ? 0x90 : 0x80, e.pitch, e.vel);
    last = e.tick;
  });
  t1.push(...vl(0), 0xFF, 0x2F, 0x00);
  bytes.push(...str('MTrk'), ...i32(t1.length), ...t1);
  
  return bytes;
}

function str(s) { return Array.from(Buffer.from(s, 'ascii')); }
function i32(v) { return [(v >> 24) & 0xFF, (v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF]; }
function i16(v) { return [(v >> 8) & 0xFF, v & 0xFF]; }
function vl(v) {
  if (v === 0) return [0];
  const b = [];
  let x = v;
  while (x > 0) { b.unshift(x & 0x7F); x >>= 7; }
  for (let i = 0; i < b.length - 1; i++) b[i] |= 0x80;
  return b;
}
