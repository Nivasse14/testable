/**
 * Regenerate spiral with SEPARATED platforms for physics
 */

import { generateAndDownload } from './src/ai/meshyClient.js';

const improvedPrompt = `Spiral staircase made of 20 SEPARATED individual rectangular steps.
Each step is a DETACHED floating platform, clearly separated from others.
Steps arranged in helix pattern descending downward, visible gaps between each step.
Black marble steps with golden edges, luxury aesthetic.
Each platform must be an independent object, NOT connected.
Architectural precision, clean geometry, dark background.
Low poly style, geometric clarity, golden metallic accents on platform borders.`;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  🔧 REGENERATING SPIRAL - SEPARATED PLATFORMS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('Improvement: Individual separated platforms instead of solid block');
console.log('');

async function regenerate() {
    try {
        const result = await generateAndDownload(improvedPrompt, 'assets/spiral_v2_level.glb', {
            artStyle: 'sculpture',
            negativePrompt: 'solid block, continuous surface, connected, merged, closed, tube, pipe'
        });
        
        console.log('');
        console.log('✅ Generated: assets/spiral_v2_level.glb');
        console.log(`📦 Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
        console.log('');
        console.log('Test: Update test_level_selector.html');
        console.log("  Add: spiral_v2: { name: '🌀 Spiral v2', file: 'assets/spiral_v2_level.glb' }");
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

regenerate();
