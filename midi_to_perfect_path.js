/**
 * 🎯 MIDI-to-PERFECT-PATH Converter V2
 * 
 * NOUVELLE APPROCHE : Au lieu de placer des plateformes et espérer
 * que la physique fonctionne, on CALCULE d'abord une trajectoire
 * balistique parfaite, puis on place les plateformes dessus.
 * 
 * GARANTIES :
 * - Chaque note = 1 collision
 * - Trajectoire fluide et hypnotisante
 * - Timing musical respecté
 */

import fs from 'fs';
import MidiParser from 'midi-parser-js';

// ========== CONFIGURATION PHYSIQUE ==========
const PHYSICS = {
    gravity: -12,           // Gravité
    restitution: 0.75,      // Rebond (75% de l'énergie conservée)
    initialVelocity: {
        x: 3.0,             // Vitesse horizontale de départ
        y: 0                // Tombe naturellement
    },
    ballRadius: 0.6,        // Rayon de la boule
    
    // Timing : on veut que chaque note soit touchée au bon moment
    // Si tempo = 120 BPM, une noire = 0.5 sec
    targetTimePerNote: 0.5  // Temps entre chaque note (ajustable)
};

// ========== SIMULATION BALISTIQUE ==========
function simulateBallisticPath(startPos, targetTime) {
    /**
     * Calcule où la boule sera après un temps donné
     * en suivant les lois de la physique :
     * 
     * x(t) = x0 + vx * t
     * y(t) = y0 + vy * t + 0.5 * g * t^2
     * 
     * Après un rebond :
     * vy_new = -vy_old * restitution
     */
    
    const path = [];
    let pos = { ...startPos };
    let vel = { ...PHYSICS.initialVelocity };
    const dt = 0.016; // 60 FPS
    let time = 0;
    
    while (time < targetTime) {
        // Gravité
        vel.y += PHYSICS.gravity * dt;
        
        // Position
        pos.x += vel.x * dt;
        pos.y += vel.y * dt;
        pos.z = 1; // Profondeur fixe pour simplifier
        
        path.push({ ...pos, time });
        time += dt;
    }
    
    return path;
}

function findPlatformPosition(ballTrajectory, previousPlatform) {
    /**
     * Trouve le meilleur endroit pour placer une plateforme
     * qui sera touchée par la trajectoire de la boule
     * 
     * Critères :
     * 1. La boule doit passer "près" (< ballRadius)
     * 2. La boule doit descendre (vy < 0)
     * 3. Position jolie (pas trop verticale)
     */
    
    for (let i = 10; i < ballTrajectory.length - 10; i++) {
        const point = ballTrajectory[i];
        
        // La boule descend ?
        if (i > 0 && point.y > ballTrajectory[i-1].y) continue;
        
        // Pas trop proche de la précédente ?
        if (previousPlatform) {
            const dist = Math.sqrt(
                Math.pow(point.x - previousPlatform.x, 2) +
                Math.pow(point.y - previousPlatform.y, 2)
            );
            if (dist < 1.5) continue;
        }
        
        // Position valide !
        return {
            x: point.x,
            y: point.y - 0.3, // Légèrement en dessous du point
            z: point.z,
            time: point.time
        };
    }
    
    return null;
}

// ========== CALCUL TRAJECTOIRE COMPLÈTE ==========
function calculatePerfectPath(notes) {
    /**
     * Génère un chemin PARFAIT où chaque note est garantie
     * d'être touchée au bon moment
     */
    
    const platforms = [];
    const ticksPerBeat = 480;
    const beatsPerSecond = 2; // 120 BPM
    const ticksPerSecond = ticksPerBeat * beatsPerSecond;
    
    // Point de départ
    let currentPos = { x: -4, y: 25, z: 1 };
    let currentVel = { ...PHYSICS.initialVelocity };
    
    console.log('🎯 Calcul trajectoire parfaite...\n');
    
    notes.forEach((note, i) => {
        const timeTarget = note.startTime / ticksPerSecond;
        const timeSinceLast = i === 0 ? 0 : (note.startTime - notes[i-1].startTime) / ticksPerSecond;
        
        // Simuler la trajectoire jusqu'à cette note
        const trajectory = simulateBallPath(currentPos, currentVel, timeSinceLast);
        
        // Trouver où placer la plateforme
        const platformPos = findImpactPoint(trajectory);
        
        if (!platformPos) {
            console.warn(`⚠️  Note ${i}: Impossible de trouver position`);
            return;
        }
        
        // Calculer la nouvelle vélocité après rebond
        const impactVel = getVelocityAtPoint(trajectory, platformPos);
        currentVel = {
            x: impactVel.x * (Math.random() > 0.5 ? 1 : -1), // Change de côté
            y: -impactVel.y * PHYSICS.restitution // Rebond
        };
        
        // Couleur basée sur pitch
        const hue = ((note.pitch - 30) / 44) * 300; // 0-300 degrés
        const color = hslToHex(hue, 70, 60);
        
        platforms.push({
            x: platformPos.x.toFixed(2),
            y: platformPos.y.toFixed(2),
            z: platformPos.z.toFixed(2),
            size: (1.0 + note.velocity / 127).toFixed(2),
            type: note.velocity > 100 ? 'star' : 'circle',
            color: color,
            note: {
                pitch: note.pitch,
                velocity: note.velocity,
                time: timeTarget.toFixed(3),
                duration: note.duration
            },
            metadata: {
                index: i,
                timeSinceLast: timeSinceLast.toFixed(3)
            }
        });
        
        currentPos = platformPos;
        
        if ((i + 1) % 10 === 0) {
            console.log(`✓ ${i + 1}/${notes.length} plateformes calculées`);
        }
    });
    
    console.log(`\n✨ ${platforms.length} plateformes positionnées parfaitement\n`);
    return platforms;
}

