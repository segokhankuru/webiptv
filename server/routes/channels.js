import express from 'express';
import db from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to extract and validate active source profile
const getActiveSourceId = async (req) => {
    const sourceId = req.headers['x-active-source-id'];
    if (!sourceId) {
        throw new Error('Aktif profil seçilmedi.');
    }
    const source = await db.prepare('SELECT id FROM iptv_sources WHERE id = ? AND user_id = ?').get(sourceId, req.user.id);
    if (!source) {
        throw new Error('Geçersiz veya yetkisiz profil.');
    }
    return sourceId;
};

// Synchronize channels for a specific source
router.post('/sync', verifyToken, async (req, res) => {
    const { server_url, username, password, m3u_url, channels, sourceId: reqSourceId } = req.body;
    
    if (!channels || !Array.isArray(channels)) {
        return res.status(400).json({ error: 'Channels array is required' });
    }

    try {
        let sourceId;
        let existingSource = null;

        if (reqSourceId) {
            existingSource = await db.prepare('SELECT id FROM iptv_sources WHERE id = ? AND user_id = ?').get(reqSourceId, req.user.id);
        } else if (m3u_url) {
            existingSource = await db.prepare('SELECT id FROM iptv_sources WHERE user_id = ? AND m3u_url = ?').get(req.user.id, m3u_url);
        }
        
        if (existingSource) {
            sourceId = existingSource.id;
            // Clean up old channels for this source
            await db.prepare('DELETE FROM channels WHERE source_id = ?').run(sourceId);
        } else {
            let name = 'Yeni Profil';
            if (m3u_url) {
                try {
                    const parsed = new URL(m3u_url);
                    name = parsed.hostname;
                } catch (e) {}
            }
            const info = await db.prepare('INSERT INTO iptv_sources (user_id, name, server_url, username, password, m3u_url) VALUES (?, ?, ?, ?, ?, ?)')
                .run(req.user.id, name, server_url || '', username || '', password || '', m3u_url || '');
            sourceId = info.lastInsertRowid;
        }

        // Run multi-inserts inside a transaction using a checked-out pool connection for safety
        await db.runTransaction(async (client) => {
            const insertChannelQuery = `
                INSERT INTO channels (source_id, name, category, logo_url, stream_url, resolution, country) 
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;
            for (const ch of channels) {
                await client.query(insertChannelQuery, [
                    sourceId, 
                    ch.name, 
                    ch.category || 'Genel', 
                    ch.logo || null, 
                    ch.streamUrl, 
                    ch.resolution || 'SD', 
                    ch.country || null
                ]);
            }
        });
        
        // Update the channel count and last sync timestamp for this source
        await db.prepare('UPDATE iptv_sources SET channel_count = ?, last_synced_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(channels.length, sourceId);

        res.json({ success: true, message: `${channels.length} channels synchronized.`, sourceId });
    } catch (err) {
        console.error('Channel sync error:', err);
        res.status(500).json({ error: 'Failed to synchronize channels' });
    }
});

// Get categories for the active profile
router.get('/categories', verifyToken, async (req, res) => {
    try {
        const sourceId = await getActiveSourceId(req);
        const rows = await db.prepare('SELECT category, COUNT(*) as count FROM channels WHERE source_id = ? AND is_active = 1 GROUP BY category ORDER BY count DESC').all(sourceId);
        res.json(rows);
    } catch (err) {
        const status = (err.message.includes('seçilmedi') || err.message.includes('Geçersiz')) ? 400 : 500;
        res.status(status).json({ error: err.message });
    }
});

// Get paginated channels for the active profile
router.get('/', verifyToken, async (req, res) => {
    try {
        const sourceId = await getActiveSourceId(req);
        const category = req.query.category || 'Genel';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        const channels = await db.prepare('SELECT * FROM channels WHERE source_id = ? AND category = ? AND is_active = 1 LIMIT ? OFFSET ?')
            .all(sourceId, category, limit, offset);
            
        const countRow = await db.prepare('SELECT COUNT(*) as total FROM channels WHERE source_id = ? AND category = ? AND is_active = 1')
            .get(sourceId, category);

        res.json({
            data: channels,
            total: countRow ? parseInt(countRow.total) : 0,
            page,
            totalPages: countRow ? Math.ceil(parseInt(countRow.total) / limit) : 0
        });
    } catch (err) {
        const status = (err.message.includes('seçilmedi') || err.message.includes('Geçersiz')) ? 400 : 500;
        res.status(status).json({ error: err.message });
    }
});

// Search channels within the active profile
router.get('/search', verifyToken, async (req, res) => {
    try {
        const sourceId = await getActiveSourceId(req);
        const q = req.query.q;
        if (!q) return res.json([]);
        
        const limit = parseInt(req.query.limit) || 50;
        // Postgres ILIKE provides case-insensitive search
        const channels = await db.prepare("SELECT * FROM channels WHERE source_id = ? AND name ILIKE ? AND is_active = 1 LIMIT ?")
            .all(sourceId, `%${q}%`, limit);
            
        res.json(channels);
    } catch (err) {
        const status = (err.message.includes('seçilmedi') || err.message.includes('Geçersiz')) ? 400 : 500;
        res.status(status).json({ error: err.message });
    }
});

// Get specific channel with verification
router.get('/:id', verifyToken, async (req, res) => {
    try {
        if (req.params.id === 'categories' || req.params.id === 'search' || req.params.id === 'sync') return;
        
        const channel = await db.prepare('SELECT * FROM channels WHERE id = ?').get(parseInt(req.params.id) || 0);
        if (!channel) return res.status(404).json({ error: 'Kanal bulunamadı' });
        
        // Verify channel ownership via source_id
        const source = await db.prepare('SELECT id FROM iptv_sources WHERE id = ? AND user_id = ?').get(channel.source_id, req.user.id);
        if (!source) {
            return res.status(403).json({ error: 'Unauthorized access to channel' });
        }
        
        res.json(channel);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

export default router;
