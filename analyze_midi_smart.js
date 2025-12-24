#!/usr/bin/env node

/**
 * 🎼 ANALYSEUR MIDI INTELLIGENT
 * Parse un fichier MIDI et extrait la structure musicale enrichie
 */

import midiPkg from '@tonejs/midi';
const { Midi } = midiPkg;
import { readFileSync, writeFileSync } from 'fs';

async function analyzeMidi(midiPath) {
    console.log('🎼 Analyse MIDI intelligente...\n');
    
    // Charger le fichier MIDI
    const midiData = readFileSync(midiPath);
    const midi = new Midi(midiData);
    
    console.log(`📊 Fichier: ${midiPath}`);
    console.log(`   Durée: ${midi.duration.toFixed(2)}s`);
    console.log(`   Tempo: ${midi.header.tempos[0]?.bpm || 120} BPM`);
    console.log(`   Pistes: ${midi.tracks.length}\n`);
    
    // Extraire toutes les notes de toutes les pistes
    const allNotes = [];
    
    midi.tracks.forEach((track, trackIndex) => {
        console.log(`🎵 Piste ${trackIndex}: ${track.name || 'Sans nom'} (${track.notes.length} notes)`);
        
        track.notes.forEach(note => {
            allNotes.push({
                time: note.time,
                pitch: note.midi,
                noteName: note.name,
                velocity: note.velocity * 127, // 0-1 → 0-127
                duration: note.duration,
                track: trackIndex
            });
        });
    });
    
    // Trier par temps
    allNotes.sort((a, b) => a.time - b.time);
    
    console.log(`\n✅ Total: ${allNotes.length} notes extraites\n`);
    
    // Analyser les gaps (silences) pour détecter où mettre les tubes spiraux
    const events = [];
    let previousNoteEnd = 0;
    
    for (let i = 0; i < allNotes.length; i++) {
        const note = allNotes[i];
        const gap = note.time - previousNoteEnd;
        
        // Si gap > 1.0s, c'est un silence → tube spiral (augmenté de 0.5 à 1.0)
        if (gap > 1.0 && i > 0) {
            events.push({
                type: 'SPIRAL_TUBE',
                startTime: previousNoteEnd,
                endTime: note.time,
                duration: gap
            });
        }
        
        // Note = impact sur plateforme
        events.push({
            type: 'NOTE_IMPACT',
            time: note.time,
            pitch: note.pitch,
            velocity: note.velocity,
            duration: note.duration,
            noteName: note.noteName
        });
        
        previousNoteEnd = note.time + note.duration;
    }
    
    console.log('📊 Structure détectée:');
    
    const impacts = events.filter(e => e.type === 'NOTE_IMPACT').length;
    const spirals = events.filter(e => e.type === 'SPIRAL_TUBE').length;
    
    console.log(`   🎯 ${impacts} impacts de balle (notes MIDI)`);
    console.log(`   🌀 ${spirals} tubes spiraux (silences)`);
    
    // Analyser l'énergie par sections (fenêtres de 4 secondes)
    const sectionDuration = 4.0;
    const sections = [];
    let currentTime = 0;
    
    while (currentTime < midi.duration) {
        const endTime = Math.min(currentTime + sectionDuration, midi.duration);
        const sectionNotes = allNotes.filter(n => n.time >= currentTime && n.time < endTime);
        
        const avgVelocity = sectionNotes.reduce((sum, n) => sum + n.velocity, 0) / (sectionNotes.length || 1);
        const density = sectionNotes.length / sectionDuration;
        
        let energy = 'low';
        if (avgVelocity > 90 || density > 4) energy = 'high';
        else if (avgVelocity > 60 || density > 2) energy = 'medium';
        
        sections.push({
            start: currentTime,
            end: endTime,
            noteCount: sectionNotes.length,
            density: density.toFixed(2),
            avgVelocity: avgVelocity.toFixed(0),
            energy
        });
        
        currentTime = endTime;
    }
    
    console.log('\n🎨 Sections musicales:');
    sections.forEach((s, i) => {
        const energyIcon = { low: '🟢', medium: '🟡', high: '🔴' }[s.energy];
        console.log(`   ${energyIcon} Section ${i + 1}: ${s.start.toFixed(1)}s → ${s.end.toFixed(1)}s (${s.noteCount} notes, énergie: ${s.energy})`);
    });
    
    // Créer le résultat final
    const analysis = {
        metadata: {
            filename: midiPath,
            duration: midi.duration,
            tempo: midi.header.tempos[0]?.bpm || 120,
            noteCount: allNotes.length,
            trackCount: midi.tracks.length
        },
        notes: allNotes,
        events: events,
        sections: sections
    };
    
    return analysis;
}

async function main() {
    const midiPath = process.argv[2] || 'data/midi/leo.mid';
    const outputPath = process.argv[3] || 'data/leo_midi_analysis.json';
    
    try {
        const analysis = await analyzeMidi(midiPath);
        
        writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
        
        console.log(`\n✅ Analyse sauvegardée: ${outputPath}`);
        console.log(`\n🚀 Prochaine étape: Générer les trajectoires avec:`);
        console.log(`   node generate_from_midi_analysis.js ${outputPath}`);
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    }
}

main();
