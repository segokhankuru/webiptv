import { apiClient } from '../services/api-client.js';

export async function renderFavorites() {
    const container = document.getElementById('app');
    
    container.innerHTML = `
        <div class="netflix-layout">
            <nav class="netflix-navbar" id="navbar" style="background-color: #141414; box-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                <h1 class="logo" onclick="window.location.hash='#/home'" style="cursor: pointer;">WebIPTV <span class="badge">PRO</span></h1>
                <div class="nav-links">
                    <a href="#/home">Ana Sayfa</a>
                    <a href="#/search">Arama</a>
                    <a href="#/favorites" class="active">Favoriler</a>
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
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 30px;">
                    <h2 style="font-size: 2rem; font-weight: 800; color: white; margin: 0;">Favorilerim</h2>
                    <span style="font-size: 24px;">❤️</span>
                </div>
                
                <div id="favorites-grid" style="display: flex; flex-wrap: wrap; gap: 15px;">
                    <div style="width: 100%; text-align: center; padding: 50px;">
                        <div style="width: 40px; height: 40px; border: 4px solid var(--surface-hover); border-top-color: var(--accent-color); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px auto;"></div>
                        <p style="color: var(--text-secondary);">Favoriler yükleniyor...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    try {
        const favs = await apiClient.request('/user/favorites');
        const grid = document.getElementById('favorites-grid');
        
        if (!favs || favs.length === 0) {
            grid.innerHTML = `
                <div style="width: 100%; text-align: center; padding: 100px 20px; background: var(--surface-color); border-radius: 8px;">
                    <span style="font-size: 48px; opacity: 0.5;">🤍</span>
                    <h3 style="color: white; margin: 20px 0 10px 0;">Henüz favori kanalınız yok</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 20px;">İzlediğiniz kanallardaki kalp simgesine tıklayarak favorilerinize ekleyebilirsiniz.</p>
                    <button onclick="window.location.hash='#/home'" style="background: var(--accent-color); color: white; border: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; cursor: pointer;">Ana Sayfaya Dön</button>
                </div>
            `;
            return;
        }

        let html = '';
        for (const ch of favs) {
            let resBadge = '';
            if (ch.resolution === '4K') resBadge = '<span class="res-badge 4k">4K</span>';
            else if (ch.resolution === 'FHD') resBadge = '<span class="res-badge fhd">FHD</span>';
            else if (ch.resolution === 'HD') resBadge = '<span class="res-badge hd">HD</span>';
            
            const fallbackChar = ch.name.substring(0, 2).toUpperCase();
            const logoUrl = ch.logo_url || `https://placehold.co/160x90/2a2a35/FFFFFF?text=${encodeURIComponent(fallbackChar)}`;

            html += `
                <div class="channel-card" style="margin-bottom: 10px;" onclick="window.location.hash='#/player/${ch.id}'">
                    <div class="card-img-container">
                        <img src="${logoUrl}" alt="${ch.name}" loading="lazy" onerror="this.src='https://placehold.co/160x90/2a2a35/FFFFFF?text=${encodeURIComponent(fallbackChar)}'">
                        ${resBadge}
                        <div class="play-overlay"><i class="material-icons">play_circle_outline</i></div>
                    </div>
                    <div class="card-info">
                        <h4>${ch.name}</h4>
                        <p style="font-size: 10px; color: var(--text-secondary); margin: 0; margin-top: 3px;">📁 ${ch.category}</p>
                    </div>
                </div>
            `;
        }
        
        grid.innerHTML = html;

    } catch(err) {
        document.getElementById('favorites-grid').innerHTML = `<p style="color:red; text-align:center; padding: 50px; width: 100%;">Hata: ${err.message}</p>`;
    }
}
