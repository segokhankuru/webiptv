import { apiClient } from '../services/api-client.js';

export function renderCategory(categoryName) {
    const container = document.getElementById('app');
    const decodedName = decodeURIComponent(categoryName);
    
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
            </nav>
            
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

    async function loadMore() {
        if (isFetching || !hasMore) return;
        isFetching = true;
        
        try {
            const res = await apiClient.request(`/channels?category=${categoryName}&page=${page}&limit=50`);
            
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
                const logoUrl = ch.logo_url || `https://placehold.co/160x90/2a2a35/FFFFFF?text=${encodeURIComponent(fallbackChar)}`;

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
    
    // Cleanup observer on navigate
    window.addEventListener('hashchange', function cleanup() {
        if (!window.location.hash.startsWith('#/category/')) {
            observer.disconnect();
            window.removeEventListener('hashchange', cleanup);
        }
    });
}
