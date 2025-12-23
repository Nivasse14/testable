#!/usr/bin/env node
/**
 * GÉNÉRATEUR DE PARCOURS ZIGZAG
 * Calcule les positions exactes des plateformes et rampes
 * Export JSON pour visualisation
 */

import { writeFileSync } from 'fs';

const CONFIG = {
    numPlatforms: 10,
    startHeight: 20,
    startX: 0,            // Centré horizontalement
    startZ: 0,            // Commence devant
    verticalDrop: 2,      // Descente entre niveaux
    depthStep: 3,         // Avancement en profondeur (escalier visible de côté)
    platformRadius: 1.2,  // Plateformes moyennes
    platformHeight: 0.3,
    platformShape: 'cylinder',  // 'cylinder', 'box', 'sphere'
    platformWidth: 2.4,   // Pour shape = 'box'
    platformDepth: 2.4,   // Pour shape = 'box'
    rampWidth: 1.8,
    rampThickness: 0.15,
    gravity: -9.8,
    ball: {
        radius: 0.5,       // Taille de la bille
        startVelocity: {   // Direction initiale
            x: 0,
            y: 0,
            z: 0
        }
    },
    friction: {
        platform: 0.4,
        ramp: 0.2
    },
    restitution: 0.4,
    
    // ========== CONFIGURATION VISUELLE ==========
    visual: {
        // Mur d'arrière-plan
        wall: {
            enabled: true,
            position: { x: -5 },  // Position du mur
            tileSize: 2,          // Taille des carreaux
            colors: {
                dark: 0x2a2a4e,   // Couleur foncée du damier
                light: 0x3a3a6e   // Couleur claire du damier
            },
            material: {
                metalness: 0.3,
                roughness: 0.7
            },
            showGrid: true        // Afficher les bordures entre carreaux
        },
        
        // Bras de support reliant plateformes au mur
        supports: {
            enabled: true,
            shape: 'cylinder',    // 'cylinder', 'box'
            radius: 0.1,          // Pour cylinder
            width: 0.2,           // Pour box
            height: 0.2,          // Pour box
            color: 0x444466,
            material: {
                metalness: 0.8,
                roughness: 0.2,
                wireframe: true
            }
        },
        
        // Rendu des plateformes
        platforms: {
            wireframe: true,      // Afficher en wireframe
            emissiveIntensity: 0.6,
            metalness: 0.5,
            roughness: 0.3,
            castShadow: true,
            receiveShadow: true
        },
        
        // Rendu des rampes
        ramps: {
            color: 0x44aa88,
            wireframe: true,
            metalness: 0.7,
            roughness: 0.4,
            castShadow: true,
            receiveShadow: true
        },
        
        // Lumières sur les plateformes
        lights: {
            enabled: true,
            intensity: 2,
            distance: 5,
            flashIntensity: 8,    // Intensité lors de collision
            flashDuration: 300    // Durée du flash en ms
        },
        
        // EXEMPLES DE FORMES PERSONNALISÉES
        // Tu peux ajouter des objets décoratifs ici
        customShapes: [
            // Exemple 1: Anneau circulaire autour du parcours
            {
                type: 'torus',         // torus, torusKnot, ring
                enabled: false,
                position: { x: 0, y: 10, z: 15 },
                radius: 5,
                tube: 0.5,
                radialSegments: 16,
                tubularSegments: 100,
                color: 0xff6600,
                rotation: { x: 1.5708, y: 0, z: 0 },  // Math.PI/2
                material: {
                    wireframe: true,
                    metalness: 0.8,
                    roughness: 0.2
                }
            },
            // Exemple 2: Cercle décoratif vertical
            {
                type: 'ring',
                enabled: false,
                position: { x: -3, y: 10, z: 15 },
                innerRadius: 2,
                outerRadius: 3,
                thetaSegments: 32,
                color: 0x00ffff,
                rotation: { x: 0, y: 1.5708, z: 0 },  // Math.PI/2
                material: {
                    wireframe: true,
                    metalness: 0.5,
                    roughness: 0.5,
                    side: 'double'  // Visible des deux côtés
                }
            },
            // Exemple 3: Cube décoratif fermé
            {
                type: 'box',
                enabled: false,
                position: { x: 3, y: 5, z: 10 },
                width: 1,
                height: 1,
                depth: 1,
                color: 0xff00ff,
                rotation: { x: 0.5, y: 0.5, z: 0 },
                material: {
                    wireframe: false,  // Solide
                    metalness: 0.9,
                    roughness: 0.1,
                    transparent: true,
                    opacity: 0.7
                }
            },
            // Exemple 4: Spirale torusKnot
            {
                type: 'torusKnot',
                enabled: false,
                position: { x: 0, y: 15, z: 20 },
                radius: 3,
                tube: 0.3,
                tubularSegments: 100,
                radialSegments: 16,
                p: 2,  // Paramètres de la spirale
                q: 3,
                color: 0xffff00,
                rotation: { x: 0, y: 0, z: 0 },
                material: {
                    wireframe: true,
                    metalness: 0.6,
                    roughness: 0.4
                }
            },
            // Exemple 5: Sphère wireframe
            {
                type: 'sphere',
                enabled: false,
                position: { x: 0, y: 12, z: 15 },
                radius: 2,
                widthSegments: 16,
                heightSegments: 16,
                color: 0x00ff00,
                rotation: { x: 0, y: 0, z: 0 },
                material: {
                    wireframe: true,
                    metalness: 0.5,
                    roughness: 0.5
                }
            },
            // Exemple 6: Cylindre horizontal
            {
                type: 'cylinder',
                enabled: false,
                position: { x: 2, y: 8, z: 12 },
                radiusTop: 0.5,
                radiusBottom: 0.5,
                height: 4,
                radialSegments: 16,
                color: 0xff0000,
                rotation: { x: 0, y: 0, z: 1.5708 },  // Math.PI/2
                material: {
                    wireframe: true,
                    metalness: 0.7,
                    roughness: 0.3
                }
            },
            // Exemple 7: Plan incliné décoratif
            {
                type: 'plane',
                enabled: false,
                position: { x: 0, y: 10, z: 15 },
                width: 10,
                height: 10,
                color: 0x8800ff,
                rotation: { x: 0.7854, y: 0, z: 0 },  // Math.PI/4
                material: {
                    wireframe: false,
                    metalness: 0.3,
                    roughness: 0.7,
                    transparent: true,
                    opacity: 0.3,
                    side: 'double'
                }
            }
        ]
    }
};