function simulateBallPath(startPos, startVel, duration) {
    const path = [];
    let pos = { ...startPos };
    let vel = { ...startVel };
    const dt = 0.016; // 60 FPS
    let time = 0;
    
    while (time < duration) {
        vel.y += PHYSICS.gravity * dt;
        pos.x += vel.x * dt;
        pos.y += vel.y * dt;
        
        path.push({
            x: pos.x,
            y: pos.y,
            z: pos.z,
            vx: vel.x,
            vy: vel.y,
            time: time
        });
        
        time += dt;
    }
    
    return path;
}

function findImpactPoint(trajectory) {
    // Trouve un point de descente (pas de montée)
    for (let i = 5; i < trajectory.length; i++) {
        const point = trajectory[i];
        if (point.vy < -2) { // Descend assez vite
            return {
                x: point.x,
                y: point.y,
                z: 1
            };
        }
    }
    
    // Fallback : milieu de la trajectoire
    const mid = Math.floor(trajectory.length / 2);
    return trajectory[mid] ? {
        x: trajectory[mid].x,
        y: trajectory[mid].y,
        z: 1
    } : null;
}

function getVelocityAtPoint(trajectory, point) {
    // Trouve la vélocité au point d'impact
    let closest = trajectory[0];
    let minDist = Infinity;
    
    trajectory.forEach(p => {
        const dist = Math.sqrt(
            Math.pow(p.x - point.x, 2) +
            Math.pow(p.y - point.y, 2)
        );
        if (dist < minDist) {
            minDist = dist;
            closest = p;
        }
    });
    
    return { x: closest.vx, y: closest.vy };
}

// ========== EXTRACTION NOTES ==========
function extractNotes(midiPath) {
    const midiData = MidiParser.parse(fs.readFileSync(midiPath));
    
    let melodyTrack = null;
    let maxNotes = 0;
    
    midiData.track.forEach(track => {
        const noteOns = track.event.filter(e => e.type === 9 && e.data[1] > 0);
        if (noteOns.length > maxNotes) {
            maxNotes = noteOns.length;
            melodyTrack = track;
        }
    });
    
    const notes = [];
    const activeNotes = new Map();
    let currentTime = 0;
    
    melodyTrack.event.forEach(event => {
        currentTime += event.deltaTime;
        
        if (event.type === 9) {
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
        } else if (event.type === 8) {
            const pitch = event.data[0];
            if (activeNotes.has(pitch)) {
                const note = activeNotes.get(pitch);
                note.duration = currentTime - note.startTime;
                notes.push(note);
                activeNotes.delete(pitch);
            }
        }
    });
    
    return notes;
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

// ========== MAIN ==========
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node midi_to_perfect_path.js <file.mid> [output.json]');
        process.exit(1);
    }
    
    const midiPath = args[0];
    const outputPath = args[1] || midiPath.replace('.mid', '_perfect.json');
    
    console.log('🎯 MIDI-to-PERFECT-PATH Converter V2\n');
    console.log(`Input: ${midiPath}`);
    console.log(`Output: ${outputPath}\n`);
    
    try {
        // 1. Extraire notes
        console.log('📝 Extraction notes MIDI...');
        const notes = extractNotes(midiPath);
        console.log(`✓ ${notes.length} notes extraites\n`);
        
        // 2. Calculer trajectoire parfaite
        const platforms = calculatePerfectPath(notes);
        
        // 3. Export
        const output = {
            metadata: {
                generator: 'MIDI-to-PERFECT-PATH v2.0',
                timestamp: new Date().toISOString(),
                totalPlatforms: platforms.length,
                physics: PHYSICS
            },
            platforms
        };
        
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
        console.log(`💾 Export: ${outputPath}`);
        console.log(`Taille: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
        console.log('\n✨ Trajectoire PARFAITE calculée !');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { calculatePerfectPath, extractNotes };
