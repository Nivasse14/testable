/**
 * Test Meshy.ai - Génération niveau luxe
 */

import { generateAndDownload } from './src/ai/meshyClient.js';
import { join } from 'path';

const LUXURY_PROMPT = `
Luxury platformer game level with elegant ramps and stairs. 
Black matte surfaces with golden trim accents. 
Dark elegant background. Premium materials.
Smooth curved ramps descending in an elegant pattern.
Golden decorative borders on platforms.
Sophisticated architecture, high-end design.
Low poly style, clean geometry.
`.trim();

async function main() {
  const outputPath = join(process.cwd(), 'assets', 'luxury_level.glb');

  console.log('\n🏆 Génération niveau LUXE avec Meshy.ai\n');
  console.log('Prompt:');
  console.log(LUXURY_PROMPT);
  console.log('\n' + '─'.repeat(70) + '\n');

  try {
    const glbPath = await generateAndDownload(LUXURY_PROMPT, outputPath, {
      artStyle: 'realistic',
      targetPolycount: 50000,
      maxWaitSeconds: 300, // 5 minutes max
    });

    console.log('\n✅ SUCCESS!');
    console.log(`\nModèle généré: ${glbPath}`);
    console.log('\nProchaine étape: Import dans Blender');
    console.log('  blender -b -P import_meshy_level.py -- --glb assets/luxury_level.glb');

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    process.exit(1);
  }
}

main();
