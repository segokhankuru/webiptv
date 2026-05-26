import { apiClient } from '../services/api-client.js';
import { channelDB } from '../services/channel-db.js';

export async function renderHome() {
    const container = document.getElementById('app');
    
    // Fetch active profile info first
    let activeProfileName = 'Profil';
    let profileInitial = 'P';
    try {
        const sources = await apiClient.getSources();
        const activeId = localStorage.getItem('iptv_active_source_id');
        const active = sources.find(s => s.id == activeId);
        if (active) {
            activeProfileName = active.name;
            profileInitial = active.name.substring(0, 2).toUpperCase();
        }
    } catch(e) {}

    container.innerHTML = `
        <div class="netflix-layout">
            <nav class="netflix-navbar" id="navbar">
                <h1 class="logo" onclick="window.location.hash='#/home'" style="cursor: pointer;">WebIPTV <span class="badge">PRO</span></h1>
                <div class="nav-links">
                    <a href="#/home" class="active">Ana Sayfa</a>
                    <a href="#/search">Arama</a>
                    <a href="#/favorites">Favoriler</a>
                    <a href="#/profiles" style="color: #FFC107; font-weight: 600;">Profil Değiştir</a>
                    ${apiClient.store?.user?.role === 'admin' ? '<a href="#/admin" style="color: #E50914; font-weight: bold;">Admin Paneli</a>' : ''}
                </div>
                <div class="user-profile" style="display: flex; align-items: center; gap: 12px;">
                    <a href="#/profile" style="display: flex; align-items: center; gap: 8px; text-decoration: none; color: white;">
                        <div style="width: 32px; height: 32px; border-radius: 4px; background: linear-gradient(135deg, #ff9966 0%, #ff5e62 100%); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; color: white;">
                            ${profileInitial}
                        </div>
                        <span style="font-size: 14px; font-weight: 500; color: #eee;">${activeProfileName}</span>
                    </a>
                    <button onclick="localStorage.removeItem('iptv_token'); localStorage.removeItem('iptv_active_source_id'); window.location.hash='#/login'; window.location.reload();" style="background: transparent; color: #aaa; border: 1px solid #444; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Çıkış</button>
                </div>
            </nav>
            <div class="hero-section" id="hero-section">
                <!-- Featured Channel will go here -->
                <div class="hero-content">
                    <h2 class="hero-title">Hoş Geldiniz</h2>
                    <p class="hero-desc">120.000+ kanalı kesintisiz ve takılmadan izleyin.</p>
                </div>
            </div>
            <div class="categories-container" id="categories-container">
                <div style="text-align:center; padding: 50px;">
                    <div style="width: 40px; height: 40px; border: 4px solid var(--surface-hover); border-top-color: var(--accent-color); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px auto;"></div>
                    <p>Kategoriler yükleniyor...</p>
                </div>
            </div>
        </div>
    `;

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (nav) {
            if (window.scrollY > 50) nav.classList.add('scrolled');
            else nav.classList.remove('scrolled');
        }
    });

    try {
        const activeId = localStorage.getItem('iptv_active_source_id');
        if (!activeId) {
            document.getElementById('categories-container').innerHTML = `<p style="color:#ffc107; text-align:center; padding: 50px;">Lütfen önce bir profil seçin. <a href="#/profiles" style="color:#E50914;">Profil Seç</a></p>`;
            return;
        }

        const categories = await channelDB.getCategories(activeId);
        const catContainer = document.getElementById('categories-container');
        catContainer.innerHTML = ''; // clear loading

        if (categories.length === 0) {
            catContainer.innerHTML = '<p style="color: var(--text-secondary); text-align:center; padding: 50px;">Bu profilde henüz kanal bulunamadı. Profili seçerek senkronize edin.</p>';
            return;
        }

        for (const cat of categories) {
            if (cat.count > 0) {
                const rowId = `cat-${Math.random().toString(36).substr(2, 9)}`;
                
                const rowHtml = `
                    <div class="category-row">
                        <h3 class="category-title" style="display: flex; justify-content: space-between; align-items: center; padding-right: 4%;">
                            <a href="#/category/${encodeURIComponent(cat.category)}" style="color: inherit; text-decoration: none; cursor: pointer;">
                                ${cat.category} <span class="count">(${cat.count})</span>
                            </a>
                            <a href="#/category/${encodeURIComponent(cat.category)}" style="font-size: 13px; color: var(--accent-color); text-decoration: none; font-weight: 600; padding: 4px 8px; border: 1px solid rgba(229,9,20,0.3); border-radius: 4px; transition: all 0.2s;" onmouseover="this.style.background='var(--accent-color)'; this.style.color='white'" onmouseout="this.style.background='transparent'; this.style.color='var(--accent-color)'">
                                Tümünü Gör ❱
                            </a>
                        </h3>
                        <div class="slider-container">
                            <button class="slider-btn left" onclick="document.getElementById('${rowId}').scrollBy({left: -800, behavior: 'smooth'})">❮</button>
                            <div class="channels-slider" id="${rowId}">
                                <!-- Loading Placeholder -->
                                <div style="padding: 20px; color: var(--text-secondary);">Kanallar yükleniyor...</div>
                            </div>
                            <button class="slider-btn right" onclick="document.getElementById('${rowId}').scrollBy({left: 800, behavior: 'smooth'})">❯</button>
                        </div>
                    </div>
                `;
                catContainer.insertAdjacentHTML('beforeend', rowHtml);
                
                // Fetch channels for this category from IndexedDB
                loadCategoryChannels(cat.category, rowId, activeId);
            }
        }

    } catch(err) {
        document.getElementById('categories-container').innerHTML = `<p style="color:red; text-align:center; padding: 50px;">Hata: ${err.message}</p>`;
    }
}

async function loadCategoryChannels(categoryName, rowId, sourceId) {
    try {
        // IndexedDB'den kategori kanallarını çek (ana sayfa için 10 kanal yeterli)
        const response = await channelDB.getChannelsByCategory(sourceId, categoryName, 1, 10);
        const slider = document.getElementById(rowId);
        
        if (!response.data || response.data.length === 0) {
            slider.innerHTML = '<p style="padding: 20px; color: var(--text-secondary);">Kanal bulunamadı</p>';
            return;
        }

        let html = '';
        for (const ch of response.data) {
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
                <div class="channel-card" id="card-${ch.id}" onclick="sessionStorage.setItem('last_played_channel', '${ch.id}'); sessionStorage.setItem('last_played_row', '${rowId}'); window.location.hash='#/player/${ch.id}'">
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
        
        slider.innerHTML = html;
        
        const lastPlayedId = sessionStorage.getItem('last_played_channel');
        const lastPlayedRow = sessionStorage.getItem('last_played_row');
        
        if (lastPlayedRow === rowId && lastPlayedId) {
            setTimeout(() => {
                const sliderParent = document.getElementById(rowId)?.parentElement?.parentElement;
                if (sliderParent) sliderParent.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                const card = document.getElementById(`card-${lastPlayedId}`);
                if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    card.style.boxShadow = '0 0 15px var(--accent-color)';
                }
            }, 100);
        }

    } catch(e) {
        document.getElementById(rowId).innerHTML = '<p style="padding: 20px; color: red;">Yüklenemedi</p>';
    }
}
