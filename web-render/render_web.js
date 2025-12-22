/**
 * Render Web Viewer to Video using Puppeteer
 * NO BLENDER - Pure Web Tech
 */

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Config
const FPS = 30;
const DURATION = 10; // seconds
const TOTAL_FRAMES = FPS * DURATION;
const FRAMES_DIR = '../frames/web_render';
const OUTPUT_VIDEO = '../output/leo_10s_web_v0.mp4';

// Load audio analysis
const analysis = JSON.parse(readFileSync('/tmp/leo_10s_analysis.json', 'utf-8'));
const onsetTimes = analysis.onsets.map(o => o.t);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  🌐 WEB RENDERER - No Blender Required');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Frames: ${TOTAL_FRAMES}`);
console.log(`  Onsets: ${onsetTimes.length}`);
console.log('');

async function captureFrames() {
    console.log('🚀 Launching headless Chrome...');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security'
        ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });
    
    // Inject onset times
    await page.evaluateOnNewDocument((onsets) => {
        window.ONSET_TIMES = onsets;
        window.PUPPETEER_MODE = true;
    }, onsetTimes);
    
    // Load viewer
    const viewerPath = 'file://' + join(__dirname, 'viewer.html');
    console.log(`📄 Loading: ${viewerPath}`);
    
    await page.goto(viewerPath, { waitUntil: 'networkidle0' });
    
    // Wait for level to load
    console.log('⏳ Waiting for 3D level to load...');
    await page.waitForFunction(() => window.startAnimation !== undefined, { timeout: 10000 });
    
    console.log('✓ Level loaded\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📹 CAPTURING FRAMES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    // Create frames directory
    spawn('mkdir', ['-p', FRAMES_DIR], { stdio: 'ignore' });
    
    // Start animation
    await page.evaluate(() => window.startAnimation());
    
    // Capture frames
    for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
        const screenshot = await page.screenshot({ type: 'png' });
        const framePath = join(FRAMES_DIR, `frame_${String(frame).padStart(5, '0')}.png`);
        
        await import('fs').then(fs => 
            fs.promises.writeFile(framePath, screenshot)
        );
        
        if (frame % 30 === 0 || frame === TOTAL_FRAMES - 1) {
            const progress = ((frame / TOTAL_FRAMES) * 100).toFixed(1);
            console.log(`  Frame ${frame}/${TOTAL_FRAMES} (${progress}%)`);
        }
        
        // Advance animation by one frame
        await page.evaluate(() => {
            // Trigger next frame
            const event = new Event('nextFrame');
            window.dispatchEvent(event);
        });
        
        // Small delay for render
        await page.waitForTimeout(1000 / FPS);
    }
    
    console.log('');
    console.log('✓ All frames captured');
    await browser.close();
}

function encodeVideo() {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🎞️  ENCODING VIDEO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
            '-y',
            '-framerate', String(FPS),
            '-i', join(FRAMES_DIR, 'frame_%05d.png'),
            '-i', '../audio/leo_10s.mp3',
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-shortest',
            OUTPUT_VIDEO
        ], { stdio: 'inherit' });
        
        ffmpeg.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`FFmpeg failed: ${code}`));
        });
    });
}

async function main() {
    try {
        await captureFrames();
        await encodeVideo();
        
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  ✨ VIDEO READY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log(`  📹 ${OUTPUT_VIDEO}`);
        console.log('');
        
        // Show file size
        const { statSync } = await import('fs');
        const stats = statSync(OUTPUT_VIDEO);
        console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log('');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
