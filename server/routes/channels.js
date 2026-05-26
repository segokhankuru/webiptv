import express from 'express';
import db from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Update channel count metadata for a source after client-side sync
// Channels are stored in IndexedDB on the client — only the count is sent here
router.patch('/sync-meta', verifyToken, async (req, res) => {
    const { sourceId, channelCount } = req.body;
    
    if (!sourceId || channelCount === undefined) {
        return res.status(400).json({ error: 'sourceId and channelCount are required' });
    }

    try {
        // Verify ownership
        const source = await db.prepare('SELECT id FROM iptv_sources WHERE id = ? AND user_id = ?').get(sourceId, req.user.id);
        if (!source) {
            return res.status(403).json({ error: 'Unauthorized source' });
        }

        await db.prepare('UPDATE iptv_sources SET channel_count = ?, last_synced_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(channelCount, sourceId);

        res.json({ success: true, message: `Channel count updated to ${channelCount}` });
    } catch (err) {
        console.error('Channel sync-meta error:', err);
        res.status(500).json({ error: 'Failed to update channel metadata' });
    }
});

export default router;
