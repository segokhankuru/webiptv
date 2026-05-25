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
        try {
            // Önce iptv.html'deki gibi doğrudan (çok hızlı) indirmeyi deneriz
            response = await fetch(url);
        } catch (e) {
            console.warn('Direct fetch failed (CORS), falling back to proxy...');
        }
        
        if (!response || !response.ok) {
            // CORS veya başka hata varsa arka plan proxy'mize başvururuz
            response = await fetch(`${API_BASE}/proxy/m3u?url=${encodeURIComponent(url)}`);
            if (!response.ok) throw new Error('M3U listesi indirilemedi.');
        }
        
        // JS reader döngüsü yerine tarayıcının kendi C++ motoruyla (anında) string'e çeviriyoruz
        return await response.text();
    },
    
    async syncChannels(payload) {
        return this.request('/channels/sync', {
            method: 'POST',
            body: JSON.stringify(payload)
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
    
    async deleteSource(id) {
        return this.request(`/user/sources/${id}`, { method: 'DELETE' });
    }
};
