#!/usr/bin/env node

/**
 * 🌀 GÉNÉRATEUR DE TRAJECTOIRE EN SPIRALE HYPNOTISANTE
 * 
 * Au lieu de forcer des rebonds impossibles, la balle descend en spirale
 * autour d'un axe central - c'est fluide, spectaculaire, et mathématiquement parfait!
 */

import { readFileSync, writeFileSync } from 'fs';

const CONFIG = {
    startHeight: 20,
    platformHeight: 1,
    ball: { radius: 0.5 },
    gravity: -9.8
};

function generateSpiralTube(centerX, centerZ, spiralRadius, totalRotations, startY, totalHeight) {
    // Génère les segments du tube spiral
    const segments = [];
    const tubeSegments = 120; // Nombre de segments pour le tube
    const tubeRadius = 1.2; // Rayon du tube (plus large que la balle)
    
    for (let i = 0; i < tubeSegments; i++) {
        const t = i / tubeSegments;
        const angle = t * totalRotations * Math.PI * 2;
        const y = startY - t * totalHeight;
        const x = centerX + spiralRadius * Math.cos(angle);
        const z = centerZ + spiralRadius * Math.sin(angle);
        
        segments.push({
            position: { x, y, z },
            radius: tubeRadius,
            angle: angle
        });
    }
    
    return segments;
}

function generateSpiralTrajectory(platforms) {
    const keyframes = [];
    
    // 🌀 PARAMÈTRES DE LA SPIRALE
    const centerX = 0;
    const centerZ = 13.5; // Milieu de la profondeur totale (0→27m)
    const spiralRadius = 6; // Rayon de la spirale
    const totalRotations = 4; // 4 tours complets
    
    const startY = CONFIG.startHeight + CONFIG.platformHeight / 2 + CONFIG.ball.radius;
    const endY = platforms[platforms.length - 1].y + CONFIG.platformHeight / 2 + CONFIG.ball.radius;
    const totalHeight = startY - endY;
    
    const duration = 6.0; // 6 secondes hypnotisantes
    const fps = 60;
    const totalFrames = Math.floor(duration * fps);
    
    console.log(`🌀 Génération spirale: ${totalRotations} tours sur ${duration}s`);
    console.log(`   Rayon: ${spiralRadius}m, Descente: ${totalHeight.toFixed(1)}m`);
    
    for (let frame = 0; frame <= totalFrames; frame++) {
        const t = frame / totalFrames; // 0 à 1
        const timeMs = Math.round(t * duration * 1000);
        
        // Descente linéaire fluide
        const y = startY - t * totalHeight;
        
        // Spirale: cos/sin pour rotation circulaire
        const angle = t * totalRotations * Math.PI * 2;
        const x = centerX + spiralRadius * Math.cos(angle);
        const z = centerZ + spiralRadius * Math.sin(angle);
        
        // Vitesses (dérivées)
        const angularVelocity = (totalRotations * Math.PI * 2) / duration;
        const vx = -spiralRadius * angularVelocity * Math.sin(angle);
        const vy = -totalHeight / duration;
        const vz = spiralRadius * angularVelocity * Math.cos(angle);
        
        keyframes.push({
            time: timeMs,
            position: { x, y, z },
            velocity: { x: vx, y: vy, z: vz }
        });
    }
    
    return keyframes;
}

function generatePlatforms() {
    const platforms = [];
    let currentY = 20;
    let currentZ = 0;
    
    for (let i = 0; i < 10; i++) {
        platforms.push({
            id: `platform_${i}`,
            x: 0,
            y: currentY,
            z: currentZ,
            width: 3,
            height: CONFIG.platformHeight,
            depth: 3,
            shape: 'box'
        });
        currentY -= 2;
        currentZ += 3;
    }
    
    return platforms;
}

function main() {
    const outputPath = process.argv[2] || 'data/leo_spiral_path.json';
    
    console.log('🌀 Génération trajectoire spirale hypnotisante...\n');
    
    const platforms = generatePlatforms();
    const keyframes = generateSpiralTrajectory(platforms);
    
    // Générer le tube spiral
    const centerX = 0;
    const centerZ = 13.5;
    const spiralRadius = 6;
    const totalRotations = 4;
    const startY = CONFIG.startHeight + CONFIG.platformHeight / 2 + CONFIG.ball.radius;
    const endY = platforms[platforms.length - 1].y + CONFIG.platformHeight / 2 + CONFIG.ball.radius;
    const totalHeight = startY - endY;
    const spiralTube = generateSpiralTube(centerX, centerZ, spiralRadius, totalRotations, startY, totalHeight);
    
    const data = {
        version: '1.0',
        mode: 'keyframes',
        platforms,
        ramps: [],
        spiralTube: spiralTube,
        metadata: {
            heightRange: { top: 20, bottom: 2 },
            widthRange: { left: -6, right: 6 },
            config: {
                ball: {
                    mode: 'keyframes',
                    radius: CONFIG.ball.radius,
                    startVelocity: { x: 0, y: 0, z: 0 },
                    trajectoryMode: 'keyframes',
                    keyframes
                },
                visual: {
                    wall: { enabled: false },
                    platforms: {
                        enabled: false,
                        color: 0x00ffff,
                        opacity: 0.7
                    },
                    supports: { enabled: false },
                    lights: {
                        enabled: false,
                        intensity: 1,
                        distance: 10
                    },
                    spiralTube: {
                        enabled: true,
                        color: 0x00ff88,
                        opacity: 0.4,
                        emissive: 0x004400
                    }
                }
            }
        }
    };
    
    writeFileSync(outputPath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Trajectoire spirale sauvegardée: ${outputPath}`);
    console.log(`📊 ${keyframes.length} keyframes sur ${(keyframes[keyframes.length-1].time/1000).toFixed(1)}s`);
    console.log(`🌀 La balle descend en spirale - fluide et hypnotisant!`);
}

main();
