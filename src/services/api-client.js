import { store } from '../store.js';

const API_BASE = '/api';

export const apiClient = {
    store,
    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (store.token) {
            headers['Authorization'] = `Bearer ${store.token}`;
        }

        const activeSourceId = localStorage.getItem('iptv_active_source_id');
        if (activeSourceId) {
            headers['X-Active-Source-Id'] = activeSourceId;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401 || response.status === 403) {
            store.logout();
            throw new Error('Unauthorized');
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'API Request Failed');
        }
        return data;
    },

    async login(username, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        store.setToken(data.token);
        store.user = data.user;
        return data;
    },
    
    async register(username, email, password, displayName) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password, displayName })
        });
    },

    async getMe() {
        const user = await this.request('/auth/me', { method: 'GET' });
        store.user = user;
        return user;
    },
    
    async proxyM3u(url) {
        let response;

        // http:// URL'leri için direkt fetch Mixed Content nedeniyle tarayıcı tarafından
        // engellenir — zaman kaybetmeden Cloudflare Worker'a yönlendiririz
        const isHttp = url.startsWith('http://');

        if (!isHttp) {
            try {
                // https:// URL'ler için önce doğrudan çekmeyi deneriz (CORS izinliyse hızlı)
                response = await fetch(url);
            } catch (e) {
                console.warn('Direct fetch failed (CORS), trying Cloudflare Worker proxy...');
            }
        }
        
        if (!response || !response.ok) {
            // Path-based proxy formatını kullan (/http/domain/path) — player.js ile tutarlı
            let cfProxyUrl;
            if (isHttp) {
                cfProxyUrl = `https://webiptv.se-gokhankuru.workers.dev/http/${url.substring(7)}`;
            } else {
                cfProxyUrl = `https://webiptv.se-gokhankuru.workers.dev/https/${url.substring(8)}`;
            }
            try {
                console.log('Cloudflare Worker proxy ile çekiliyor...');
                response = await fetch(cfProxyUrl);
            } catch (err) {
                console.warn('Cloudflare Worker proxy failed, falling back to local backend proxy...');
            }
        }

        if (!response || !response.ok) {
            // En son çare yerel Express backend proxy'sine düşeriz
            response = await fetch(`${API_BASE}/proxy/m3u?url=${encodeURIComponent(url)}`);
            if (!response.ok) throw new Error('M3U listesi indirilemedi.');
        }
        
        // JS reader döngüsü yerine tarayıcının kendi C++ motoruyla (anında) string'e çeviriyoruz
        return await response.text();
    },

    
    async updateSourceChannelCount(sourceId, channelCount) {
        return this.request('/channels/sync-meta', {
            method: 'PATCH',
            body: JSON.stringify({ sourceId, channelCount })
        });
    },
    
    async getSources() {
        return this.request('/user/sources', { method: 'GET' });
    },
    
    async addSource(payload) {
        return this.request('/user/sources', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async addXtreamSource({ name, server, username, password }) {
        return this.request('/user/sources', {
            method: 'POST',
            body: JSON.stringify({
                name,
                source_type: 'xtream',
                xtream_server: server,
                xtream_username: username,
                xtream_password: password
            })
        });
    },
    
    async deleteSource(id) {
        return this.request(`/user/sources/${id}`, { method: 'DELETE' });
    }
};
