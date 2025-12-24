#!/usr/bin/env node
/**
 * GÉNÉRATEUR DE TRAJECTOIRE TEMPORELLE (VERSION JSON)
 * Lit les onsets depuis analyzeAudio.py et génère des keyframes
 * 
 * Usage:
 *   node generate_timed_from_json.js <audio-analysis.json> <output-json>
 *   node generate_timed_from_json.js /tmp/test_leo2.json data/leo_timed_path.json
 */

import { readFileSync, writeFileSync } from 'fs';

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
    platformWidth: 2.4,
    platformDepth: 2.4,
    rampWidth: 1.8,
    rampThickness: 0.15,
    gravity: -9.8,
    ball: {
        radius: 0.5
    },
    friction: {
        platform: 0.4,
        ramp: 0.2
    },
    restitution: 0.4,
    visual: {
        wall: {
            enabled: true,
            position: { x: -5 },
            tileSize: 2,
            colors: { dark: 0x2a2a4e, light: 0x3a3a6e },
            material: { metalness: 0.3, roughness: 0.7 },
            showGrid: true
        },
        supports: {
            enabled: true,
            shape: 'cylinder',
            radius: 0.1,
            color: 0x444466,
            material: { metalness: 0.8, roughness: 0.2, wireframe: true }
        },
        platforms: {
            wireframe: true,
            emissiveIntensity: 0.6,
            metalness: 0.5,
            roughness: 0.3
        },
        ramps: {
            color: 0x44aa88,
            wireframe: true,
            metalness: 0.7,
            roughness: 0.4
        },
        lights: {
            enabled: true,
            intensity: 0.3,
            distance: 10,
            flashIntensity: 2.0,
            flashDuration: 200
        },
        customShapes: []
    }
};

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
            shape: CONFIG.platformShape,
            width: CONFIG.platformWidth,
            depth: CONFIG.platformDepth,
            color: 0x4ECDC4,
            note: 60 + i,
            timing: 0
        });
        
        currentY -= CONFIG.verticalDrop;
        currentZ += CONFIG.depthStep;
    }
    
    return platforms;
}

