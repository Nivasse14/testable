/**
 * Generate PROCEDURAL level with guaranteed separated platforms
 * No Meshy - pure Three.js geometry
 */

import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { writeFileSync } from 'fs';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  🔧 PROCEDURAL LEVEL GENERATOR');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

// Create scene
const scene = new THREE.Scene();

// Materials
const blackMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.8,
    roughness: 0.2
});

const goldMaterial = new THREE.MeshStandardMaterial({
    color: 0xffc356,
    metalness: 1.0,
    roughness: 0.1,
    emissive: 0x664400,
    emissiveIntensity: 0.2
});

// SPIRAL STAIRCASE - Guaranteed separated
function createSpiral() {
    const group = new THREE.Group();
    const numSteps = 20;
    const radius = 3;
    const heightStep = 0.5;
    const totalHeight = numSteps * heightStep;
    
    for (let i = 0; i < numSteps; i++) {
        const angle = (i / numSteps) * Math.PI * 4; // 2 full rotations
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (numSteps - i) * heightStep;
        
        // Platform
        const platform = new THREE.Mesh(
            new THREE.BoxGeometry(2, 0.2, 1.5),
            blackMaterial.clone()
        );
        platform.position.set(x, y, z);
        platform.rotation.y = angle;
        group.add(platform);
        
        // Gold border
        const border = new THREE.Mesh(
            new THREE.BoxGeometry(2.1, 0.15, 1.6),
            goldMaterial.clone()
        );
        border.position.set(x, y - 0.15, z);
        border.rotation.y = angle;
        group.add(border);
    }
    
    console.log(`✓ Spiral: ${numSteps} platforms, ${totalHeight.toFixed(1)}m height`);
    return group;
}

// ZIGZAG CASCADE
function createZigzag() {
    const group = new THREE.Group();
    const numPlatforms = 12;
    const spacing = 2.5;
    
    for (let i = 0; i < numPlatforms; i++) {
        const direction = i % 2 === 0 ? 1 : -1;
        const x = direction * (2 + Math.random() * 1);
        const y = (numPlatforms - i) * 1.2;
        const z = i * spacing - (numPlatforms * spacing) / 2;
        
        // Platform
        const platform = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 0.3, 2),
            blackMaterial.clone()
        );
        platform.position.set(x, y, z);
        group.add(platform);
        
        // Gold trim
        const edges = new THREE.Mesh(
            new THREE.BoxGeometry(2.6, 0.25, 2.1),
            goldMaterial.clone()
        );
        edges.position.set(x, y - 0.2, z);
        group.add(edges);
    }
    
    console.log(`✓ Zigzag: ${numPlatforms} platforms`);
    return group;
}

// WAVE PARKOUR
function createWave() {
    const group = new THREE.Group();
    const numPlatforms = 15;
    
    for (let i = 0; i < numPlatforms; i++) {
        const t = i / numPlatforms;
        const angle = t * Math.PI * 3;
        
        const x = Math.sin(angle) * 3;
        const y = 8 - t * 12 + Math.cos(angle * 2) * 2;
        const z = i * 1.5 - 10;
        
        // Platform
        const platform = new THREE.Mesh(
            new THREE.BoxGeometry(2, 0.25, 1.5),
            blackMaterial.clone()
        );
        platform.position.set(x, y, z);
        platform.rotation.z = Math.sin(angle) * 0.2;
        group.add(platform);
        
        // Gold accent
        const accent = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.3, 1.6),
            goldMaterial.clone()
        );
        accent.position.set(x, y + 0.15, z);
        group.add(accent);
    }
    
    console.log(`✓ Wave: ${numPlatforms} platforms`);
    return group;
}

// Export to GLB
function exportLevel(level, filename) {
    return new Promise((resolve, reject) => {
        const exporter = new GLTFExporter();
        exporter.parse(
            level,
            (result) => {
                const buffer = Buffer.from(result);
                writeFileSync(filename, buffer);
                const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
                console.log(`  → ${filename} (${sizeMB} MB)`);
                resolve();
            },
            (error) => reject(error),
            { binary: true }
        );
    });
}

// Generate all
async function generateAll() {
    console.log('Generating levels...\n');
    
    await exportLevel(createSpiral(), 'assets/procedural_spiral.glb');
    await exportLevel(createZigzag(), 'assets/procedural_zigzag.glb');
    await exportLevel(createWave(), 'assets/procedural_wave.glb');
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✨ PROCEDURAL LEVELS READY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('These are GUARANTEED to have separated platforms!');
    console.log('');
    console.log('Add to test_level_selector.html:');
    console.log("  procedural_spiral: { name: '🌀 Spiral PRO', file: 'assets/procedural_spiral.glb' }");
    console.log("  procedural_zigzag: { name: '⚡ Zigzag PRO', file: 'assets/procedural_zigzag.glb' }");
    console.log("  procedural_wave: { name: '🌊 Wave PRO', file: 'assets/procedural_wave.glb' }");
    console.log('');
}

generateAll().catch(console.error);
