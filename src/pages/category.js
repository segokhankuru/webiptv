import { apiClient } from '../services/api-client.js';
import { channelDB } from '../services/channel-db.js';
import { xtreamAPI } from '../services/xtream-api.js';

export function renderCategory(categoryName) {
    const container = document.getElementById('app');
    
    const isXtream = categoryName.startsWith('xtream_');
    let decodedName, type, categoryId;
    if (isXtream) {
        const parts = categoryName.split('_');
        type = parts[1];
        categoryId = parts[2];
        decodedName = decodeURIComponent(parts.slice(3).join('_'));
    } else {
        decodedName = decodeURIComponent(categoryName);
    }
    
    container.innerHTML = `
        <div class="netflix-layout">
            <nav class="netflix-navbar" id="navbar" style="background-color: #141414; box-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                <h1 class="logo" onclick="window.location.hash='#/home'" style="cursor: pointer;">WebIPTV <span class="badge">PRO</span></h1>
                <div class="nav-links">
                    <a href="#/home">Ana Sayfa</a>
                    <a href="#/search">Arama</a>
                    <a href="#/favorites">Favoriler</a>
                    <a href="#/profiles" style="color: #FFC107; font-weight: 600;">Profil Değiştir</a>
                </div>
                <div class="user-profile" style="display: flex; align-items: center; gap: 10px;">
                    <a href="#/profile">
                        <img src="https://ui-avatars.com/api/?name=${apiClient.store?.user?.username || 'U'}&background=e50914&color=fff" alt="User" style="cursor: pointer;">
                    </a>
                    <button onclick="localStorage.removeItem('iptv_token'); localStorage.removeItem('iptv_active_source_id'); window.location.hash='#/login'; window.location.reload();" style="background: transparent; color: #aaa; border: 1px solid #444; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Çıkış</button>
                </div>
                <!-- Hamburger Butonu (Mobil) -->
                <button class="hamburger-btn" id="hamburger-btn" aria-label="Menü">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </nav>

            <!-- Mobil Nav Drawer -->
            <div class="mobile-nav-drawer" id="mobile-nav-drawer">
                <a href="#/home">🏠 Ana Sayfa</a>
                <a href="#/search">🔍 Arama</a>
                <a href="#/favorites">❤️ Favoriler</a>
                <a href="#/profiles" style="color: #FFC107;">🔄 Profil Değiştir</a>
            </div>

            <div style="padding: 100px 4% 50px 4%;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <button onclick="window.history.back()" style="background: rgba(255,255,255,0.1); color: white; padding: 5px 15px; border-radius: 4px; cursor: pointer; border: none; font-size: 14px;">❮ Geri</button>
                        <h2 style="font-size: 2rem; font-weight: 800; color: white; margin: 0;">${decodedName}</h2>
                    </div>
                    <span id="total-badge" style="background: var(--surface-hover); padding: 5px 12px; border-radius: 20px; font-size: 12px; color: var(--text-secondary);">Yükleniyor...</span>
                </div>
                
                <div id="category-grid" style="display: flex; flex-wrap: wrap; gap: 10px;">
                    <!-- Loading state -->
                    <div id="initial-loading" style="width: 100%; text-align: center; padding: 50px;">
                        <div style="width: 40px; height: 40px; border: 4px solid var(--surface-hover); border-top-color: var(--accent-color); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px auto;"></div>
                    </div>
                </div>
                
                <div id="scroll-sentinel" style="height: 50px; width: 100%; margin-top: 20px;"></div>
            </div>
        </div>
    `;

    let page = 1;
    let isFetching = false;
    let hasMore = true;
    const grid = document.getElementById('category-grid');
    const sentinel = document.getElementById('scroll-sentinel');

    // Hamburger menü
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileDrawer = document.getElementById('mobile-nav-drawer');
    if (hamburgerBtn && mobileDrawer) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileDrawer.classList.toggle('open');
        });
        mobileDrawer.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => mobileDrawer.classList.remove('open'));
        });
    }

    async function loadMore() {
        if (isFetching || !hasMore) return;
        isFetching = true;
        
        const sourceId = localStorage.getItem('iptv_active_source_id');
        if (!sourceId) {
            grid.innerHTML = '<p style="color:#ffc107; width: 100%; text-align: center; padding: 50px;">Aktif profil seçilmedi.</p>';
            return;
        }

        try {
            if (isXtream) {
                // Xtream pagination logic
                if (page === 1 && !window.__categoryStreamsCache) {
                    const profile = xtreamAPI.getActiveXtreamProfile();
                    if (!profile) throw new Error('Xtream profil bilgileri bulunamadı.');
                    
                    let streams = [];
                    if (type === 'live') {
                        streams = await xtreamAPI.getLiveStreams(profile.server_url, profile.username, profile.password, categoryId);
                    } else if (type === 'vod') {
                        streams = await xtreamAPI.getVodStreams(profile.server_url, profile.username, profile.password, categoryId);
                    } else if (type === 'series') {
                        streams = await xtreamAPI.getSeriesStreams(profile.server_url, profile.username, profile.password, categoryId);
                    }
                    
                    window.__categoryStreamsCache = streams || [];
                }
                
                const categoryStreams = window.__categoryStreamsCache || [];
                document.getElementById('initial-loading')?.remove();
                
                if (page === 1) {
                    document.getElementById('total-badge').innerText = `${categoryStreams.length} Yayın`;
                    if (categoryStreams.length === 0) {
                        grid.innerHTML = '<p style="color: var(--text-secondary); width: 100%; text-align: center; padding: 50px;">Bu kategoride yayın bulunamadı.</p>';
                        return;
                    }
                }

                const pageSize = 50;
                const startIdx = (page - 1) * pageSize;
                const endIdx = page * pageSize;
                const pageData = categoryStreams.slice(startIdx, endIdx);

                let html = '';
                for (const ch of pageData) {
                    const fallbackChar = ch.name.substring(0, 2).toUpperCase();
                    const logoUrl = ch.stream_icon || ch.cover || `https://placehold.co/160x90/2a2a35/FFFFFF?text=${encodeURIComponent(fallbackChar)}`;
                    const streamId = ch.stream_id || ch.series_id;
                    const cardId = `xtream_${type}_${streamId}`;
                    
                    ch.category_name = decodedName;
                    ch.category_id = categoryId;

                    html += `
                        <div class="channel-card" style="margin-bottom: 15px;" onclick="window.playXtreamStream('${cardId}', '${encodeURIComponent(JSON.stringify(ch))}')">
                            <div class="card-img-container">
                                <img src="${logoUrl}" alt="${ch.name}" loading="lazy" onerror="this.src='https://placehold.co/160x90/2a2a35/FFFFFF?text=${encodeURIComponent(fallbackChar)}'">
                                <div class="play-overlay"><i class="material-icons">play_circle_outline</i></div>
                            </div>
                            <div class="card-info">
                                <h4>${ch.name}</h4>
                            </div>
                        </div>
                    `;
                }
                
                grid.insertAdjacentHTML('beforeend', html);
                
                if (endIdx >= categoryStreams.length) {
                    hasMore = false;
                    sentinel.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 12px;">Tüm yayınlar yüklendi</p>';
                } else {
                    page++;
                }
            } else {
                // Standard M3U pagination logic
                const res = await channelDB.getChannelsByCategory(sourceId, decodedName, page, 50);
                
                document.getElementById('initial-loading')?.remove();
                
                if (page === 1) {
                    document.getElementById('total-badge').innerText = `${res.total} Kanal`;
                    if (res.data.length === 0) {
                        grid.innerHTML = '<p style="color: var(--text-secondary); width: 100%; text-align: center; padding: 50px;">Bu kategoride kanal bulunamadı.</p>';
                        return;
                    }
                }

                let html = '';
                for (const ch of res.data) {
                    let resBadge = '';
                    if (ch.resolution && ch.resolution.trim() !== '') {
                        let badgeClass = 'res-badge';
                        if (ch.resolution === '4K') badgeClass += ' 4k';
                        else if (ch.resolution === 'FHD') badgeClass += ' fhd';
                        else if (ch.resolution === 'HD') badgeClass += ' hd';
                        else badgeClass += ' sd';
                        resBadge = `<span class="${badgeClass}">${ch.resolution}</span>`;
                    }
                    
                    const fallbackChar = ch.name.substring(0, 2).toUpperCase();
                    const logoUrl = ch.logo || `https://placehold.co/160x90/2a2a35/FFFFFF?text=${encodeURIComponent(fallbackChar)}`;

                    html += `
                        <div class="channel-card" style="margin-bottom: 15px;" onclick="window.location.hash='#/player/${ch.id}'">
                            <div class="card-img-container">
                                <img src="${logoUrl}" alt="${ch.name}" loading="lazy" onerror="this.src='https://placehold.co/160x90/2a2a35/FFFFFF?text=${encodeURIComponent(fallbackChar)}'">
                                ${resBadge}
                                <div class="play-overlay"><i class="material-icons">play_circle_outline</i></div>
                            </div>
                            <div class="card-info">
                                <h4>${ch.name}</h4>
                            </div>
                        </div>
                    `;
                }
                
                grid.insertAdjacentHTML('beforeend', html);
                
                if (page >= res.totalPages) {
                    hasMore = false;
                    sentinel.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 12px;">Tüm kanallar yüklendi</p>';
                } else {
                    page++;
                }
            }
            
        } catch(err) {
            console.error(err);
            if (page === 1) grid.innerHTML = `<p style="color:red; text-align:center; padding: 50px; width: 100%;">Hata: ${err.message}</p>`;
        } finally {
            isFetching = false;
        }
    }

    // Intersection Observer for Infinite Scroll
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            loadMore();
        }
    }, { rootMargin: '200px' });
    
    observer.observe(sentinel);
    
    // Router tarafından sayfa değişiminde çağrılır
    window.__currentPageCleanup = function() {
        observer.disconnect();
        window.__categoryStreamsCache = null;
    };
}
