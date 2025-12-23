#!/usr/bin/env node
/**
 * MIDI-to-ZIGZAG-SLIDES v1.0
 * Parcours zigzag avec TOBOGANS entre plateformes
 * La boule GLISSE de gauche à droite automatiquement
 */

import MidiParser from 'midi-parser-js';
import { readFileSync, writeFileSync } from 'fs';

const CONFIG = {
    zigzagWidth: 4,          // Distance gauche-droite
    platformSpacing: 2.5,    // Espacement vertical entre plateformes
    slideAngle: 25,          // Angle tobogan (degrés)
    platformSize: 1.0,
    startHeight: 20,
    minPitch: 30,
    maxPitch: 80
};

// ========== EXTRACTION MIDI ==========
function extractMelody(midiPath) {
    const file = readFileSync(midiPath);
    const midi = MidiParser.parse(new Uint8Array(file));
    
    const allNotes = [];
    
    midi.track.forEach((track, i) => {
        let time = 0;
        const activeNotes = new Map();
        
        track.event.forEach(event => {
            time += event.deltaTime || 0;
            
            if (event.type === 9 && event.data?.[1] > 0) {
                const pitch = event.data[0];
                const velocity = event.data[1];
                activeNotes.set(pitch, { time, velocity });
            }
            else if ((event.type === 8) || (event.type === 9 && event.data?.[1] === 0)) {
                const pitch = event.data[0];
                const noteOn = activeNotes.get(pitch);
                if (noteOn) {
                    allNotes.push({
                        pitch,
                        time: noteOn.time,
                        duration: time - noteOn.time,
                        velocity: noteOn.velocity,
                        track: i
                    });
                    activeNotes.delete(pitch);
                }
            }
        });
    });
    
    allNotes.sort((a, b) => a.time - b.time);
    
    const trackStats = {};
    allNotes.forEach(n => {
        if (!trackStats[n.track]) trackStats[n.track] = { count: 0, avgPitch: 0 };
        trackStats[n.track].count++;
        trackStats[n.track].avgPitch += n.pitch;
    });
    
    const melodyTrack = Object.entries(trackStats)
        .map(([t, s]) => ({ track: parseInt(t), count: s.count, avgPitch: s.avgPitch / s.count }))
        .filter(t => t.avgPitch > 50 && t.avgPitch < 80)
        .sort((a, b) => b.count - a.count)[0]?.track ?? 0;
    
    const melody = allNotes.filter(n => n.track === melodyTrack);
    console.log(`✓ ${melody.length} notes extraites (track ${melodyTrack})`);
    
    return melody;
}

// ========== GÉNÉRATION PARCOURS ZIGZAG ==========
function generateZigzagSlides(notes) {
    console.log(`\n🎯 Création PARCOURS ZIGZAG avec TOBOGANS\n`);
    
    const platforms = [];
    const slides = [];
    
    const pitches = notes.map(n => n.pitch);
    const minPitch = Math.min(...pitches);
    const maxPitch = Math.max(...pitches);
    console.log(`Tessiture: ${minPitch}-${maxPitch} (range: ${maxPitch - minPitch})`);
    
    notes.forEach((note, i) => {
        // Alternance gauche-droite
        const side = (i % 2 === 0) ? -1 : 1;
        const x = side * CONFIG.zigzagWidth;
        const y = CONFIG.startHeight - (i * CONFIG.platformSpacing);
        const z = 0;
        
        // Taille selon vélocité
        const velocity = note.velocity || 64;
        const size = CONFIG.platformSize * (0.8 + (velocity / 127) * 0.4);
        
        // Type selon durée
        const duration = note.duration || 100;
        const type = duration > 300 ? 'long' : duration > 150 ? 'medium' : 'short';
        
        // Couleur selon pitch
        const colors = [
            0xff0000, 0xff7f00, 0xffff00, 0x00ff00,
            0x0000ff, 0x4b0082, 0x9400d3, 0xff1493,
            0x00ffff, 0xff00ff, 0xffd700, 0x00ff7f
        ];
        const color = colors[note.pitch % 12];
        
        platforms.push({
            x: parseFloat(x.toFixed(2)),
            y: parseFloat(y.toFixed(2)),
            z: parseFloat(z.toFixed(2)),
            size: parseFloat(size.toFixed(2)),
            type,
            color: `0x${color.toString(16).padStart(6, '0')}`,
            midiNote: note.pitch,
            velocity,
            duration,
            time: note.time,
            side: side === -1 ? 'left' : 'right'
        });
        
        // Créer TOBOGAN entre cette plateforme et la suivante
        if (i < notes.length - 1) {
            const nextSide = ((i + 1) % 2 === 0) ? -1 : 1;
            const nextX = nextSide * CONFIG.zigzagWidth;
            const nextY = CONFIG.startHeight - ((i + 1) * CONFIG.platformSpacing);
            
            // Tobogan TUBE relie current platform à next platform
            slides.push({
                startX: x,
                startY: y - 0.5, // Sous la plateforme
                startZ: z,
                endX: nextX,
                endY: nextY + 0.5, // Au-dessus de la prochaine
                endZ: z,
                radius: 0.6,      // Rayon du tube
                segments: 16,     // Segments pour rondeur
                angle: CONFIG.slideAngle,
                type: 'tube',     // Type = TUBE circulaire
                fromPlatform: i,
                toPlatform: i + 1
            });
        }
    });
    
    console.log(`✓ ${platforms.length} plateformes créées`);
    console.log(`✓ ${slides.length} tobogans créés`);
    console.log(`Hauteur totale: ${CONFIG.startHeight} à ${platforms[platforms.length-1].y.toFixed(2)}`);
    console.log(`Largeur zigzag: ${-CONFIG.zigzagWidth} à ${CONFIG.zigzagWidth}`);
    
    return { platforms, slides };
}

// ========== MAIN ==========
const args = process.argv.slice(2);
if (args.length < 1) {
    console.log('Usage: node midi_to_zigzag_slides.js <midi_file> [output.json]');
    process.exit(1);
}

const midiPath = args[0];
const outputPath = args[1] || 'data/leo_10s_zigzag.json';

console.log('🎵 MIDI-to-ZIGZAG-SLIDES');
console.log('===========================\n');
console.log(`Input: ${midiPath}\n`);

const notes = extractMelody(midiPath);
const { platforms, slides } = generateZigzagSlides(notes);

const output = {
    metadata: {
        generator: 'MIDI-to-ZIGZAG-SLIDES v1.0',
        timestamp: new Date().toISOString(),
        totalPlatforms: platforms.length,
        totalSlides: slides.length,
        config: CONFIG,
        ballStart: {
            x: -CONFIG.zigzagWidth, // Commence à gauche (dans le tube)
            y: CONFIG.startHeight + 1,
            z: 0,
            velocity: { x: 0.5, y: -2, z: 0 } // Pousse vers la droite + tombe
        },
        physics: {
            gravity: -9.8,
            slideFriction: 0.15,  // Peu de friction sur tobogan = glisse bien
            platformFriction: 0.4,
            restitution: 0.5,
            damping: 0.1
        }
    },
    platforms,
    slides
};

writeFileSync(outputPath, JSON.stringify(output, null, 2));
const stats = readFileSync(outputPath, 'utf-8');
console.log(`\n💾 Export: ${outputPath}`);
console.log(`Taille: ${(stats.length / 1024).toFixed(1)} KB`);
console.log('\n✨ SUCCÈS ! Parcours zigzag avec tobogans créé !\n');
console.log('Concept: Ball GLISSE sur les tobogans de gauche à droite');
console.log('         Touche chaque plateforme en suivant le zigzag');
