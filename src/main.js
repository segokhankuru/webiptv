import './styles/base.css';
import './styles/login.css';
import './styles/netflix.css';
import { initRouter } from './router.js';
import { apiClient } from './services/api-client.js';

window.__streamStore = window.__streamStore || new Map();

window.registerStreamInfo = function(id, infoObj) {
    if (id && infoObj) {
        window.__streamStore.set(String(id), infoObj);
    }
};

// Global playXtreamStream helper to cache play info and navigate to the player
window.playXtreamStream = function(id, rawStreamInfo) {
    try {
        let raw = rawStreamInfo;
        if (!raw && id) {
            raw = window.__streamStore.get(String(id));
        }
        if (typeof raw === 'string') {
            try { raw = JSON.parse(decodeURIComponent(raw)); }
            catch(e) { try { raw = JSON.parse(raw); } catch(err){} }
        }
        if (raw) {
            const playInfo = {
                name: raw.name || raw.title || '',
                stream_icon: raw.stream_icon || raw.cover || '',
                category_id: raw.category_id || '',
                container_extension: raw.container_extension || '',
                category_name: raw.category_name || ''
            };
            sessionStorage.setItem('xtream_play_info', JSON.stringify(playInfo));
        }
    } catch(e) {
        console.error('playXtreamStream error:', e);
    }
    window.location.hash = `#/player/${id}`;
};

async function bootstrap() {
    if (localStorage.getItem('iptv_token')) {
        try {
            const me = await apiClient.getMe();
            if (me && me.theme) {
                document.documentElement.setAttribute('data-theme', me.theme);
            }

            // Restore active Xtream profile if missing/corrupt in localStorage but active source is set
            const activeSourceId = localStorage.getItem('iptv_active_source_id');
            if (activeSourceId) {
                const { xtreamAPI } = await import('./services/xtream-api.js');
                const hasXtreamProfile = xtreamAPI.getActiveXtreamProfile();
                if (!hasXtreamProfile) {
                    try {
                        const sources = await apiClient.getSources();
                        const activeSource = sources.find(s => String(s.id) === String(activeSourceId));
                        if (activeSource && activeSource.source_type === 'xtream') {
                            xtreamAPI.saveActiveXtreamProfile(activeSource);
                            console.log('Restored active Xtream profile session in localStorage');
                        }
                    } catch (err) {
                        console.warn('Failed to restore active profile during bootstrap:', err);
                    }
                }
            }
        } catch(e) {
            console.warn('Geçersiz token, giriş sayfasına yönlendirilecek.', e);
        }
    }
    initRouter();
}

bootstrap();
