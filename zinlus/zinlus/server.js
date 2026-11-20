/**
 * ZINLUS - Servidor Local HTTP
 * Servidor ultraligero nativo de Node.js (cero dependencias externas).
 * 
 * Permite ejecutar el juego localmente para pruebas en Google Chrome y Meta Quest 2.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const BASE_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.toml': 'text/plain'
};

const server = http.createServer((req, res) => {
    // Cabeceras de seguridad y compatibilidad WebXR
    res.setHeader('Permissions-Policy', 'xr-spatial-tracking=*, camera=(), microphone=()');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/') reqUrl = '/index.html';

    const safePath = path.normalize(reqUrl).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(BASE_DIR, safePath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 - Archivo no encontrado');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n========================================`);
    console.log(`   ZINLUS - SERVIDOR LOCAL INICIADO     `);
    console.log(`========================================`);
    console.log(`> Acceso Local (PC):    http://localhost:${PORT}`);
    console.log(`> Acceso Red (Quest 2): http://[TU-IP-LOCAL]:${PORT}`);
    console.log(`========================================\n`);
});
