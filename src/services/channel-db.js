/**
 * channel-db.js — IndexedDB tabanlı kanal deposu
 * 
 * Tüm kanal verileri (100K+) client tarafında IndexedDB'de tutulur.
 * Sunucuya sadece profil bilgileri ve kanal sayısı gönderilir.
 */

const DB_NAME = 'webiptv-channels';
const DB_VERSION = 2;
const STORE_NAME = 'channels';

let _db = null;

/**
 * IndexedDB bağlantısını açar / oluşturur.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
    if (_db) return Promise.resolve(_db);

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const oldVersion = event.oldVersion;

            let store;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                store = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });

                // Profilin tüm kanallarını bulmak için
                store.createIndex('sourceId', 'sourceId', { unique: false });

                // Kategori bazlı listeleme: [sourceId, category]
                store.createIndex('sourceCategory', ['sourceId', 'category'], { unique: false });

                // İsim bazlı arama: [sourceId, name]
                store.createIndex('sourceName', ['sourceId', 'name'], { unique: false });
            } else {
                store = event.target.transaction.objectStore(STORE_NAME);
            }

            // V2: isAdult index'i ekle
            if (oldVersion < 2) {
                if (!store.indexNames.contains('sourceAdult')) {
                    store.createIndex('sourceAdult', ['sourceId', 'isAdult'], { unique: false });
                }
            }
        };

        request.onsuccess = (event) => {
            _db = event.target.result;
            resolve(_db);
        };

        request.onerror = (event) => {
            console.error('IndexedDB açılamadı:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Bir profil için tüm kanalları toplu olarak yazar.
 * Önce o profile ait eski kanalları siler, sonra yenilerini ekler.
 * 
 * @param {number|string} sourceId - Profil ID
 * @param {Array} channels - Kanal dizisi [{name, category, logo, streamUrl, resolution, country}]
 * @param {function} [onProgress] - İlerleme callback (0-100)
 * @returns {Promise<number>} Eklenen kanal sayısı
 */
