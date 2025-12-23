/**
 * 🧬 MIDI-to-DNA Converter
 * Transforme une mélodie MIDI en structure ADN 3D hypnotique
 * 
 * INNOVATION : Au lieu d'un parcours linéaire, crée une double hélice
 * où chaque note est positionnée selon sa hauteur, vélocité et durée
 * 
 * Usage: node midi_to_dna.js path/to/file.mid
 */

import fs from 'fs';
import MidiParser from 'midi-parser-js';

// ========== CONFIGURATION ADN ==========
const DNA_CONFIG = {
    helixRadius: 4.0,        // Rayon de la double hélice
    helixTurns: 3,           // Nombre de tours complets
    verticalSpacing: 1.5,    // Espacement vertical entre notes
    baseHeight: 25,          // Hauteur de départ
    
    // Mapping note → position radiale (angle sur le cercle)
    pitchToAngle: (pitch) => {
        // Notes graves = côté gauche, aiguës = côté droit
        // Mais avec rotation progressive pour créer spirale
        const normalizedPitch = (pitch - 60) / 48; // Normalize C4-C8
        return normalizedPitch * Math.PI * 2; // 0 à 2π
    },
    
    // Velocity → taille plateforme (plus fort = plus grand)
    velocityToSize: (velocity) => {
        return 0.5 + (velocity / 127) * 1.5; // 0.5 à 2.0
    },
    
    // Duration → profondeur Z (notes longues = plus loin)
    durationToDepth: (duration) => {
        return Math.min(duration / 500, 3); // Max 3 units
    }
};

// ========== EXTRACTION INTELLIGENTE ==========
function extractMusicalDNA(midiPath) {
    const midiData = MidiParser.parse(fs.readFileSync(midiPath));
    
    console.log('🎵 Analyse MIDI:', midiPath);
    console.log(`Tracks: ${midiData.track.length}`);
    
    // Trouver la piste mélodique (le plus de notes)
    let melodyTrack = null;
    let maxNotes = 0;
    
    midiData.track.forEach((track, i) => {
        const noteOns = track.event.filter(e => e.type === 9 && e.data[1] > 0);
        if (noteOns.length > maxNotes) {
            maxNotes = noteOns.length;
            melodyTrack = track;
        }
    });
    
    if (!melodyTrack) {
        throw new Error('Aucune piste mélodique trouvée');
    }
    
    console.log(`✓ Piste mélodique: ${maxNotes} notes`);
    
    // Extraire les notes avec timing précis
    const notes = [];
    const activeNotes = new Map(); // Track note-on/note-off pairs
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
                    startTime: currentTime,
                    endTime: null
                });
            } else {
                // Velocity 0 = Note Off
                if (activeNotes.has(pitch)) {
                    const note = activeNotes.get(pitch);
                    note.endTime = currentTime;
                    note.duration = currentTime - note.startTime;
                    notes.push(note);
                    activeNotes.delete(pitch);
                }
            }
        } else if (event.type === 8) { // Note Off
            const pitch = event.data[0];
            if (activeNotes.has(pitch)) {
                const note = activeNotes.get(pitch);
                note.endTime = currentTime;
                note.duration = currentTime - note.startTime;
                notes.push(note);
                activeNotes.delete(pitch);
            }
        }
    });
    
    // Close remaining active notes
    activeNotes.forEach(note => {
        note.endTime = currentTime;
        note.duration = currentTime - note.startTime;
        notes.push(note);
    });
    
    console.log(`✓ Notes extraites: ${notes.length}`);
    
    return notes;
}