function generateZigzagPath() {
    const platforms = [];
    const ramps = [];
    
    let currentX = CONFIG.startX;
    let currentY = CONFIG.startHeight;
    let currentZ = CONFIG.startZ;
    
    // Générer les plateformes en escalier (descente + profondeur)
    for (let i = 0; i < CONFIG.numPlatforms; i++) {
        const platform = {
            id: i,
            x: currentX,
            y: currentY,
            z: currentZ,
            radius: CONFIG.platformRadius,
            height: CONFIG.platformHeight,
            shape: CONFIG.platformShape,
            width: CONFIG.platformWidth,   // Pour box
            depth: CONFIG.platformDepth,   // Pour box
            color: colorForIndex(i),
            note: 60 + (i % 12),
            timing: i * 0.5  // Timing approximatif
        };
        platforms.push(platform);
        
        // Préparer prochaine position (descendre + avancer en profondeur)
        if (i < CONFIG.numPlatforms - 1) {
            currentY -= CONFIG.verticalDrop;
            currentZ += CONFIG.depthStep;  // Avancer pour créer un escalier visible de côté
        }
    }
    
    // Générer les rampes entre plateformes
    for (let i = 0; i < CONFIG.numPlatforms - 1; i++) {
        const p1 = platforms[i];
        const p2 = platforms[i + 1];
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dz = p2.z - p1.z;
        const length = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        const ramp = {
            id: i,
            startX: p1.x,
            startY: p1.y - CONFIG.platformHeight / 2,
            startZ: p1.z,
            endX: p2.x,
            endY: p2.y + CONFIG.platformHeight / 2,
            endZ: p2.z,
            width: CONFIG.rampWidth,
            thickness: CONFIG.rampThickness,
            length,
            midX: (p1.x + p2.x) / 2,
            midY: (p1.y + p2.y) / 2,
            midZ: (p1.z + p2.z) / 2,
            angleY: Math.atan2(dx, dz),
            angleX: -Math.atan2(dy, Math.sqrt(dx*dx + dz*dz)),
            fromPlatform: i,
            toPlatform: i + 1
        };
        ramps.push(ramp);
    }
    
    return { platforms, ramps };
}

function colorForIndex(index) {
    const hue = (index / CONFIG.numPlatforms) * 360;
    const saturation = 80;
    const lightness = 50;
    return hslToHex(hue, saturation, lightness);
}

function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
    return `0x${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// ========== MAIN ==========
const outputPath = process.argv[2] || 'data/zigzag_path.json';

console.log('🎢 GÉNÉRATEUR DE PARCOURS ZIGZAG');
console.log('=================================\n');

const { platforms, ramps } = generateZigzagPath();

const output = {
    metadata: {
        generator: 'generate_zigzag_path v1.0',
        timestamp: new Date().toISOString(),
        config: CONFIG,
        totalPlatforms: platforms.length,
        totalRamps: ramps.length,
        ballStart: {
            x: CONFIG.startX,
            y: CONFIG.startHeight + CONFIG.platformHeight / 2 + CONFIG.ball.radius + 0.1,  // Juste au-dessus de la plateforme
            z: CONFIG.startZ,
            velocity: CONFIG.ball.startVelocity
        },
        ball: {
            radius: CONFIG.ball.radius
        },
        heightRange: {
            top: CONFIG.startHeight,
            bottom: CONFIG.startHeight - (CONFIG.numPlatforms - 1) * CONFIG.verticalDrop
        },
        widthRange: {
            left: Math.min(...platforms.map(p => p.x)),
            right: Math.max(...platforms.map(p => p.x))
        }
    },
    platforms,
    ramps
};

writeFileSync(outputPath, JSON.stringify(output, null, 2));

const fileSize = JSON.stringify(output).length;
console.log(`✅ ${platforms.length} plateformes générées`);
console.log(`✅ ${ramps.length} rampes générées`);
console.log(`📏 Hauteur: ${output.metadata.heightRange.top} à ${output.metadata.heightRange.bottom.toFixed(1)}`);
console.log(`📏 Largeur: ${output.metadata.widthRange.left} à ${output.metadata.widthRange.right}`);
console.log(`\n💾 Export: ${outputPath}`);
console.log(`📦 Taille: ${(fileSize / 1024).toFixed(1)} KB`);
console.log('\n✨ SUCCÈS ! Parcours zigzag calculé\n');
console.log('💡 Utilise test_zigzag_viewer.html pour visualiser');
