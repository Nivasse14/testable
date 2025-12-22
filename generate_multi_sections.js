/**
 * MÉTHODE ULTIME : Générer plusieurs variations + utiliser Meshy preview videos
 * 
 * Meshy génère automatiquement des preview turntable videos.
 * On génère 5-10 niveaux différents basés sur l'audio, puis on monte leurs previews.
 */

import { generateModel, checkTaskStatus, downloadModel } from '../src/ai/meshyClient.js';
import { readFileSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';

// Load audio analysis
const analysis = JSON.parse(readFileSync('/tmp/leo_10s_analysis.json', 'utf-8'));
const onsets = analysis.onsets;
const duration = analysis.duration;

// Divide into sections
const numSections = 6;
const sectionDuration = duration / numSections;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  🎨 MÉTHODE MULTI-VARIATIONS MESHY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Audio: ${duration}s`);
console.log(`  Sections: ${numSections}`);
console.log(`  Duration per section: ${sectionDuration.toFixed(1)}s`);
console.log('');

// Generate prompts for each section
function generatePromptForSection(sectionIndex, totalSections) {
    const progress = sectionIndex / totalSections;
    const intensity = ['calm', 'gentle', 'building', 'energetic', 'intense', 'climax'][sectionIndex];
    const geometry = ['gentle curves', 'smooth ramps', 'ascending paths', 'dynamic angles', 'steep drops', 'dramatic peaks'][sectionIndex];
    
    return `Luxury platformer level section ${sectionIndex + 1} of ${totalSections}.
${geometry}, ${intensity} energy.
Black marble with golden accents, premium materials.
Sophisticated architecture, elegant design.
Part of crescendo progression.
Low poly, clean geometry, dark background.`;
}

async function generateAllSections() {
    const tasks = [];
    
    console.log('🎨 Generating levels for each section...\n');
    
    for (let i = 0; i < numSections; i++) {
        const prompt = generatePromptForSection(i, numSections);
        console.log(`Section ${i + 1}/${numSections}:`);
        console.log(`  "${prompt.split('\n')[0]}..."`);
        
        try {
            const taskId = await generateModel(prompt, {
                artStyle: 'sculpture',
                negativePrompt: 'busy, cluttered, complex'
            });
            
            tasks.push({
                section: i,
                taskId,
                prompt
            });
            
            console.log(`  ✓ Task: ${taskId}\n`);
        } catch (error) {
            console.error(`  ❌ Failed: ${error.message}\n`);
        }
    }
    
    return tasks;
}

async function waitForAllTasks(tasks) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ⏳ WAITING FOR GENERATION (60-90s each)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    const results = [];
    
    for (const task of tasks) {
        console.log(`Section ${task.section + 1}: Checking task ${task.taskId}...`);
        
        let attempts = 0;
        let status = null;
        
        while (attempts < 36) { // 3 minutes max
            status = await checkTaskStatus(task.taskId);
            
            if (status.status === 'SUCCEEDED') {
                console.log(`  ✓ Complete! Progress: 100%`);
                
                results.push({
                    section: task.section,
                    taskId: task.taskId,
                    modelUrl: status.model_url,
                    previewUrl: status.preview_url,
                    videoUrl: status.video_url // Meshy preview turntable
                });
                
                break;
            } else if (status.status === 'FAILED') {
                console.error(`  ❌ Failed`);
                break;
            } else {
                const progress = status.progress || 0;
                console.log(`  Progress: ${progress}%`);
                await new Promise(r => setTimeout(r, 5000));
                attempts++;
            }
        }
        
        console.log('');
    }
    
    return results;
}

async function downloadAssets(results) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📥 DOWNLOADING ASSETS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    for (const result of results) {
        const glbPath = `assets/section_${result.section}.glb`;
        
        console.log(`Section ${result.section + 1}:`);
        console.log(`  GLB: ${glbPath}`);
        
        if (result.modelUrl) {
            await downloadModel(result.modelUrl, glbPath);
            console.log(`  ✓ Downloaded`);
        }
        
        if (result.videoUrl) {
            console.log(`  Video Preview: ${result.videoUrl}`);
        }
        
        console.log('');
    }
    
    // Save manifest
    writeFileSync('assets/sections_manifest.json', JSON.stringify(results, null, 2));
    console.log('✓ Manifest saved: assets/sections_manifest.json\n');
}

async function main() {
    try {
        // Generate all sections in parallel
        const tasks = await generateAllSections();
        
        if (tasks.length === 0) {
            console.error('❌ No tasks generated');
            process.exit(1);
        }
        
        // Wait for completion
        const results = await waitForAllTasks(tasks);
        
        // Download
        await downloadAssets(results);
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  ✨ DONE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log(`Generated ${results.length} level sections`);
        console.log('');
        console.log('Next steps:');
        console.log('  1. Review previews in assets/sections_manifest.json');
        console.log('  2. Use web renderer on each GLB');
        console.log('  3. Or stitch Meshy preview videos together');
        console.log('');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
