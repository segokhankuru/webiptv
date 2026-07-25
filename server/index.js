import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js'; // Ensure DB is initialized

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

import authRoutes from './routes/auth.js';
import proxyRoutes from './routes/proxy.js';
import channelRoutes from './routes/channels.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';

app.use('/api/auth', authRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Mobil / İstemci canlı konsol & hata akışı (Terminal çıktı servisi)
app.post('/api/remote-log', (req, res) => {
    const { level, args = [], stack, url, ua } = req.body || {};
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua || '');
    const tag = isMobile ? '📱 [iPhone/Mobile]' : '💻 [Client]';
    
    // Renk kodları: Hata (Kırmızı), Uyarı (Sarı), Bilgi (Mavi/Yeşil)
    const color = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : '\x1b[36m';
    const reset = '\x1b[0m';
    
    const message = args.join(' ');
    console.log(`${color}${tag} [${(level || 'LOG').toUpperCase()}]: ${message}${reset}`);
    if (stack) {
        console.log(`   ${color}└─ Stack: ${stack}${reset}`);
    }
    res.status(200).send('OK');
});


// Health check — authentication gerektirmez, DB bağlantısını doğrudan test eder
app.get('/api/health', async (req, res) => {
    try {
        const time = await db.prepare('SELECT NOW() as now').get();
        res.json({ status: 'ok', message: 'IPTV Backend is running', dbTime: time });
    } catch (e) {
        console.error("Health check database failure:", e);
        res.status(500).json({ status: 'error', error: e.message });
    }
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;
