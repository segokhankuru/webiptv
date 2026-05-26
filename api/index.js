import app from '../server/index.js';
import { initDb } from '../server/db.js';

export default async function handler(req, res) {
    await initDb();
    return app(req, res);
}
