import { renderLogin } from './pages/login.js';
import { apiClient } from './services/api-client.js';
import { store } from './store.js';
import { renderRegister } from './pages/register.js';
import { renderSetup } from './pages/setup.js';
import { renderHome } from './pages/home.js';
import { renderPlayer } from './pages/player.js';
import { renderProfile } from './pages/profile.js';
import { renderSearch } from './pages/search.js';
import { renderFavorites } from './pages/favorites.js';
import { renderCategory } from './pages/category.js';
import { renderAdmin } from './pages/admin.js';
import { renderProfiles } from './pages/profiles.js';

export function initRouter() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}

function handleRoute() {
    // Sayfa değişmeden önce önceki sayfanın cleanup fonksiyonunu çağır
    // Bu HLS destroy, reader cancel, IntersectionObserver disconnect gibi işlemleri anında yapar
    if (typeof window.__currentPageCleanup === 'function') {
        try {
            window.__currentPageCleanup();
        } catch (e) {
            console.warn('Page cleanup error:', e);
        }
        window.__currentPageCleanup = null;
    }

    const hash = window.location.hash || '#/login';
    
    // Auth Check
    if (!store.token && !['#/login', '#/register'].includes(hash)) {
        window.location.hash = '#/login';
        return;
    }

    // Active Profile check: Redirect to profiles screen if authenticated but no active source selected
    const activeSourceId = localStorage.getItem('iptv_active_source_id');
    if (store.token && !activeSourceId && !['#/profiles', '#/login', '#/register'].includes(hash)) {
        window.location.hash = '#/profiles';
        return;
    }

    if (hash === '#/login' || hash === '#/') {
        renderLogin();
    } else if (hash === '#/register') {
        renderRegister();
    } else if (hash === '#/profiles') {
        renderProfiles();
    } else if (hash === '#/setup') {
        renderSetup();
    } else if (hash === '#/home') {
        renderHome();
    } else if (hash === '#/search') {
        renderSearch();
    } else if (hash === '#/favorites') {
        renderFavorites();
    } else if (hash.startsWith('#/player/')) {
        const id = hash.split('/')[2];
        renderPlayer(id);
    } else if (hash.startsWith('#/category/')) {
        const name = hash.split('/')[2];
        renderCategory(name);
    } else if (hash === '#/profile') {
        renderProfile();
    } else if (hash === '#/admin') {
        renderAdmin();
    }
}
