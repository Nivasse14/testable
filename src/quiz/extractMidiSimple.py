#!/usr/bin/env python3
"""
Alternative simple à basic-pitch pour extraire MIDI
Utilise aubio pour pitch detection + mido pour MIDI writing
"""

import sys
import argparse
import aubio
import numpy as np
from mido import MidiFile, MidiTrack, Message

def extract_midi_simple(audio_path, output_midi):
    """Extrait les notes d'un fichier audio et génère un MIDI"""
    
    # Paramètres
    hop_size = 512
    sample_rate = 44100
    
    # Créer le pitch detector
    pitch_o = aubio.pitch("default", 2048, hop_size, sample_rate)
    pitch_o.set_unit("midi")
    pitch_o.set_silence(-40)
    
    # Lire l'audio
    source = aubio.source(audio_path, sample_rate, hop_size)
    
    notes = []
    current_note = None
    note_start = 0
    time = 0
    
    # Détecter les pitches
    while True:
        samples, read = source()
        pitch = pitch_o(samples)[0]
        confidence = pitch_o.get_confidence()
        
        # Note détectée avec confidence suffisante
        if confidence > 0.8 and pitch > 0:
            midi_note = int(pitch)
            
            if current_note is None:
                # Nouvelle note
                current_note = midi_note
                note_start = time
            elif abs(midi_note - current_note) > 1:
                # Changement de note
                duration = time - note_start
                if duration > 0.05:  # Min 50ms
                    notes.append({
                        't': note_start,
                        'pitch': current_note,
                        'duration': duration,
                        'velocity': 100
                    })
                current_note = midi_note
                note_start = time
        else:
            # Silence
            if current_note is not None:
                duration = time - note_start
                if duration > 0.05:
                    notes.append({
                        't': note_start,
                        'pitch': current_note,
                        'duration': duration,
                        'velocity': 100
                    })
                current_note = None
        
        time += hop_size / sample_rate
        
        if read < hop_size:
            break
    
    # Fermer dernière note
    if current_note is not None:
        notes.append({
            't': note_start,
            'pitch': current_note,
            'duration': time - note_start,
            'velocity': 100
        })
    
    # Créer MIDI
    mid = MidiFile()
    track = MidiTrack()
    mid.tracks.append(track)
    
    # Tempo (120 BPM)
    track.append(Message('program_change', program=12, time=0))  # Vibraphone
    
    # Convertir notes en MIDI
    for note in notes:
        ticks_start = int(note['t'] * mid.ticks_per_beat * 2)  # 120 BPM
        ticks_duration = int(note['duration'] * mid.ticks_per_beat * 2)
        
        track.append(Message('note_on', note=note['pitch'], velocity=note['velocity'], time=ticks_start))
        track.append(Message('note_off', note=note['pitch'], velocity=0, time=ticks_duration))
    
    mid.save(output_midi)
    print(f"✓ MIDI saved: {output_midi} ({len(notes)} notes)")
    return len(notes)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Simple audio to MIDI converter')
    parser.add_argument('audio', help='Input audio file')
    parser.add_argument('output', help='Output MIDI file')
    args = parser.parse_args()
    
    try:
        count = extract_midi_simple(args.audio, args.output)
        sys.exit(0)
    except Exception as e:
        print(f"✗ Error: {e}", file=sys.stderr)
        sys.exit(1)
