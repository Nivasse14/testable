/**
 * Generate Meshy model based on audio analysis
 * Prompt 1: Elegant Crescendo (matches leo_10s.mp3 crescendo pattern)
 */

import { generateAndDownload } from './src/ai/meshyClient.js';

const prompt = `Luxury platformer level with ascending elegant ramps.
Black marble platforms with golden accents, progressive design.
Starts with gentle curved ramps, becomes steeper and more dramatic.
Crescendo visual progression from calm to intense.
Premium materials, sophisticated architecture.
Low poly style, clean elegant geometry.`;

const outputPath = 'assets/leo_10s_crescendo_level.glb';

console.log('🎵 Generating audio-driven level...');
console.log('Prompt: Elegant Crescendo (matches music intensity increase)');
console.log('');

try {
  const result = await generateAndDownload(prompt, outputPath, {
    artStyle: 'sculpture',
    negativePrompt: 'busy, cluttered, complex, noisy, chaotic'
  });
  
  console.log('');
  console.log('✅ Level generated successfully!');
  console.log(`📦 File: ${outputPath}`);
  console.log(`🔗 Preview: ${result.previewUrl}`);
  console.log('');
  console.log('Next: Import to Blender...');
} catch (error) {
  console.error('❌ Generation failed:', error.message);
  process.exit(1);
}
