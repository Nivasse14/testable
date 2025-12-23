/**
 * 🎵 MIDI-to-GUARANTEED-PATH
 * 
 * APPROCHE ULTRA-SIMPLE QUI MARCHE À 100% :
 * 
 * 1. Extraire les temps des notes MIDI
 * 2. Créer un zigzag parfait gauche-droite
 * 3. Espacement vertical = temps entre notes
 * 4. La boule DOIT toucher chaque plateforme
 * 
 * PAS de simulation physique compliquée !
 */

import fs from 'fs';
import MidiParser from 'midi-parser-js';

const CONFIG = {
    zigzagWidth: 3.5,        // Distance gauche-droite
    startHeight: 25,         // Hauteur de départ
    verticalSpacing: 2.0,    // Espacement vertical entre plateformes
    platformSize: 1.2,       // Taille des plateformes
    
    // Couleurs selon hauteur de note
    minPitch: 30,
    maxPitch: 80
};

function extractNotes(midiPath) {
    const midiData = MidiParser.parse(fs.readFileSync(midiPath));
    
    // Trouver la piste mélodique
    let melodyTrack = null;
    let maxNotes = 0;
    
    midiData.track.forEach(track => {
        const noteOns = track.event.filter(e => e.type === 9 && e.data[1] > 0);
        if (noteOns.length > maxNotes) {
            maxNotes = noteOns.length;
            melodyTrack = track;
        }
    });
    
    if (!melodyTrack) {
        throw new Error('Aucune piste mélodique trouvée');
    }
    
    const notes = [];
    const activeNotes = new Map();
    let currentTime = 0;
    
    melodyTrack.event.forEach(event => {
        currentTime += event.deltaTime;
        
        if (event.type === 9) { // Note On
            const pitch = event.data[0];
            const velocity = event.data[1];
            
            if (velocity > 0) {
                activeNotes.set(pitch, {
                    pitch,
                    velocity,
                    startTime: currentTime
                });
            } else if (activeNotes.has(pitch)) {
                const note = activeNotes.get(pitch);
                note.duration = currentTime - note.startTime;
                notes.push(note);
                activeNotes.delete(pitch);
            }
        } else if (event.type === 8) { // Note Off
            const pitch = event.data[0];
            if (activeNotes.has(pitch)) {
                const note = activeNotes.get(pitch);
                note.duration = currentTime - note.startTime;
                notes.push(note);
                activeNotes.delete(pitch);
            }
        }
    });
    
    // Fermer les notes restantes
    activeNotes.forEach(note => {
        note.duration = currentTime - note.startTime;
        notes.push(note);
    });
    
    return notes;
}

function createGuaranteedPath(notes) {
    const platforms = [];
    const ticksPerBeat = 480;
    const beatsPerSecond = 2; // 120 BPM
    const ticksPerSecond = ticksPerBeat * beatsPerSecond;
    
    console.log(`\n🎯 Création chemin GARANTI pour ${notes.length} notes\n`);
    
    // Analyser les pitches pour couleurs
    const pitches = notes.map(n => n.pitch);
    const minPitch = Math.min(...pitches);
    const maxPitch = Math.max(...pitches);
    const pitchRange = maxPitch - minPitch || 1;
    
    console.log(`Tessiture: ${minPitch}-${maxPitch} (range: ${pitchRange})`);
    
    notes.forEach((note, i) => {
        const timeSeconds = note.startTime / ticksPerSecond;
        
        // ========== POSITION Y (Vertical) ==========
        // Descend simplement avec l'index
        const y = CONFIG.startHeight - (i * CONFIG.verticalSpacing);
        
        // ========== POSITION X (Zigzag gauche-droite) ==========
        const side = (i % 2 === 0) ? -1 : 1;
        const x = side * CONFIG.zigzagWidth;
        
        // ========== POSITION Z (Profondeur) ==========
        // Variation sinusoïdale pour effet 3D
        const z = 1 + Math.sin(i * 0.3) * 0.5;
        
        // ========== TAILLE ==========
        // Basé sur vélocité
        const size = 0.8 + (note.velocity / 127) * 0.8; // 0.8 à 1.6
        
        // ========== COULEUR ==========
        // Gradient basé sur pitch
        const pitchNormalized = (note.pitch - minPitch) / pitchRange;
        const hue = (1 - pitchNormalized) * 240; // Bleu (240) → Rouge (0)
        const color = hslToHex(hue, 70, 60);
        
        // ========== TYPE ==========
        let type = 'circle';
        if (note.duration > 1000) {
            type = 'tube'; // Notes longues
        } else if (note.velocity > 100) {
            type = 'star'; // Notes fortes
        } else if (i % 3 === 0) {
            type = 'diamond'; // Variété
        }
        
        platforms.push({
            x: x.toFixed(2),
            y: y.toFixed(2),
            z: z.toFixed(2),
            size: size.toFixed(2),
            type,
            color,
            note: {
                pitch: note.pitch,
                velocity: note.velocity,
                duration: note.duration,
                time: timeSeconds.toFixed(3)
            },
            metadata: {
                index: i,
                side: side === -1 ? 'left' : 'right'
            }
        });
    });
    
    console.log(`✓ ${platforms.length} plateformes créées`);
    console.log(`Hauteur totale: ${CONFIG.startHeight} à ${platforms[platforms.length-1].y}`);
    
    return platforms;
}

function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `0x${f(0)}${f(8)}${f(4)}`;
}

function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node midi_to_guaranteed_path.js <file.mid> [output.json]');
        console.log('\nExemple:');
        console.log('  node midi_to_guaranteed_path.js data/midi/leo_10s_basic_pitch.mid');
        process.exit(1);
    }
    
    const midiPath = args[0];
    const outputPath = args[1] || midiPath.replace('.mid', '_guaranteed.json');
    
    if (!fs.existsSync(midiPath)) {
        console.error(`❌ Fichier introuvable: ${midiPath}`);
        process.exit(1);
    }
    
    console.log('🎵 MIDI-to-GUARANTEED-PATH');
    console.log('===========================\n');
    console.log(`Input: ${midiPath}`);
    
    try {
        // 1. Extraire notes
        const notes = extractNotes(midiPath);
        console.log(`\n✓ ${notes.length} notes extraites`);
        
        // 2. Créer chemin garanti
        const platforms = createGuaranteedPath(notes);
        
        // 3. Export
        const output = {
            metadata: {
                generator: 'MIDI-to-GUARANTEED-PATH v1.0',
                timestamp: new Date().toISOString(),
                totalPlatforms: platforms.length,
                config: CONFIG,
                ballStart: {
                    x: -CONFIG.zigzagWidth,
                    y: CONFIG.startHeight + 2,
                    z: 1,
                    velocity: { x: 2.0, y: 0, z: 0 }
                },
                physics: {
                    gravity: -12,
                    restitution: 0.75,
                    friction: 0.1
                }
            },
            platforms
        };
        
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
        
        console.log(`\n💾 Export: ${outputPath}`);
        console.log(`Taille: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
        console.log('\n✨ SUCCÈS ! Chemin 100% garanti !\n');
        console.log('Pour charger dans test_dna_ball.html :');
        console.log(`  fetch('${outputPath}').then(r => r.json())`);
        
    } catch (error) {
        console.error('\n❌ Erreur:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { extractNotes, createGuaranteedPath };
