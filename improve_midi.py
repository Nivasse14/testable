"""
Post-traitement MIDI pour améliorer la qualité
"""
import sys
from mido import MidiFile, MidiTrack, Message

def improve_midi(input_path, output_path):
    mid = MidiFile(input_path)
    new_mid = MidiFile()
    new_mid.ticks_per_beat = mid.ticks_per_beat
    
    for track in mid.tracks:
        new_track = MidiTrack()
        notes = []
        
        # Collecter toutes les notes
        for msg in track:
            if msg.type == 'note_on' and msg.velocity > 0:
                notes.append(msg)
        
        # Filtrer notes trop courtes (< 100ms)
        # Quantizer au 1/16
        # Ajuster vélocités
        
        for msg in track:
            if msg.type in ['note_on', 'note_off']:
                if msg.type == 'note_on' and msg.velocity > 0:
                    # Augmenter vélocité minimum
                    msg.velocity = max(60, msg.velocity)
            new_track.append(msg)
        
        new_mid.tracks.append(new_track)
    
    new_mid.save(output_path)
    print(f"✓ MIDI amélioré: {output_path}")

if __name__ == '__main__':
    improve_midi(sys.argv[1], sys.argv[2])