async function saveChannels(sourceId, channels, onProgress) {
    const db = await openDB();
    const sid = Number(sourceId);

    // Önce eski kanalları temizle
    await clearChannels(sid);

    // Batch insert — performans için tek transaction içinde
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        let inserted = 0;
        const total = channels.length;
        const reportInterval = Math.max(1, Math.floor(total / 20)); // %5'lik adımlar

        for (let i = 0; i < total; i++) {
            const ch = channels[i];
            // Skip channels without a valid stream URL (safety guard)
            if (!ch.streamUrl) continue;

            let logo = ch.logo || null;
            if (logo && logo.startsWith('http://')) {
                logo = `https://webiptv.se-gokhankuru.workers.dev/http/${logo.substring(7)}`;
            }

            const record = {
                sourceId: sid,
                name: ch.name || 'Bilinmeyen',
                category: ch.category || 'Genel',
                logo: logo,
                streamUrl: ch.streamUrl,
                resolution: ch.resolution || 'SD',
                country: ch.country || null,
                isAdult: ch.isAdult || false
            };

            const req = store.add(record);
            req.onsuccess = () => {
                inserted++;
                if (onProgress && inserted % reportInterval === 0) {
                    onProgress(Math.round((inserted / total) * 100));
                }
            };
        }

        tx.oncomplete = () => {
            if (onProgress) onProgress(100);
            resolve(inserted);
        };

        tx.onerror = (event) => {
            console.error('IndexedDB batch insert hatası:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Bir profile ait kategori listesini ve kanal sayılarını döndürür.
 * 
 * @param {number|string} sourceId
 * @returns {Promise<Array<{category: string, count: number}>>}
 */
async function getCategories(sourceId, includeAdult = null) {
    const db = await openDB();
    const sid = Number(sourceId);
    
    // includeAdult null ise localStorage'dan oku
    const allowAdult = includeAdult !== null ? includeAdult : (localStorage.getItem('iptv_allow_adult') === 'true');

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('sourceCategory');

        // sourceId ile başlayan tüm kayıtları cursor ile tara
        const range = IDBKeyRange.bound([sid], [sid, []]);
        const categories = {};

        const req = index.openCursor(range);
        req.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const record = cursor.value;
                const cat = record.category || 'Genel';
                
                // Adult filtresi: izin yoksa adult kanalları sayma
                if (!allowAdult && record.isAdult) {
                    cursor.continue();
                    return;
                }
                
                categories[cat] = (categories[cat] || 0) + 1;
                cursor.continue();
            } else {
                // Cursor bitti, sonuçları dönüştür ve sayıya göre sırala
                const result = Object.entries(categories)
                    .map(([category, count]) => ({ category, count }))
                    .sort((a, b) => b.count - a.count);
                resolve(result);
            }
        };

        req.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Bir profilin belirli kategorisindeki kanalları sayfalanmış olarak döndürür.
 * 
 * @param {number|string} sourceId
 * @param {string} category
 * @param {number} [page=1]
 * @param {number} [limit=50]
 * @returns {Promise<{data: Array, total: number, page: number, totalPages: number}>}
 */
async function getChannelsByCategory(sourceId, category, page = 1, limit = 50) {
    const db = await openDB();
    const sid = Number(sourceId);
    const allowAdult = localStorage.getItem('iptv_allow_adult') === 'true';

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('sourceCategory');
        const range = IDBKeyRange.only([sid, category]);

        const results = [];
        let total = 0;
        const offset = (page - 1) * limit;
        let skipped = 0;

        // Adult filtre varsa count'u manuel saymalıyız
        const cursorReq = index.openCursor(range);
        let counting = true;
        let allFiltered = [];

        cursorReq.onsuccess = (event) => {
            const cursor = event.target.result;
            if (!cursor) {
                // Tüm kayıtları aldık, şimdi sayfalama yap
                total = allFiltered.length;
                const paged = allFiltered.slice(offset, offset + limit);
                resolve({
                    data: paged,
                    total,
                    page,
                    totalPages: Math.ceil(total / limit)
                });
                return;
            }

            const record = cursor.value;
            
            // Adult filtresi
            if (!allowAdult && record.isAdult) {
                cursor.continue();
                return;
            }

            allFiltered.push(record);
            cursor.continue();
        };

        cursorReq.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Bir profil içinde kanal adına göre arama yapar (case-insensitive contains).
 * 
 * @param {number|string} sourceId
 * @param {string} query
 * @param {number} [limit=50]
 * @returns {Promise<Array>}
 */
async function searchChannels(sourceId, query, limit = 50) {
    const db = await openDB();
    const sid = Number(sourceId);
    const lowerQuery = query.toLowerCase();
    const allowAdult = localStorage.getItem('iptv_allow_adult') === 'true';

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('sourceId');
        const range = IDBKeyRange.only(sid);

        const results = [];
        const cursorReq = index.openCursor(range);

        cursorReq.onsuccess = (event) => {
            const cursor = event.target.result;
            if (!cursor || results.length >= limit) {
                resolve(results);
                return;
            }

            const record = cursor.value;
            
            // Adult filtresi
            if (!allowAdult && record.isAdult) {
                cursor.continue();
                return;
            }

            if (record.name.toLowerCase().includes(lowerQuery)) {
                results.push(record);
            }
            cursor.continue();
        };

        cursorReq.onerror = (event) => reject(event.target.error);
    });
}

/**
 * ID'ye göre tek bir kanal döndürür.
 * 
 * @param {number|string} channelId - Auto-increment IndexedDB ID
 * @returns {Promise<Object|null>}
 */
async function getChannel(channelId) {
    const db = await openDB();
    const cid = Number(channelId);

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(cid);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Bir profile ait tüm kanalları IndexedDB'den siler.
 * 
 * @param {number|string} sourceId
 * @returns {Promise<void>}
 */
async function clearChannels(sourceId) {
    const db = await openDB();
    const sid = Number(sourceId);

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('sourceId');
        const range = IDBKeyRange.only(sid);

        const cursorReq = index.openCursor(range);
        cursorReq.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Bir profilin IndexedDB'deki kanal sayısını döndürür.
 * 
 * @param {number|string} sourceId
 * @returns {Promise<number>}
 */
async function getChannelCount(sourceId) {
    const db = await openDB();
    const sid = Number(sourceId);

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('sourceId');
        const countReq = index.count(IDBKeyRange.only(sid));

        countReq.onsuccess = () => resolve(countReq.result);
        countReq.onerror = (event) => reject(event.target.error);
    });
}

export const channelDB = {
    openDB,
    saveChannels,
    getCategories,
    getChannelsByCategory,
    searchChannels,
    getChannel,
    clearChannels,
    getChannelCount
};
