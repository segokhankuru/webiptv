const Database = require('better-sqlite3');
const db = new Database('../data/iptv.db');
console.log(db.prepare('SELECT username, email FROM users').all());
