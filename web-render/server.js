/**
 * Simple local server to serve the viewer
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Serve static files from parent directory
app.use(express.static(join(__dirname, '..')));

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, '..', 'test_viewer.html'));
});

app.listen(PORT, () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🌐 LOCAL SERVER RUNNING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(`  📍 http://localhost:${PORT}`);
    console.log('');
    console.log('  Press Ctrl+C to stop');
    console.log('');
});
