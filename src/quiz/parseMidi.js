/**
 * Parse fichier MIDI en notes structurées
 * Format unifié pour pipeline : {start, end, pitch, velocity, channel, track}
 */

import { readFileSync } from 'fs';
import MidiParser from 'midi-parser-js';
import Logger from '../utils/logger.js';

const logger = new Logger('MIDI-PARSER');

/**
 * Parse un fichier MIDI et extrait les notes au format unifié
 * @param {string} midiPath - Chemin du fichier MIDI
 * @returns {Object} - { notes: [{start, end, pitch, velocity, channel, track}], tempo, ppq }
 */
export function parseMidi(midiPath) {
  const isProfessional = midiPath.includes('data/midi/');
  logger.info(`Parsing MIDI${isProfessional ? ' 🎵 PROFESSIONNEL' : ''}: ${midiPath}`);

  const midiData = readFileSync(midiPath);
  const parsed = MidiParser.parse(midiData);

  // 1. Extraire le tempo global (généralement dans track 0)
  let tempo = 500000; // Microseconds per quarter note (default 120 BPM)
  const ppq = parsed.timeDivision; // Pulses per quarter note

  // Chercher le tempo dans toutes les tracks
  for (const track of parsed.track) {
    for (const event of track.event) {
      if (event.type === 255 && event.metaType === 81) {
        // midi-parser-js convertit déjà les bytes en nombre
        tempo = typeof event.data === 'number' ? event.data : 
                ((event.data[0] << 16) | (event.data[1] << 8) | event.data[2]);
        break;
      }
    }
    if (tempo !== 500000) break; // Found tempo, stop searching
  }

  // 2. Extraction des notes de toutes les pistes
  const notes = [];

  // Parcourir toutes les pistes
  parsed.track.forEach((track, trackIndex) => {
    const activeNotes = new Map(); // noteNumber -> { time, velocity, channel }

    let currentTime = 0; // En ticks MIDI

    track.event.forEach((event) => {
      currentTime += event.deltaTime;

      // Note On
      if (event.type === 9 && event.data && event.data[1] > 0) {
        const noteNumber = event.data[0];
        const velocity = event.data[1];
        const channel = event.channel || 0;
        activeNotes.set(noteNumber, {
          startTick: currentTime,
          velocity,
          channel,
        });
      }

      // Note Off (ou Note On avec velocity 0)
      if (
        (event.type === 8) ||
        (event.type === 9 && event.data && event.data[1] === 0)
      ) {
        const noteNumber = event.data[0];
        if (activeNotes.has(noteNumber)) {
          const noteStart = activeNotes.get(noteNumber);
          const durationTicks = currentTime - noteStart.startTick;

          // Conversion ticks -> secondes
          const startTime = ticksToSeconds(noteStart.startTick, tempo, ppq);
          const endTime = ticksToSeconds(currentTime, tempo, ppq);

          notes.push({
            start: startTime,
            end: endTime,
            pitch: noteNumber,
            velocity: noteStart.velocity,
            channel: noteStart.channel,
            track: trackIndex,
          });

          activeNotes.delete(noteNumber);
        }
      }
    });

    // Notes non terminées (extends to end)
    activeNotes.forEach((noteStart, noteNumber) => {
      const startTime = ticksToSeconds(noteStart.startTick, tempo, ppq);
      const endTime = startTime + 0.5; // 500ms par défaut
      notes.push({
        start: startTime,
        end: endTime,
        pitch: noteNumber,
        velocity: noteStart.velocity,
        channel: noteStart.channel,
        track: trackIndex,
      });
    });
  });

  // Trier par temps
  notes.sort((a, b) => a.start - b.start);

  const tempoBPM = 60000000 / tempo;
  logger.success(`${notes.length} notes extraites, tempo: ${tempoBPM.toFixed(1)} BPM`);

  return {
    notes,
    tempo: tempoBPM, // BPM
    ppq,
    tempoMicroseconds: tempo,
  };
}

/**
 * Convertit des ticks MIDI en secondes
 */
function ticksToSeconds(ticks, tempo, ppq) {
  // tempo = microseconds per quarter note
  // ppq = pulses (ticks) per quarter note
  // time(s) = (ticks / ppq) * (tempo / 1000000)
  return (ticks / ppq) * (tempo / 1000000);
}

export default parseMidi;
