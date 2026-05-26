import app from '../server/index.js';
import { initDb } from '../server/db.js';

// Vercel serverless function handler
// Her cold-start'ta migration'ın tamamlanmasını garanti eder
export default async function handler(req, res) {
    await initDb();
    return app(req, res);
}
