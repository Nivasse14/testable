#!/usr/bin/env node
/**
 * GÉNÉRATEUR DE TRAJECTOIRE TEMPORELLE
 * Calcule les keyframes pour synchroniser la balle avec des timestamps MIDI
 * 
 * Usage:
 *   node generate_timed_trajectory.js <midi-file> <output-json>
 *   node generate_timed_trajectory.js data/midi/leo_10s_basic_pitch.mid data/leo_timed_path.json
 */

import { readFileSync, writeFileSync } from 'fs';
import midiParser from 'midi-parser-js';

// Configuration physique de base
const CONFIG = {
    numPlatforms: 10,
    startHeight: 20,
    startX: 0,
    startZ: 0,
    verticalDrop: 2,
    depthStep: 3,
    platformRadius: 1.2,
    platformHeight: 0.3,
    platformShape: 'cylinder',
    gravity: -9.8,
    ball: {
        radius: 0.5
    }
};

// Lire et parser le fichier MIDI
function parseMidiTiming(midiPath) {
    console.log(`📖 Lecture MIDI: ${midiPath}`);
    const midiData = readFileSync(midiPath, 'binary');
    const midi = midiParser.parse(midiData);
    
    // Extraire les notes avec leur timing
    const notes = [];
    const ticksPerBeat = midi.timeDivision;
    
    midi.track.forEach((track, trackIdx) => {
        let currentTime = 0;
        
        track.event.forEach(event => {
            currentTime += event.deltaTime;
            
            if (event.type === 9 && event.data && event.data[1] > 0) { // Note On
                const timeInSeconds = (currentTime / ticksPerBeat) * 0.5; // Assume 120 BPM = 0.5s per beat
                const timeInMs = Math.round(timeInSeconds * 1000);
                const pitch = event.data[0];
                const velocity = event.data[1];
                
                notes.push({
                    time: timeInMs,
                    pitch: pitch,
                    velocity: velocity,
                    track: trackIdx
                });
            }
        });
    });
    
    // Trier par temps
    notes.sort((a, b) => a.time - b.time);
    
    console.log(`🎵 ${notes.length} notes trouvées`);
    console.log(`⏱️  Durée: ${notes[notes.length - 1]?.time || 0}ms`);
    
    return notes;
}

// Générer les plateformes
function generatePlatforms() {
    const platforms = [];
    let currentY = CONFIG.startHeight;
    let currentZ = CONFIG.startZ;
    
    for (let i = 0; i < CONFIG.numPlatforms; i++) {
        platforms.push({
            id: i,
            x: CONFIG.startX,
            y: currentY,
            z: currentZ,
            radius: CONFIG.platformRadius,
            height: CONFIG.platformHeight,
            shape: CONFIG.platformShape
        });
        
        currentY -= CONFIG.verticalDrop;
        currentZ += CONFIG.depthStep;
    }
    
    return platforms;
}

// Calculer les keyframes pour que la balle atteigne chaque plateforme au bon moment
function calculateKeyframes(notes, platforms) {
    const keyframes = [];
    
    // Position de départ
    const startY = CONFIG.startHeight + CONFIG.platformHeight / 2 + CONFIG.ball.radius + 0.1;
    keyframes.push({
        time: 0,
        position: { x: CONFIG.startX, y: startY, z: CONFIG.startZ },
        velocity: { x: 0, y: 0, z: 0 }
    });
    
    // Pour chaque note, créer un keyframe où la balle atteint la plateforme correspondante
    const usableNotes = notes.slice(0, Math.min(notes.length, platforms.length));
    
    usableNotes.forEach((note, idx) => {
        const platform = platforms[idx];
        if (!platform) return;
        
        // Position cible: au-dessus de la plateforme
        const targetY = platform.y + CONFIG.platformHeight / 2 + CONFIG.ball.radius;
        const targetPos = {
            x: platform.x,
            y: targetY,
            z: platform.z
        };
        
        // Calculer la vélocité pour atteindre la plateforme suivante
        let velocity = { x: 0, y: -2, z: 2 };
        
        if (idx < usableNotes.length - 1) {
            const nextNote = usableNotes[idx + 1];
            const nextPlatform = platforms[idx + 1];
            const timeDelta = (nextNote.time - note.time) / 1000; // en secondes
            
            if (nextPlatform && timeDelta > 0) {
                velocity = {
                    x: (nextPlatform.x - platform.x) / timeDelta,
                    y: (nextPlatform.y - platform.y) / timeDelta - 0.5 * CONFIG.gravity * timeDelta,
                    z: (nextPlatform.z - platform.z) / timeDelta
                };
            }
        }
        
        keyframes.push({
            time: note.time,
            position: targetPos,
            velocity: velocity,
            note: {
                pitch: note.pitch,
                velocity: note.velocity
            }
        });
    });
    
    console.log(`⏱️  ${keyframes.length} keyframes générés`);
    return keyframes;
}

// Générer les rampes de connexion
function generateRamps(platforms) {
    const ramps = [];
    
    for (let i = 0; i < platforms.length - 1; i++) {
        const p1 = platforms[i];
        const p2 = platforms[i + 1];
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dz = p2.z - p1.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        ramps.push({
            id: i,
            start: { x: p1.x, y: p1.y, z: p1.z },
            end: { x: p2.x, y: p2.y, z: p2.z },
            length: distance,
            angle: Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)),
            rotation: Math.atan2(dx, dz)
        });
    }
    
    return ramps;
}

// Main
function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node generate_timed_trajectory.js <midi-file> <output-json>');
        process.exit(1);
    }
    
    const midiPath = args[0];
    const outputPath = args[1];
    
    console.log('🎬 Génération de trajectoire temporelle...\n');
    
    // Parse MIDI
    const notes = parseMidiTiming(midiPath);
    
    // Générer plateformes
    const platforms = generatePlatforms();
    console.log(`📦 ${platforms.length} plateformes générées`);
    
    // Calculer keyframes
    const keyframes = calculateKeyframes(notes, platforms);
    
    // Générer rampes
    const ramps = generateRamps(platforms);
    console.log(`🔗 ${ramps.length} rampes générées`);
    
    // Construire le JSON final
    const output = {
        platforms: platforms,
        ramps: ramps,
        metadata: {
            generated: new Date().toISOString(),
            midiSource: midiPath,
            notes: notes.length,
            duration: notes[notes.length - 1]?.time || 0,
            config: {
                ...CONFIG,
                ball: {
                    ...CONFIG.ball,
                    trajectoryMode: 'keyframes',
                    keyframes: keyframes
                }
            },
            ballStart: {
                x: keyframes[0].position.x,
                y: keyframes[0].position.y,
                z: keyframes[0].position.z,
                velocity: keyframes[0].velocity
            },
            heightRange: {
                top: CONFIG.startHeight,
                bottom: CONFIG.startHeight - (CONFIG.numPlatforms - 1) * CONFIG.verticalDrop
            },
            widthRange: {
                left: CONFIG.startX - CONFIG.platformRadius,
                right: CONFIG.startX + CONFIG.platformRadius
            }
        }
    };
    
    // Sauvegarder
    writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n✅ Trajectoire sauvegardée: ${outputPath}`);
    console.log(`📊 ${keyframes.length} keyframes sur ${notes[notes.length - 1]?.time || 0}ms`);
}

main();
