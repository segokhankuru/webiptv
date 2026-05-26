import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db, { initDb } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'super-secret-iptv-key-2026';

// Initialize default admin if not exists — migration tamamlandıktan sonra çalışır
const initAdmin = async () => {
    try {
        await initDb(); // Migration'ın bitmesini bekle
        const admin = await db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
        if (!admin) {
            const hash = bcrypt.hashSync('admin123', 10);
            await db.prepare('INSERT INTO users (username, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)').run(
                'admin', 'admin@iptv.local', hash, 'Administrator', 'admin'
            );
            console.log('Default admin created: admin / admin123');
        }
    } catch (e) {
        console.warn('Admin check/initialization deferred:', e.message);
    }
};
initAdmin();

router.post('/register', async (req, res) => {
    try {
        const { username, email, password, displayName } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email and password are required' });
        }

        const existingUser = await db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, email);
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        const hash = await bcrypt.hash(password, 10);
        
        const stmt = db.prepare('INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)');
        const result = await stmt.run(username, email, hash, displayName || username);

        res.status(201).json({ message: 'User registered successfully', userId: result.lastInsertRowid });
    } catch (err) {
        console.error("Register endpoint database error:", err);
        res.status(500).json({ error: 'Internal server error', message: err.message, stack: err.stack });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        if (user.is_active === 0) {
            return res.status(403).json({ error: 'Account is disabled' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        await db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, subType: user.subscription_type },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.display_name,
                role: user.role,
                theme: user.theme,
                subscriptionType: user.subscription_type
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await db.prepare('SELECT id, username, email, display_name, avatar, role, subscription_type, subscription_expires_at, theme FROM users WHERE id = ?').get(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const source = await db.prepare('SELECT id FROM iptv_sources WHERE user_id = ?').get(user.id);
        user.hasSource = !!source;
        
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

export default router;
