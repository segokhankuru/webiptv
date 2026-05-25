import express from 'express';

const router = express.Router();

import { Readable } from 'stream';

router.get('/m3u', async (req, res) => {
    try {
        const targetUrl = req.query.url;
        if (!targetUrl) return res.status(400).json({ error: 'URL is required' });

        // Gerçek bir tarayıcı gibi davranıyoruz ve 'gzip' sıkıştırması istiyoruz. 
        // 30MB'lık dosya böylece sunucudan 4-5MB olarak çok hızlı iner!
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br'
            }
        });
        
        if (!response.ok) throw new Error(`Status: ${response.status} ${response.statusText}`);
        
        // Node.js'in C++ çekirdeğini kullanarak dosyayı tek seferde (hızlıca) RAM'e alıyoruz
        // Önceki yavaş JS reader döngüsünü tamamen kaldırdık.
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Length', buffer.length);
        
        // Toplu veriyi Frontend'e (localhost üzerinden anında) yolluyoruz
        res.send(buffer);
        
    } catch (err) {
        console.error('Proxy Error:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Proxy fetch failed: ' + err.message });
        } else {
            res.end();
        }
    }
});

router.post('/xtream', async (req, res) => {
    try {
        const { url, params } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required' });

        const urlObj = new URL(url);
        if (params) {
            Object.keys(params).forEach(key => urlObj.searchParams.append(key, params[key]));
        }

        const response = await fetch(urlObj.toString());
        if (!response.ok) throw new Error(`Failed to fetch from target: ${response.status}`);
        
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('Xtream Proxy Error:', err.message);
        res.status(500).json({ error: 'Xtream proxy fetch failed' });
    }
});

export default router;
