import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Supabase Connection Pool
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("WARNING: DATABASE_URL environment variable is missing!");
}

const pool = new Pool({
    connectionString,
    ssl: connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1')
        ? { rejectUnauthorized: false }
        : false
});

// A wrapper class to mirror better-sqlite3 but using async PostgreSQL under the hood
class PreparedStatement {
    constructor(sql) {
        // Translate SQLite ? placeholders to PostgreSQL $1, $2, $3...
        let index = 1;
        this.sql = sql.replace(/\?/g, () => `$${index++}`);
    }

    async all(...args) {
        const flattened = args.flat();
        const res = await pool.query(this.sql, flattened);
        return res.rows;
    }

    async get(...args) {
        const flattened = args.flat();
        const res = await pool.query(this.sql, flattened);
        return res.rows[0] || null;
    }

    async run(...args) {
        const flattened = args.flat();
        // For Postgres, to get the lastInsertRowid, we might need RETURNING id.
        let querySql = this.sql;
        if (querySql.trim().toUpperCase().startsWith('INSERT') && !querySql.toUpperCase().includes('RETURNING')) {
            querySql += ' RETURNING id';
        }
        
        const res = await pool.query(querySql, flattened);
        const lastInsertRowid = res.rows[0]?.id || null;
        
        return {
            lastInsertRowid,
            changes: res.rowCount
        };
    }
}

const db = {
    prepare(sql) {
        return new PreparedStatement(sql);
    },
    
    async exec(sql) {
        return await pool.query(sql);
    },
    
    async runTransaction(fn) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await fn(client);
            await client.query('COMMIT');
            return result;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },
    
    // Helper to query table info (equivalent to PRAGMA table_info in SQLite)
    async getTableColumns(tableName) {
        const query = `
            SELECT column_name as name 
            FROM information_schema.columns 
            WHERE table_name = $1
        `;
        const res = await pool.query(query, [tableName]);
        return res.rows;
    }
};

// Automatic migrations to bootstrap Supabase database
const initDb = async () => {
    if (!connectionString) return;
    try {
        await db.exec(`
            -- Kullanıcılar
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                display_name VARCHAR(255),
                avatar VARCHAR(255) DEFAULT 'default',
                role VARCHAR(50) DEFAULT 'user',
                subscription_type VARCHAR(50) DEFAULT 'free',
                subscription_expires_at TIMESTAMP WITH TIME ZONE,
                theme VARCHAR(50) DEFAULT 'dark',
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                last_login_at TIMESTAMP WITH TIME ZONE
            );

            -- IPTV Kaynakları
            CREATE TABLE IF NOT EXISTS iptv_sources (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255),
                server_url VARCHAR(1024) NOT NULL,
                username VARCHAR(255),
                password VARCHAR(255),
                m3u_url VARCHAR(2048),
                channel_count INTEGER DEFAULT 0,
                last_synced_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Kanallar
            CREATE TABLE IF NOT EXISTS channels (
                id SERIAL PRIMARY KEY,
                source_id INTEGER NOT NULL REFERENCES iptv_sources(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(255) NOT NULL DEFAULT 'Genel',
                logo_url VARCHAR(2048),
                stream_url VARCHAR(2048) NOT NULL,
                resolution VARCHAR(50) DEFAULT 'SD',
                country VARCHAR(100),
                is_active INTEGER DEFAULT 1
            );

            CREATE INDEX IF NOT EXISTS idx_ch_source ON channels(source_id);
            CREATE INDEX IF NOT EXISTS idx_ch_category ON channels(source_id, category);
            CREATE INDEX IF NOT EXISTS idx_ch_name ON channels(name);
            CREATE INDEX IF NOT EXISTS idx_ch_res ON channels(resolution);

            -- İzleme Geçmişi
            CREATE TABLE IF NOT EXISTS watch_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                channel_id INTEGER,
                channel_name VARCHAR(255) NOT NULL,
                channel_category VARCHAR(255),
                stream_url VARCHAR(2048),
                started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                ended_at TIMESTAMP WITH TIME ZONE,
                duration_seconds INTEGER DEFAULT 0,
                resume_position REAL DEFAULT 0,
                device_type VARCHAR(100),
                resolution_watched VARCHAR(50)
            );
            CREATE INDEX IF NOT EXISTS idx_wh_user ON watch_history(user_id);
            CREATE INDEX IF NOT EXISTS idx_wh_date ON watch_history(started_at);

            -- Favoriler
            CREATE TABLE IF NOT EXISTS favorites (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                channel_id INTEGER,
                channel_name VARCHAR(255) NOT NULL,
                channel_logo VARCHAR(2048),
                stream_url VARCHAR(2048),
                added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Kampanyalar
            CREATE TABLE IF NOT EXISTS campaigns (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                type VARCHAR(50) NOT NULL,
                discount_percent INTEGER DEFAULT 0,
                free_days INTEGER DEFAULT 0,
                target_audience VARCHAR(100) DEFAULT 'all',
                starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
                ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
                is_active INTEGER DEFAULT 1,
                max_usage INTEGER DEFAULT 0,
                current_usage INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Kampanya Kullanımları
            CREATE TABLE IF NOT EXISTS campaign_usages (
                id SERIAL PRIMARY KEY,
                campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Abonelik İşlemleri
            CREATE TABLE IF NOT EXISTS subscription_transactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                plan VARCHAR(100) NOT NULL,
                amount REAL DEFAULT 0,
                currency VARCHAR(50) DEFAULT 'TRY',
                status VARCHAR(50) DEFAULT 'completed',
                campaign_id INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Reklam Gösterimleri
            CREATE TABLE IF NOT EXISTS ad_impressions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                ad_name VARCHAR(255) NOT NULL,
                was_skipped INTEGER DEFAULT 0,
                watch_duration_seconds INTEGER DEFAULT 0,
                clicked INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_ad_date ON ad_impressions(created_at);
        `);
        console.log("Supabase PostgreSQL Database synchronized and migrated successfully.");
    } catch (e) {
        console.error("Failed to run Supabase PostgreSQL migrations:", e);
    }
};

initDb();

export default db;
