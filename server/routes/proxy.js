import express from 'express';

const router = express.Router();

import { Readable } from 'stream';

router.get('/m3u', async (req, res) => {
    try {
        const targetUrl = req.query.url;
        if (!targetUrl) return res.status(400).json({ error: 'URL is required' });

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br'
            }
        });
        
        if (!response.ok) throw new Error(`Status: ${response.status} ${response.statusText}`);
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const contentType = response.headers.get('content-type') || 'text/plain; charset=utf-8';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', buffer.length);
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

/**
 * Stream Proxy — HTTP stream URL'lerini HTTPS üzerinden iletir.
 * Mixed Content sorununu çözer: uygulama https:// iken stream http:// ise
 * tarayıcı direkt erişimi bloklar. Sunucu bu isteği yapıp pipe eder.
 * Range header destekli (seek/resume için gerekli).
 */
router.get('/stream', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'url parametresi gerekli' });

    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*',
        };
        // Range header ilet — video seek için kritik
        if (req.headers.range) {
            headers['Range'] = req.headers.range;
        }

        const upstream = await fetch(targetUrl, { headers });
        const statusCode = upstream.status; // 200 veya 206 Partial Content

        // Önemli response header'larını ilet
        const forwardHeaders = [
            'content-type', 'content-length', 'content-range',
            'accept-ranges', 'cache-control', 'last-modified', 'etag'
        ];
        forwardHeaders.forEach(h => {
            const val = upstream.headers.get(h);
            if (val) res.setHeader(h, val);
        });

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(statusCode);

        // Body'yi stream olarak pipe et (büyük dosyaları RAM'e yüklemeden)
        if (upstream.body) {
            const reader = upstream.body.getReader();
            const nodeStream = new Readable({
                async read() {
                    const { done, value } = await reader.read();
                    if (done) this.push(null);
                    else this.push(Buffer.from(value));
                }
            });
            nodeStream.pipe(res);
            req.on('close', () => reader.cancel());
        } else {
            res.end();
        }
    } catch (err) {
        console.error('Stream Proxy Error:', err.message);
        if (!res.headersSent) {
            res.status(502).json({ error: 'Stream proxy failed: ' + err.message });
        } else {
            res.end();
        }
    }
});

export default router;