// ========== GÉNÉRATION ADN 3D ==========
function generateDNAPath(notes) {
    const platforms = [];
    const ticksPerBeat = 480; // Standard MIDI resolution
    const beatsPerSecond = 2; // ~120 BPM
    const ticksPerSecond = ticksPerBeat * beatsPerSecond;
    
    // Analyse de la mélodie
    const pitches = notes.map(n => n.pitch);
    const avgPitch = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    const minPitch = Math.min(...pitches);
    const maxPitch = Math.max(...pitches);
    const pitchRange = maxPitch - minPitch;
    
    console.log(`\n🧬 Génération ADN:`);
    console.log(`Tessiture: ${minPitch}-${maxPitch} (range: ${pitchRange})`);
    console.log(`Pitch moyen: ${avgPitch.toFixed(1)}`);
    
    let previousTime = 0;
    let helixProgress = 0; // Progression sur la spirale (0 à 1)
    
    notes.forEach((note, i) => {
        const timeSeconds = note.startTime / ticksPerSecond;
        const timeDelta = (note.startTime - previousTime) / ticksPerSecond;
        
        // ========== POSITION Y (Vertical) ==========
        const y = DNA_CONFIG.baseHeight - (i * DNA_CONFIG.verticalSpacing);
        
        // ========== POSITION X/Z (Spirale ADN) ==========
        // Progression hélicoïdale basée sur le temps
        helixProgress = (i / notes.length) * DNA_CONFIG.helixTurns;
        const helixAngle = helixProgress * Math.PI * 2;
        
        // Offset angulaire basé sur la hauteur de note
        const pitchOffset = DNA_CONFIG.pitchToAngle(note.pitch);
        const totalAngle = helixAngle + pitchOffset;
        
        // Position sur le cercle
        const radius = DNA_CONFIG.helixRadius;
        const x = Math.cos(totalAngle) * radius;
        const z = Math.sin(totalAngle) * radius + 1; // +1 pour être devant le mur
        
        // ========== TAILLE PLATEFORME ==========
        const size = DNA_CONFIG.velocityToSize(note.velocity);
        
        // ========== PROFONDEUR (Durée de note) ==========
        const depth = DNA_CONFIG.durationToDepth(note.duration);
        
        // ========== COULEUR (Pitch) ==========
        // Gradient du grave (bleu) à l'aigu (rouge)
        const pitchNormalized = (note.pitch - minPitch) / (pitchRange || 1);
        const hue = (1 - pitchNormalized) * 240; // 240 (bleu) à 0 (rouge)
        const color = `hsl(${hue}, 70%, 60%)`;
        const colorHex = hslToHex(hue, 70, 60);
        
        // ========== TYPE DE PLATEFORME ==========
        // Basé sur la durée et vélocité
        let type = 'circle';
        if (note.duration > 1000) {
            type = 'tube'; // Notes longues = tubes
        } else if (note.velocity > 100) {
            type = 'star'; // Notes fortes = étoiles
        } else if (timeDelta > 0.5) {
            type = 'diamond'; // Silences = losanges
        }
        
        // ========== DÉTECTION ACCORDS ==========
        // Si plusieurs notes en même temps, créer pont
        const simultaneousNotes = notes.filter(n => 
            Math.abs(n.startTime - note.startTime) < 50
        );
        
        if (simultaneousNotes.length > 1) {
            type = 'halfPipe'; // Accords = demi-tubes (ponts)
        }
        
        platforms.push({
            x: x.toFixed(2),
            y: y.toFixed(2),
            z: z.toFixed(2),
            size: size.toFixed(2),
            depth: depth.toFixed(2),
            color: colorHex,
            colorName: color,
            type,
            note: {
                pitch: note.pitch,
                velocity: note.velocity,
                duration: note.duration,
                time: timeSeconds.toFixed(3),
                timeDelta: timeDelta.toFixed(3)
            },
            metadata: {
                index: i,
                helixAngle: (totalAngle * 180 / Math.PI).toFixed(1) + '°',
                isAccord: simultaneousNotes.length > 1
            }
        });
        
        previousTime = note.startTime;
    });
    
    return platforms;
}

