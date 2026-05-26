import express from 'express';
import db from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Watch History - Start / Update
router.post('/watch', verifyToken, async (req, res) => {
    try {
        const { channel_id, channel_name, channel_category, stream_url, device_type, resolution_watched } = req.body;
        
        const insertStmt = db.prepare(`
            INSERT INTO watch_history (user_id, channel_id, channel_name, channel_category, stream_url, device_type, resolution_watched) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        const info = await insertStmt.run(
            req.user.id, 
            channel_id || null, 
            channel_name, 
            channel_category || 'Genel', 
            stream_url, 
            device_type || 'desktop', 
            resolution_watched || 'SD'
        );
        
        res.json({ id: info.lastInsertRowid });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.put('/watch/:id', verifyToken, async (req, res) => {
    try {
        const { duration_seconds, resume_position } = req.body;
        const historyId = req.params.id;
        
        await db.prepare('UPDATE watch_history SET duration_seconds = ?, resume_position = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
          .run(duration_seconds, resume_position, historyId, req.user.id);
           
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Favorites
router.get('/favorites', verifyToken, async (req, res) => {
    try {
        // Favoriler artık kendi verilerini tutuyor (channel_name, channel_logo, stream_url)
        // channels tablosuna JOIN gerekmez çünkü kanal verileri artık client-side IndexedDB'de
        const rows = await db.prepare(`
            SELECT id, channel_id, channel_name as name, channel_logo as logo_url, stream_url, added_at
            FROM favorites 
            WHERE user_id = ?
            ORDER BY added_at DESC
        `).all(req.user.id);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/favorites', verifyToken, async (req, res) => {
    try {
        const { channel_id, channel_name, channel_logo, stream_url } = req.body;
        
        const exists = await db.prepare('SELECT id FROM favorites WHERE user_id = ? AND stream_url = ?').get(req.user.id, stream_url);
        if (exists) return res.json({ success: true, id: exists.id });
        
        const info = await db.prepare('INSERT INTO favorites (user_id, channel_id, channel_name, channel_logo, stream_url) VALUES (?, ?, ?, ?, ?)')
            .run(req.user.id, channel_id || null, channel_name, channel_logo || null, stream_url);
            
        res.json({ success: true, id: info.lastInsertRowid });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.delete('/favorites/:id', verifyToken, async (req, res) => {
    try {
        await db.prepare('DELETE FROM favorites WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Theme Update
router.post('/theme', verifyToken, async (req, res) => {
    try {
        const { theme } = req.body;
        const validThemes = ['dark', 'light', 'amoled', 'ocean', 'forest'];
        if (!validThemes.includes(theme)) return res.status(400).json({ error: 'Invalid theme' });
        
        await db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, req.user.id);
        res.json({ success: true, theme });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Subscription (Dummy payment)
router.post('/subscribe', verifyToken, async (req, res) => {
    try {
        const { plan, durationDays } = req.body;
        const days = durationDays || 30;
        
        await db.prepare(`
            UPDATE users 
            SET subscription_type = ?, 
                subscription_expires_at = CURRENT_TIMESTAMP + make_interval(days => ?::int) 
            WHERE id = ?
        `).run(plan || 'premium', days, req.user.id);
        
        await db.prepare(`
            INSERT INTO subscription_transactions (user_id, plan, amount) 
            VALUES (?, ?, ?)
        `).run(req.user.id, plan || 'premium', 99.99);
        
        res.json({ success: true, message: 'Subscription activated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET user sources (profiles). Auto-generates defaults if none exist.
router.get('/sources', verifyToken, async (req, res) => {
    try {
        let rows = [];
        try {
            rows = await db.prepare('SELECT * FROM iptv_sources WHERE user_id = ? ORDER BY id ASC').all(req.user.id);
        } catch (e) {
            console.error("Error reading iptv_sources:", e);
            return res.json([]);
        }
        
        if (rows.length === 0) {
            try {
                const defaults = [
                    { name: 'Free-TV IPTV', m3u_url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8' },
                    { name: 'Global IPTV', m3u_url: 'https://iptv-org.github.io/iptv/index.m3u' }
                ];
                
                const columns = await db.getTableColumns('iptv_sources');
                const hasName = columns.some(c => c.name === 'name');
                
                if (hasName) {
                    const insertStmt = db.prepare('INSERT INTO iptv_sources (user_id, name, server_url, m3u_url, channel_count) VALUES (?, ?, ?, ?, ?)');
                    for (const d of defaults) {
                        await insertStmt.run(req.user.id, d.name, '', d.m3u_url, 0);
                    }
                } else {
                    const insertStmt = db.prepare('INSERT INTO iptv_sources (user_id, server_url, m3u_url, channel_count) VALUES (?, ?, ?, ?)');
                    for (const d of defaults) {
                        await insertStmt.run(req.user.id, '', d.m3u_url, 0);
                    }
                }
                
                const newRows = await db.prepare('SELECT * FROM iptv_sources WHERE user_id = ? ORDER BY id ASC').all(req.user.id);
                return res.json(newRows);
            } catch (err) {
                console.error("Failed to insert default sources:", err);
                return res.json([]);
            }
        }
        
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// POST a new source (profile)
router.post('/sources', verifyToken, async (req, res) => {
    try {
        const { name, m3u_url } = req.body;
        if (!name || !m3u_url) {
            return res.status(400).json({ error: 'Name and M3U URL are required' });
        }
        
        let info;
        const columns = await db.getTableColumns('iptv_sources');
        const hasName = columns.some(c => c.name === 'name');
        
        if (hasName) {
            info = await db.prepare('INSERT INTO iptv_sources (user_id, name, server_url, m3u_url, channel_count) VALUES (?, ?, ?, ?, ?)')
                .run(req.user.id, name, '', m3u_url, 0);
        } else {
            info = await db.prepare('INSERT INTO iptv_sources (user_id, server_url, m3u_url, channel_count) VALUES (?, ?, ?, ?)')
                .run(req.user.id, '', m3u_url, 0);
        }
            
        res.status(201).json({
            success: true,
            id: info.lastInsertRowid,
            name,
            m3u_url,
            channel_count: 0
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// DELETE a source (profile)
router.delete('/sources/:id', verifyToken, async (req, res) => {
    try {
        const sourceId = req.params.id;
        const source = await db.prepare('SELECT id FROM iptv_sources WHERE id = ? AND user_id = ?').get(sourceId, req.user.id);
        
        if (!source) {
            return res.status(404).json({ error: 'Source profile not found or unauthorized' });
        }
        
        await db.prepare('DELETE FROM iptv_sources WHERE id = ?').run(sourceId);
        res.json({ success: true, message: 'Source profile deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

export default router;
