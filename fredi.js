import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bodyParser from 'body-parser';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

import qrRouter from './qr.js';
import pairRouter from './pair.js';

app.use('/qr', qrRouter);
app.use('/code', pairRouter);
app.use('/pair', pairRouter);

// Create temp directory if it doesn't exist
const tempDir = join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Serve main.html for root route
app.get('/', (req, res) => {
    const mainHtmlPath = join(__dirname, 'main.html');
    if (fs.existsSync(mainHtmlPath)) {
        res.sendFile(mainHtmlPath);
    } else {
        res.status(404).send('main.html not found. Please ensure the file exists.');
    }
});

// Serve pair.html for /pair-page route (optional)
app.get('/pair-page', (req, res) => {
    const pairHtmlPath = join(__dirname, 'pair.html');
    if (fs.existsSync(pairHtmlPath)) {
        res.sendFile(pairHtmlPath);
    } else {
        res.status(404).send('pair.html not found');
    }
});

// Serve qr.html for /qr-page route (optional)
app.get('/qr-page', (req, res) => {
    const qrHtmlPath = join(__dirname, 'qr.html');
    if (fs.existsSync(qrHtmlPath)) {
        res.sendFile(qrHtmlPath);
    } else {
        res.status(404).send('qr.html not found');
    }
});

app.listen(PORT, () => {
    console.log(`
╭───( FEE XMD )───
├───≫ SERVER STATUS ≪───
├ 
├ 🚀 Server running on http://localhost:${PORT}
├ 
├ 📱 Pairing endpoints:
├    GET /code?number=YOUR_NUMBER
├    GET /qr
├ 
├ 🌐 Web interface: http://localhost:${PORT}
├ 
╰──────────────────☉
> ©powered by FrediEzra 
    `);
});

export default app;