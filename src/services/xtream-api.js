/**
 * xtream-api.js — Xtream Codes Player API istemcisi
 *
 * Tüm çağrılar sunucu tarafındaki /api/proxy/xtream endpoint'i üzerinden yapılır.
 * Bu sayede CORS ve Mixed Content sorunları çözülür.
 *
 * Xtream Akış URL Formatları:
 *   Canlı TV: {server}/live/{user}/{pass}/{stream_id}.m3u8
 *   Film:     {server}/movie/{user}/{pass}/{stream_id}.{ext}
 *   Dizi:     {server}/series/{user}/{pass}/{stream_id}.{ext}
 */

const PROXY_BASE = '/api/proxy/xtream';

/**
 * Xtream player_api.php endpoint'ini proxy üzerinden çağırır
 */
async function xtreamCall(server, username, password, action, extraParams = {}) {
    const params = new URLSearchParams({
        server,
        username,
        password,
        action,
        ...extraParams
    });

    const response = await fetch(`${PROXY_BASE}?${params.toString()}`);
    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(err.error || `Xtream API hatası: ${response.status}`);
    }
    return response.json();
}

/**
 * Hesap bilgilerini ve bağlantıyı doğrular.
 * Başarılı olursa { user_info, server_info } döner
 */
export async function verifyXtream(server, username, password) {
    return xtreamCall(server, username, password, 'user_info');
}

/**
 * Canlı TV kategorilerini getirir
 * @returns {Array<{category_id, category_name, parent_id}>}
 */
export async function getLiveCategories(server, username, password) {
    return xtreamCall(server, username, password, 'get_live_categories');
}

/**
 * Film kategorilerini getirir
 */
export async function getVodCategories(server, username, password) {
    return xtreamCall(server, username, password, 'get_vod_categories');
}

/**
 * Dizi kategorilerini getirir
 */
export async function getSeriesCategories(server, username, password) {
    return xtreamCall(server, username, password, 'get_series_categories');
}

/**
 * Belirli bir kategorinin canlı kanallarını getirir
 * @returns {Array<{stream_id, name, stream_icon, epg_channel_id, ...}>}
 */
export async function getLiveStreams(server, username, password, categoryId) {
    const params = categoryId ? { category_id: categoryId } : {};
    return xtreamCall(server, username, password, 'get_live_streams', params);
}

/**
 * Belirli bir kategorinin filmlerini getirir
 * @returns {Array<{stream_id, name, stream_icon, rating, ...}>}
 */
export async function getVodStreams(server, username, password, categoryId) {
    const params = categoryId ? { category_id: categoryId } : {};
    return xtreamCall(server, username, password, 'get_vod_streams', params);
}

/**
 * Belirli bir kategorinin dizilerini getirir
 */
export async function getSeriesStreams(server, username, password, categoryId) {
    const params = categoryId ? { category_id: categoryId } : {};
    return xtreamCall(server, username, password, 'get_series', params);
}

/**
 * Tüm kategorileri (canlı + film + dizi) birleştirip döner
 * Her kategori: { category_id, category_name, type: 'live'|'vod'|'series' }
 */
export async function getAllCategories(server, username, password) {
    const [live, vod, series] = await Promise.allSettled([
        getLiveCategories(server, username, password),
        getVodCategories(server, username, password),
        getSeriesCategories(server, username, password)
    ]);

    const result = [];

    if (live.status === 'fulfilled' && Array.isArray(live.value)) {
        live.value.forEach(c => result.push({
            category_id: c.category_id,
            category_name: c.category_name || 'Bilinmeyen',
            type: 'live',
            parent_id: c.parent_id || 0
        }));
    }
    if (vod.status === 'fulfilled' && Array.isArray(vod.value)) {
        vod.value.forEach(c => result.push({
            category_id: c.category_id,
            category_name: c.category_name || 'Bilinmeyen',
            type: 'vod',
            parent_id: c.parent_id || 0
        }));
    }
    if (series.status === 'fulfilled' && Array.isArray(series.value)) {
        series.value.forEach(c => result.push({
            category_id: c.category_id,
            category_name: c.category_name || 'Bilinmeyen',
            type: 'series',
            parent_id: c.parent_id || 0
        }));
    }

    return result;
}

/**
 * Xtream stream URL'sini oluşturur
 * @param {string} server  - Xtream sunucu adresi
 * @param {string} username
 * @param {string} password
 * @param {string|number} streamId
 * @param {'live'|'vod'|'series'} type
 * @param {string} [ext='m3u8'] - Dosya uzantısı (film için mkv/mp4 olabilir)
 */
export function buildStreamUrl(server, username, password, streamId, type = 'live', ext = 'm3u8') {
    const cleanServer = server.replace(/\/$/, '');
    return `${cleanServer}/${type}/${username}/${password}/${streamId}.${ext}`;
}

/**
 * LocalStorage'daki aktif Xtream profil bilgilerini döndürür
 * Home/Category sayfalarından kolayca erişim için
 */
export function getActiveXtreamProfile() {
    try {
        const raw = localStorage.getItem('iptv_active_xtream_profile');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/**
 * Aktif Xtream profil bilgilerini localStorage'a kaydeder
 */
export function saveActiveXtreamProfile(profile) {
    if (profile && profile.source_type === 'xtream') {
        localStorage.setItem('iptv_active_xtream_profile', JSON.stringify({
            id: profile.id,
            name: profile.name,
            source_type: 'xtream',
            server_url: profile.server_url,
            username: profile.username,
            password: profile.password
        }));
    } else {
        localStorage.removeItem('iptv_active_xtream_profile');
    }
}

/**
 * Aktif profil Xtream mı diye kontrol eder
 */
export function isXtreamProfile() {
    return !!getActiveXtreamProfile();
}

export const xtreamAPI = {
    verify: verifyXtream,
    getLiveCategories,
    getVodCategories,
    getSeriesCategories,
    getLiveStreams,
    getVodStreams,
    getSeriesStreams,
    getAllCategories,
    buildStreamUrl,
    getActiveXtreamProfile,
    saveActiveXtreamProfile,
    isXtreamProfile
};