// ========== ANALYSE AVANCÉE ==========
function analyzeMusicalStructure(platforms) {
    console.log(`\n📊 Analyse de structure:`);
    
    // Grouper par sections (changements de pattern)
    const sections = [];
    let currentSection = { start: 0, patterns: [] };
    
    for (let i = 1; i < platforms.length; i++) {
        const prev = platforms[i - 1];
        const curr = platforms[i];
        
        const timeDelta = parseFloat(curr.note.timeDelta);
        
        // Nouveau section si grand silence (> 1 sec)
        if (timeDelta > 1.0) {
            currentSection.end = i - 1;
            currentSection.length = currentSection.end - currentSection.start;
            sections.push(currentSection);
            currentSection = { start: i, patterns: [] };
        }
    }
    
    currentSection.end = platforms.length - 1;
    currentSection.length = currentSection.end - currentSection.start;
    sections.push(currentSection);
    
    console.log(`Sections détectées: ${sections.length}`);
    sections.forEach((sec, i) => {
        console.log(`  Section ${i + 1}: notes ${sec.start}-${sec.end} (${sec.length} notes)`);
    });
    
    // Détecter les répétitions (motifs mélodiques)
    const motifs = detectMotifs(platforms);
    console.log(`\nMotifs répétés: ${motifs.length}`);
    motifs.forEach((motif, i) => {
        console.log(`  Motif ${i + 1}: ${motif.pattern} (${motif.occurrences} fois)`);
    });
    
    // Détecter le climax (note la plus haute + forte)
    const climaxIndex = platforms.reduce((maxIdx, p, idx, arr) => {
        const score = p.note.pitch * p.note.velocity;
        const maxScore = arr[maxIdx].note.pitch * arr[maxIdx].note.velocity;
        return score > maxScore ? idx : maxIdx;
    }, 0);
    
    console.log(`\n🎯 Climax: note ${climaxIndex} (pitch ${platforms[climaxIndex].note.pitch})`);
    
    return { sections, motifs, climaxIndex };
}

function detectMotifs(platforms, windowSize = 4) {
    const motifs = new Map();
    
    for (let i = 0; i <= platforms.length - windowSize; i++) {
        const pattern = platforms.slice(i, i + windowSize)
            .map(p => p.note.pitch)
            .join('-');
        
        if (motifs.has(pattern)) {
            motifs.set(pattern, motifs.get(pattern) + 1);
        } else {
            motifs.set(pattern, 1);
        }
    }
    
    // Garder seulement les motifs répétés
    return Array.from(motifs.entries())
        .filter(([_, count]) => count > 1)
        .map(([pattern, count]) => ({ pattern, occurrences: count }))
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 5);
}

// ========== EXPORT JSON ==========
function exportToJSON(platforms, analysis, outputPath) {
    const output = {
        metadata: {
            generator: 'MIDI-to-DNA v1.0',
            timestamp: new Date().toISOString(),
            totalPlatforms: platforms.length,
            config: DNA_CONFIG
        },
        analysis,
        platforms
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n💾 Export: ${outputPath}`);
    console.log(`Taille: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
}

// ========== HELPER: HSL to HEX ==========
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
        console.log('Usage: node midi_to_dna.js <file.mid> [output.json]');
        console.log('\nExemple:');
        console.log('  node midi_to_dna.js data/midi/leo_10s_basic_pitch.mid');
        console.log('  node midi_to_dna.js song.mid data/dna_level.json');
        process.exit(1);
    }
    
    const midiPath = args[0];
    const outputPath = args[1] || midiPath.replace('.mid', '_dna.json');
    
    if (!fs.existsSync(midiPath)) {
        console.error(`❌ Fichier introuvable: ${midiPath}`);
        process.exit(1);
    }
    
    console.log('🧬 MIDI-to-DNA Converter\n');
    
    try {
        // 1. Extraire notes du MIDI
        const notes = extractMusicalDNA(midiPath);
        
        // 2. Générer structure ADN 3D
        const platforms = generateDNAPath(notes);
        
        // 3. Analyser structure musicale
        const analysis = analyzeMusicalStructure(platforms);
        
        // 4. Export JSON
        exportToJSON(platforms, analysis, outputPath);
        
        console.log('\n✨ Succès ! Prêt pour test_music_ball.html');
        console.log('\nPour charger:');
        console.log(`  const dnaData = await fetch('${outputPath}').then(r => r.json());`);
        console.log(`  loadDNAPlatforms(dnaData.platforms);`);
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { extractMusicalDNA, generateDNAPath, analyzeMusicalStructure };
