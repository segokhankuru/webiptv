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

/**
 * Xtream Codes Player API Proxy (GET)
 * Xtream player_api.php çağrılarını sunucu üzerinden proxyle.
 * Kullanım: /api/proxy/xtream?server=http://...&username=U&password=P&action=get_live_categories
 */
router.get('/xtream', async (req, res) => {
    try {
        const { server, username, password, action, category_id, vod_id, series_id, stream_id } = req.query;
        if (!server || !username || !password || !action) {
            return res.status(400).json({ error: 'server, username, password, action are required' });
        }

        const apiUrl = new URL(`${server}/player_api.php`);
        apiUrl.searchParams.set('username', username);
        apiUrl.searchParams.set('password', password);
        apiUrl.searchParams.set('action', action);
        if (category_id) apiUrl.searchParams.set('category_id', category_id);
        if (vod_id) apiUrl.searchParams.set('vod_id', vod_id);
        if (series_id) apiUrl.searchParams.set('series_id', series_id);
        if (stream_id) apiUrl.searchParams.set('stream_id', stream_id);

        const response = await fetch(apiUrl.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) throw new Error(`Xtream server returned ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('Xtream Proxy Error:', err.message);
        res.status(500).json({ error: 'Xtream proxy failed: ' + err.message });
    }
});

// Legacy POST endpoint (altyazı için kullanılıyor, korunuyor)
router.post('/xtream', async (req, res) => {
    try {
        const { url, params } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required' });

        const urlObj = new URL(url);
        if (params) {
            Object.keys(params).forEach(key => urlObj.searchParams.append(key, params[key]));
        }

        const response = await fetch(urlObj.toString(), {
            signal: AbortSignal.timeout(15000)
        });
        if (!response.ok) throw new Error(`Failed to fetch from target: ${response.status}`);

        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('Xtream POST Proxy Error:', err.message);
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

    let reader = null;

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
            reader = upstream.body.getReader();
            const nodeStream = new Readable({
                async read() {
                    try {
                        const { done, value } = await reader.read();
                        if (done) {
                            this.push(null);
                        } else {
                            this.push(Buffer.from(value));
                        }
                    } catch (readErr) {
                        // Upstream bağlantı kopması (ECONNRESET, UND_ERR_SOCKET vb.)
                        // Bu hatayı yakalayıp stream'i düzgünce kapatıyoruz, sunucu çökmez
                        console.warn('Stream read error (upstream dropped):', readErr.message);
                        this.push(null); // Stream'i temiz şekilde kapat
                    }
                }
            });

            // Stream hatalarını yakala — sunucu çökmesini engelle
            nodeStream.on('error', (err) => {
                console.warn('Stream pipe error:', err.message);
                if (!res.headersSent) res.status(502).end();
                else res.end();
            });

            nodeStream.pipe(res);

            // İstemci bağlantıyı kapatırsa upstream reader'ı iptal et
            req.on('close', () => {
                try { if (reader) reader.cancel(); } catch(e) {}
            });
        } else {
            res.end();
        }
    } catch (err) {
        console.error('Stream Proxy Error:', err.message);
        if (reader) { try { reader.cancel(); } catch(e) {} }
        if (!res.headersSent) {
            res.status(502).json({ error: 'Stream proxy failed: ' + err.message });
        } else {
            res.end();
        }
    }
});
/**
 * HLS Proxy — iOS Safari için m3u8 playlist proxy.
 * 
 * Sorun: iOS Safari MSE desteklemez, sadece native HLS oynatır.
 * Native HLS oynatıcı m3u8 içindeki segment URL'lerini doğrudan çeker.
 * Eğer segment URL'leri http:// ise mixed content engeli, farklı domain ise CORS engeli oluşur.
 * 
 * Çözüm: Bu endpoint m3u8 dosyasını sunucu tarafında fetch eder,
 * içindeki tüm segment URL'lerini /api/proxy/stream üzerinden geçecek şekilde yeniden yazar.
 * Böylece Safari her şeyi aynı origin'den çeker.
 */
router.get('/hls', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'url parametresi gerekli' });

    try {
        console.log(`📱 [HLS Proxy] Fetching: ${targetUrl}`);
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*'
            },
            signal: AbortSignal.timeout(10000)
        });

        const contentType = response.headers.get('content-type') || '';
        console.log(`📱 [HLS Proxy] Response: ${response.status}, Content-Type: ${contentType}`);

        if (!response.ok) throw new Error(`Upstream ${response.status}`);

        const m3u8Text = await response.text();
        
        // Yanıtın gerçekten bir m3u8 dosyası olup olmadığını kontrol et
        const isValidM3u8 = m3u8Text.trimStart().startsWith('#EXTM3U');
        console.log(`📱 [HLS Proxy] Valid m3u8: ${isValidM3u8}, Content length: ${m3u8Text.length}`);
        console.log(`📱 [HLS Proxy] İlk 300 karakter:\n${m3u8Text.substring(0, 300)}`);
        
        if (!isValidM3u8) {
            // Sunucu m3u8 değil TS stream döndürüyor — doğrudan stream proxy'ye yönlendir
            console.log(`📱 [HLS Proxy] ❌ Geçerli m3u8 değil! /api/proxy/stream'e yönlendiriliyor...`);
            return res.redirect(`/api/proxy/stream?url=${encodeURIComponent(targetUrl)}`);
        }

        // Base URL hesapla (relative path'leri çözmek için)
        const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

        // m3u8 içindeki her satırı işle
        const rewrittenLines = m3u8Text.split('\n').map(line => {
            const trimmed = line.trim();

            // Boş satır veya yorum/tag satırı → olduğu gibi bırak
            if (!trimmed || trimmed.startsWith('#')) {
                // EXT-X-MAP veya EXT-X-KEY gibi URI= içeren tag'lerdeki URL'leri de yeniden yaz
                if (trimmed.includes('URI="')) {
                    return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
                        const absoluteUri = uri.startsWith('http') ? uri : baseUrl + uri;
                        return `URI="/api/proxy/stream?url=${encodeURIComponent(absoluteUri)}"`;
                    });
                }
                return line;
            }

            // Segment URL satırı → proxy'ye yönlendir
            let segmentUrl = trimmed;
            if (segmentUrl.startsWith('http://') || segmentUrl.startsWith('https://')) {
                // Absolute URL
                return `/api/proxy/stream?url=${encodeURIComponent(segmentUrl)}`;
            } else if (segmentUrl.startsWith('/')) {
                // Root-relative URL → origin + path
                try {
                    const origin = new URL(targetUrl).origin;
                    return `/api/proxy/stream?url=${encodeURIComponent(origin + segmentUrl)}`;
                } catch(e) {
                    return `/api/proxy/stream?url=${encodeURIComponent(baseUrl + segmentUrl)}`;
                }
            } else {
                // Relative URL
                return `/api/proxy/stream?url=${encodeURIComponent(baseUrl + segmentUrl)}`;
            }
        });

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-cache, no-store');
        res.send(rewrittenLines.join('\n'));

    } catch (err) {
        console.error('HLS Proxy Error:', err.message);
        if (!res.headersSent) {
            res.status(502).json({ error: 'HLS proxy failed: ' + err.message });
        }
    }
});

export default router;
