import express from 'express';
import db from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    next();
};

router.use(verifyToken, isAdmin);

// Get Dashboard Stats
router.get('/stats', async (req, res) => {
    try {
        const usersRow = await db.prepare('SELECT COUNT(*) as count FROM users').get();
        const channelsRow = await db.prepare('SELECT COUNT(*) as count FROM channels').get();
        const campaignsRow = await db.prepare('SELECT COUNT(*) as count FROM campaigns').get();
        const recentRow = await db.prepare("SELECT COUNT(*) as count FROM users WHERE last_login_at >= NOW() - INTERVAL '7 days'").get();

        res.json({
            usersCount: usersRow ? parseInt(usersRow.count) : 0,
            channelsCount: channelsRow ? parseInt(channelsRow.count) : 0,
            campaignsCount: campaignsRow ? parseInt(campaignsRow.count) : 0,
            recentLogins: recentRow ? parseInt(recentRow.count) : 0
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get Users List
router.get('/users', async (req, res) => {
    try {
        const users = await db.prepare(`
            SELECT id, username, email, display_name, role, subscription_type, is_active, last_login_at, created_at 
            FROM users 
            ORDER BY created_at DESC
        `).all();
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Update User (Edit all details)
router.put('/users/:id', async (req, res) => {
    try {
        const { username, email, role, is_active } = req.body;
        const userId = req.params.id;
        
        // Prevent breaking the main admin account
        if (userId == 1 && is_active === 0) {
            return res.status(400).json({ error: 'Cannot disable the main admin' });
        }
        if (userId == 1 && role === 'user') {
            return res.status(400).json({ error: 'Cannot demote the main admin' });
        }

        const currentUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!currentUser) return res.status(404).json({ error: 'User not found' });

        await db.prepare(`
            UPDATE users 
            SET username = ?, email = ?, role = ?, is_active = ? 
            WHERE id = ?
        `).run(
            username || currentUser.username,
            email || currentUser.email,
            role || currentUser.role,
            is_active !== undefined ? is_active : currentUser.is_active,
            userId
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message.includes('UNIQUE') ? 'Kullanıcı adı veya E-posta zaten kullanımda.' : 'Veritabanı hatası' });
    }
});

export default router;