// Calculer les keyframes pour synchroniser avec les onsets
function calculateKeyframes(onsets, platforms) {
    const keyframes = [];
    
    // Position de départ
    const startY = CONFIG.startHeight + CONFIG.platformHeight / 2 + CONFIG.ball.radius + 0.1;
    keyframes.push({
        time: 0,
        position: { x: CONFIG.startX, y: startY, z: CONFIG.startZ },
        velocity: { x: 0, y: 0, z: 0 }
    });
    
    // 🎯 Utiliser TOUTES les plateformes pour une descente fluide et visible
    const usableOnsets = onsets.slice(0, Math.min(onsets.length, platforms.length));
    
    for (let idx = 0; idx < usableOnsets.length; idx++) {
        const onset = usableOnsets[idx];
        const platform = platforms[idx];
        if (!platform) continue;
        
        // onset est un objet {t: ..., strength: ...}
        const onsetTime = typeof onset === 'object' ? onset.t : onset;
        const timeMs = Math.round(onsetTime * 1000);
        const targetY = platform.y + CONFIG.platformHeight / 2 + CONFIG.ball.radius;
        
        // D'ABORD: Ajouter un keyframe d'ARRIVÉE sur la plateforme actuelle
        keyframes.push({
            time: timeMs,
            position: { x: platform.x, y: targetY, z: platform.z },
            velocity: { x: 0, y: -5, z: 0 } // Petite vitesse vers le bas (impact)
        });
        
        // ENSUITE: Si on a une plateforme suivante, créer une trajectoire parabolique vers elle
        if (idx < usableOnsets.length - 1) {
            const nextOnset = usableOnsets[idx + 1];
            const nextOnsetTime = typeof nextOnset === 'object' ? nextOnset.t : nextOnset;
            const nextPlatform = platforms[idx + 1];
            const nextTimeMs = Math.round(nextOnsetTime * 1000);
            const timeDelta = (nextTimeMs - timeMs) / 1000; // secondes
            
            if (nextPlatform && timeDelta > 0) {
                const nextTargetY = nextPlatform.y + CONFIG.platformHeight / 2 + CONFIG.ball.radius;
                
                // Calculer la trajectoire parabolique entre les deux plateformes
                const dx = nextPlatform.x - platform.x;
                const dz = nextPlatform.z - platform.z;
                
                // 🎨 TRAJECTOIRE LISSE: Courbe douce entre plateformes
                // Au lieu de forcer un rebond impossible, créons un arc naturel
                
                const deltaY = nextTargetY - targetY;
                const vyDirect = (deltaY - 0.5 * CONFIG.gravity * timeDelta * timeDelta) / timeDelta;
                
                // Petit boost pour créer une légère courbe au lieu d'une ligne droite
                // Mais pas trop pour rester fluide et naturel
                const gentleBoost = 5; // m/s - juste assez pour une courbe élégante
                const vyInitial = vyDirect + gentleBoost;
                
                // Résultat: descente progressive et fluide, visible et élégante
                
                // Vitesses horizontales constantes
                const vx = dx / timeDelta;
                const vz = dz / timeDelta;
                
                // Créer des points intermédiaires le long de la parabole
                const numSteps = Math.max(8, Math.floor(timeDelta * 30)); // 30 points par seconde
                
                for (let step = 1; step <= numSteps; step++) { // step=1 pour éviter doublon avec keyframe d'arrivée
                    const t = step / numSteps; // 0 à 1
                    const elapsed = t * timeDelta;
                    const currentTime = timeMs + Math.round(elapsed * 1000);
                    
                    // Position parabolique (équations de mouvement avec gravité)
                    const pos = {
                        x: platform.x + vx * elapsed,
                        y: targetY + vyInitial * elapsed + 0.5 * CONFIG.gravity * elapsed * elapsed,
                        z: platform.z + vz * elapsed
                    };
                    
                    // Vélocité à cet instant (dérivée de la position)
                    const vel = {
                        x: vx,
                        y: vyInitial + CONFIG.gravity * elapsed,
                        z: vz
                    };
                    
                    keyframes.push({
                        time: currentTime,
                        position: pos,
                        velocity: vel
                    });
                }
            }
        } else {
            // Dernière plateforme - on complète la trajectoire jusqu'à elle
            // On utilise le temps restant depuis le dernier onset
            const prevOnset = idx > 0 ? usableOnsets[idx - 1] : 0;
            const prevOnsetTime = typeof prevOnset === 'object' ? prevOnset.t : prevOnset;
            const prevTimeMs = Math.round(prevOnsetTime * 1000 || 0);
            const timeDelta = (timeMs - prevTimeMs) / 1000; // secondes depuis la plateforme précédente
            
            if (timeDelta > 0.05) { // Si assez de temps pour une trajectoire
                const prevPlatform = idx > 0 ? platforms[idx - 1] : null;
                const startY = prevPlatform ? prevPlatform.y + CONFIG.platformHeight / 2 + CONFIG.ball.radius : CONFIG.startHeight;
                
                const dx = platform.x - (prevPlatform?.x || CONFIG.startX);
                const dz = platform.z - (prevPlatform?.z || CONFIG.startZ);
                const dy = targetY - startY;
                
                // Trajectoire parabolique finale vers la dernière plateforme
                const bounceHeight = Math.max(8, 15 - timeDelta * 3); // Rebond modéré pour la fin
                const apexY = Math.max(startY, targetY) + bounceHeight;
                
                const timeToApex = timeDelta / 2;
                const vyInitial = (apexY - startY) / timeToApex - 0.5 * CONFIG.gravity * timeToApex;
                
                const vx = dx / timeDelta;
                const vz = dz / timeDelta;
                
                const numSteps = Math.max(8, Math.floor(timeDelta * 30));
                
                for (let step = 0; step <= numSteps; step++) {
                    const t = step / numSteps;
                    const elapsed = t * timeDelta;
                    const currentTime = prevTimeMs + Math.round(elapsed * 1000);
                    
                    const pos = {
                        x: (prevPlatform?.x || CONFIG.startX) + vx * elapsed,
                        y: startY + vyInitial * elapsed + 0.5 * CONFIG.gravity * elapsed * elapsed,
                        z: (prevPlatform?.z || CONFIG.startZ) + vz * elapsed
                    };
                    
                    const vel = {
                        x: vx,
                        y: vyInitial + CONFIG.gravity * elapsed,
                        z: vz
                    };
                    
                    keyframes.push({
                        time: currentTime,
                        position: pos,
                        velocity: vel
                    });
                }
            } else {
                // Si pas assez de temps, juste un point d'arrivée
                keyframes.push({
                    time: timeMs,
                    position: { x: platform.x, y: targetY, z: platform.z },
                    velocity: { x: 0, y: -2, z: 0 }
                });
            }
        }
        
        // Mettre à jour le timing de la plateforme
        platform.timing = timeMs;
    }
    
    // Supprimer les doublons et trier
    const uniqueKeyframes = [];
    const seenTimes = new Set();
    
    for (const kf of keyframes) {
        if (!seenTimes.has(kf.time)) {
            seenTimes.add(kf.time);
            uniqueKeyframes.push(kf);
        }
    }
    
    uniqueKeyframes.sort((a, b) => a.time - b.time);
    
    console.log(`⏱️  ${uniqueKeyframes.length} keyframes générés (trajectoires paraboliques fluides)`);
    return uniqueKeyframes;
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
            rotation: Math.atan2(dx, dz),
            width: CONFIG.rampWidth,
            thickness: CONFIG.rampThickness
        });
    }
    
    return ramps;
}

