#!/usr/bin/env node
/**
 * MIDI-to-WALL-PATH v1.0
 * Crée un MUR INCLINÉ avec plateformes = chemin GARANTI
 * La balle ROULE le long du mur au lieu de tomber dans le vide
 */

import MidiParser from 'midi-parser-js';
import { readFileSync, writeFileSync } from 'fs';

const CONFIG = {
    wallAngle: 35,           // Inclinaison du mur (degrés)
    wallWidth: 8,            // Largeur du mur
    platformSpacing: 1.5,    // Distance entre plateformes le long du mur
    platformSize: 1.2,       // Taille des plateformes
    startHeight: 25,         // Hauteur de départ
    zigzagAmplitude: 2.5,    // Amplitude du zigzag sur le mur
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
            
            if (event.type === 9 && event.data?.[1] > 0) { // Note ON
                const pitch = event.data[0];
                const velocity = event.data[1];
                activeNotes.set(pitch, { time, velocity });
            }
            else if ((event.type === 8) || (event.type === 9 && event.data?.[1] === 0)) { // Note OFF
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
    
    // Trier par temps
    allNotes.sort((a, b) => a.time - b.time);
    
    // Trouver track mélodie (plus de notes dans tessiture moyenne)
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

// ========== GÉNÉRATION MUR ==========
function generateWallPath(notes) {
    console.log(`\n🎯 Création MUR INCLINÉ pour ${notes.length} notes\n`);
    
    const angleRad = CONFIG.wallAngle * Math.PI / 180;
    const platforms = [];
    
    // Stats
    const pitches = notes.map(n => n.pitch);
    const minPitch = Math.min(...pitches);
    const maxPitch = Math.max(...pitches);
    console.log(`Tessiture: ${minPitch}-${maxPitch} (range: ${maxPitch - minPitch})`);
    
    notes.forEach((note, i) => {
        // Position le long du mur (distance descendante)
        const distAlongWall = i * CONFIG.platformSpacing;
        
        // Zigzag horizontal (gauche-droite sur le mur)
        const zigzag = Math.sin(i * 0.5) * CONFIG.zigzagAmplitude;
        
        // Coordonnées 3D du mur incliné
        // Le mur descend en Z et en Y
        const x = zigzag;  // Zigzag gauche-droite
        const y = CONFIG.startHeight - (distAlongWall * Math.sin(angleRad));  // Descente verticale
        const z = -distAlongWall * Math.cos(angleRad);  // Profondeur (recul)
        
        // Taille selon vélocité
        const velocity = note.velocity || 64;
        const size = CONFIG.platformSize * (0.8 + (velocity / 127) * 0.4);
        
        // Type selon durée
        const duration = note.duration || 100;
        const type = duration > 300 ? 'long' : duration > 150 ? 'medium' : 'short';
        
        // Couleur selon pitch (gamme chromatique)
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
            time: note.time
        });
    });
    
    console.log(`✓ ${platforms.length} plateformes créées`);
    console.log(`Hauteur totale: ${CONFIG.startHeight} à ${platforms[platforms.length-1].y.toFixed(2)}`);
    console.log(`Profondeur: 0 à ${platforms[platforms.length-1].z.toFixed(2)}`);
    
    return platforms;
}

// ========== GÉNÉRATION SEGMENTS MUR ==========
function generateWallSegments(platforms) {
    // Créer segments de mur entre les plateformes
    const segments = [];
    const angleRad = CONFIG.wallAngle * Math.PI / 180;
    
    for (let i = 0; i < platforms.length - 1; i++) {
        const p1 = platforms[i];
        const p2 = platforms[i + 1];
        
        segments.push({
            start: { x: p1.x, y: p1.y, z: p1.z },
            end: { x: p2.x, y: p2.y, z: p2.z },
            width: CONFIG.wallWidth,
            thickness: 0.2,
            angle: CONFIG.wallAngle
        });
    }
    
    console.log(`✓ ${segments.length} segments de mur créés`);
    return segments;
}

// ========== MAIN ==========
const args = process.argv.slice(2);
if (args.length < 1) {
    console.log('Usage: node midi_to_wall_path.js <midi_file> [output.json]');
    process.exit(1);
}

const midiPath = args[0];
const outputPath = args[1] || 'data/leo_10s_wall.json';

console.log('🎵 MIDI-to-WALL-PATH');
console.log('===========================\n');
console.log(`Input: ${midiPath}\n`);

const notes = extractMelody(midiPath);
const platforms = generateWallPath(notes);
const wallSegments = generateWallSegments(platforms);

const output = {
    metadata: {
        generator: 'MIDI-to-WALL-PATH v1.0',
        timestamp: new Date().toISOString(),
        totalPlatforms: platforms.length,
        config: CONFIG,
        ballStart: {
            x: 0,
            y: CONFIG.startHeight + 2,
            z: 2,  // Légèrement devant le mur
            velocity: { x: 0, y: -2, z: -3 }  // Vélocité vers le bas + vers le mur
        },
        physics: {
            gravity: -9.8,        // Gravité réaliste
            wallFriction: 0.4,    // Friction avec le mur (glisse)
            restitution: 0.3,     // Peu de rebond
            damping: 0.2          // Amortissement
        }
    },
    platforms,
    wallSegments
};

writeFileSync(outputPath, JSON.stringify(output, null, 2));
const stats = readFileSync(outputPath, 'utf-8');
console.log(`\n💾 Export: ${outputPath}`);
console.log(`Taille: ${(stats.length / 1024).toFixed(1)} KB`);
console.log('\n✨ SUCCÈS ! Mur incliné créé !\n');
console.log('Concept: La balle ROULE le long du mur incliné');
console.log('         Elle touche TOUTES les plateformes fixées au mur');
