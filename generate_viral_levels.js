/**
 * Generate 3 VIRAL-WORTHY levels with Meshy
 * Complex but clean structures for physics + visual appeal
 */

import { generateAndDownload } from './src/ai/meshyClient.js';

const concepts = [
    {
        name: 'spiral_descent',
        prompt: `Luxury spiral staircase descending in elegant helix pattern.
Black marble steps with golden railings, 8-10 complete rotations.
Each step is a clean rectangular platform, evenly spaced vertically.
Continuous spiral path from top to bottom, perfect for ball rolling.
Premium materials, architectural precision, dark elegant background.
Low poly clean geometry, geometric perfection, golden accents on edges.`,
        style: 'sculpture'
    },
    {
        name: 'zigzag_cascade',
        prompt: `Dramatic zigzag cascade of black platforms descending.
Sharp angular turns, alternating left-right pattern, 12-15 platforms.
Each platform is a clean rectangular slab with golden trim borders.
Steep dramatic drops between levels, architectural tension.
Dark luxury aesthetic, premium materials, geometric precision.
Clean edges, minimalist design, golden metallic accents.`,
        style: 'sculpture'
    },
    {
        name: 'wave_parkour',
        prompt: `Flowing wave-like parkour course with rhythmic platforms.
Smooth curved ramps arranged in sine wave pattern, 10-12 sections.
Black matte surfaces with golden energy lines flowing through.
Dynamic ascending and descending motion, roller coaster aesthetic.
Luxury futuristic design, clean geometry, architectural flow.
Premium materials, elegant curves, golden highlights on peaks.`,
        style: 'sculpture'
    }
];

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  🎨 GENERATING VIRAL-WORTHY STRUCTURES');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('  Concepts:');
concepts.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.name.toUpperCase().replace(/_/g, ' ')}`);
});
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

async function generateAll() {
    for (let i = 0; i < concepts.length; i++) {
        const concept = concepts[i];
        const outputPath = `assets/${concept.name}_level.glb`;
        
        console.log(`\n[${ i + 1}/${concepts.length}] Generating: ${concept.name}`);
        console.log('─'.repeat(70));
        console.log(concept.prompt.split('\n')[0]);
        console.log('');
        
        try {
            const result = await generateAndDownload(concept.prompt, outputPath, {
                artStyle: concept.style,
                negativePrompt: 'cluttered, busy, complex details, noisy, chaotic, organic, rough'
            });
            
            console.log(`✅ Generated: ${outputPath}`);
            console.log(`📦 Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`🔗 Preview: ${result.previewUrl || 'N/A'}`);
            
        } catch (error) {
            console.error(`❌ Failed: ${error.message}`);
        }
        
        console.log('');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✨ GENERATION COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Test each level:');
    concepts.forEach((c, i) => {
        console.log(`  ${i + 1}. Edit test_physics.html line 163: 'assets/${c.name}_level.glb'`);
    });
    console.log('');
}

generateAll();