// Main
function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node generate_timed_from_json.js <audio-analysis.json> <output-json>');
        console.error('Example: node generate_timed_from_json.js /tmp/test_leo2.json data/leo_timed_path.json');
        process.exit(1);
    }
    
    const audioJsonPath = args[0];
    const outputPath = args[1];
    
    console.log('🎬 Génération de trajectoire temporelle...\n');
    
    // Lire les onsets depuis le JSON d'analyse audio
    console.log(`📖 Lecture: ${audioJsonPath}`);
    const audioData = JSON.parse(readFileSync(audioJsonPath, 'utf-8'));
    
    // Les onsets peuvent être soit un array de nombres, soit un array d'objets {t, strength}
    let onsets = audioData.onsets || [];
    if (onsets.length > 0 && typeof onsets[0] === 'object' && 't' in onsets[0]) {
        // Extraire juste les timestamps
        onsets = onsets.map(o => o.t);
    }
    
    const duration = audioData.duration || 0;
    
    console.log(`🎵 ${onsets.length} onsets trouvés`);
    console.log(`⏱️  Durée: ${duration.toFixed(1)}s`);
    
    // Générer plateformes
    const platforms = generatePlatforms();
    console.log(`📦 ${platforms.length} plateformes générées`);
    
    // Calculer keyframes
    const keyframes = calculateKeyframes(onsets, platforms);
    
    // Générer rampes
    const ramps = generateRamps(platforms);
    console.log(`🔗 ${ramps.length} rampes générées`);
    
    // Construire le JSON final
    const output = {
        platforms: platforms,
        ramps: ramps,
        metadata: {
            generator: 'generate_timed_from_json v1.0',
            timestamp: new Date().toISOString(),
            audioSource: audioJsonPath,
            onsets: onsets.length,
            duration: duration,
            config: {
                ...CONFIG,
                ball: {
                    ...CONFIG.ball,
                    startVelocity: { x: 0, y: 0, z: 0 },
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
    console.log(`📊 ${keyframes.length} keyframes sur ${duration.toFixed(1)}s`);
    console.log(`🎯 Durée finale: ${(keyframes[keyframes.length - 1].time / 1000).toFixed(2)}s`);
}

main();
