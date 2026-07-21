import { apiClient } from '../services/api-client.js';
import { channelDB } from '../services/channel-db.js';
import { xtreamAPI } from '../services/xtream-api.js';

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
                        <span class="nav-profile-name" style="font-size: 14px; font-weight: 500; color: #eee;">${activeProfileName}</span>
                    </a>
                    <button onclick="localStorage.removeItem('iptv_token'); localStorage.removeItem('iptv_active_source_id'); window.location.hash='#/login'; window.location.reload();" style="background: transparent; color: #aaa; border: 1px solid #444; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;" class="nav-logout-btn">Çıkış</button>
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
                ${apiClient.store?.user?.role === 'admin' ? '<a href="#/admin" style="color: #E50914;">⚙️ Admin Paneli</a>' : ''}
                <a href="#/profile">👤 Hesabım</a>
                <a href="#" onclick="localStorage.removeItem('iptv_token'); localStorage.removeItem('iptv_active_source_id'); window.location.hash='#/login'; window.location.reload(); return false;" style="color: #aaa;">🚪 Çıkış Yap</a>
            </div>

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

    // Hamburger menü toggle
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileDrawer = document.getElementById('mobile-nav-drawer');
    if (hamburgerBtn && mobileDrawer) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileDrawer.classList.toggle('open');
        });
        // Drawer'daki linklere tıklayınca kapat
        mobileDrawer.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => mobileDrawer.classList.remove('open'));
        });
        // Drawer dışına tıklayınca kapat
        document.addEventListener('click', (e) => {
            if (!mobileDrawer.contains(e.target) && e.target !== hamburgerBtn) {
                mobileDrawer.classList.remove('open');
            }
        }, { passive: true });
    }

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

        const catContainer = document.getElementById('categories-container');

        // Adult filtre kontrolü
        const allowAdult = localStorage.getItem('iptv_allow_adult') === 'true';
        const ADULT_KEYWORDS_HOME = ['xxx', 'adult', 'porn', '18+', 'erotic', 'sex', 'yetişkin', '🔞'];
        const isAdultCategory = (catName) => {
            const lower = (catName || '').toLowerCase();
            return ADULT_KEYWORDS_HOME.some(kw => lower.includes(kw));
        };

        if (xtreamAPI.isXtreamProfile()) {
            // Xtream Codes profile handling
            const profile = xtreamAPI.getActiveXtreamProfile();
            let categories = await xtreamAPI.getAllCategories(profile.server_url, profile.username, profile.password);
            
            // Xtream kategorilerde adult filtreleme
            if (!allowAdult) {
                categories = categories.filter(cat => !isAdultCategory(cat.category_name));
            }
            
            catContainer.innerHTML = ''; // clear loading

            if (categories.length === 0) {
                catContainer.innerHTML = '<p style="color: var(--text-secondary); text-align:center; padding: 50px;">Bu profilde kategori bulunamadı.</p>';
                return;
            }

            let renderedCount = 0;
            const batchSize = 15;

            const renderNextBatch = () => {
                const batch = categories.slice(renderedCount, renderedCount + batchSize);
                renderedCount += batch.length;
                
                batch.forEach(cat => {
                    const rowId = `cat-${Math.random().toString(36).substr(2, 9)}`;
                    const encodedCatId = encodeURIComponent(cat.category_id);
                    const encodedCatName = encodeURIComponent(cat.category_name);
                    const categoryTypeLabel = cat.type === 'live' ? 'Canlı' : (cat.type === 'vod' ? 'Film' : 'Dizi');
                    
                    const rowHtml = `
                        <div class="category-row xtream-row" data-type="${cat.type}" data-category-id="${cat.category_id}" data-category="${cat.category_name}" data-row-id="${rowId}" data-loaded="false" style="margin-bottom: 25px;">
                            <h3 class="category-title" style="display: flex; justify-content: space-between; align-items: center; padding-right: 4%;">
                                <a href="#/category/xtream_${cat.type}_${encodedCatId}_${encodedCatName}" style="color: inherit; text-decoration: none; cursor: pointer;">
                                    ${cat.category_name} <span class="badge-type" style="font-size: 10px; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 3px; margin-left: 8px; font-weight: 500; color: #aaa;">${categoryTypeLabel}</span>
                                </a>
                                <a href="#/category/xtream_${cat.type}_${encodedCatId}_${encodedCatName}" style="font-size: 13px; color: var(--accent-color); text-decoration: none; font-weight: 600; padding: 4px 8px; border: 1px solid rgba(229,9,20,0.3); border-radius: 4px; transition: all 0.2s;" onmouseover="this.style.background='var(--accent-color)'; this.style.color='white'" onmouseout="this.style.background='transparent'; this.style.color='var(--accent-color)'">
                                    Tümünü Gör ❱
                                </a>
                            </h3>
                            <div class="slider-container">
                                <button class="slider-btn left" onclick="document.getElementById('${rowId}').scrollBy({left: -800, behavior: 'smooth'})">❮</button>
                                <div class="channels-slider" id="${rowId}">
                                    <div class="slider-placeholder" style="padding: 20px; color: var(--text-secondary); display: flex; align-items: center; gap: 10px;">
                                        <div style="width: 16px; height: 16px; border: 2px solid #555; border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                        Kanal listesi bekleniyor...
                                    </div>
                                </div>
                                <button class="slider-btn right" onclick="document.getElementById('${rowId}').scrollBy({left: 800, behavior: 'smooth'})">❯</button>
                            </div>
                        </div>
                    `;
                    catContainer.insertAdjacentHTML('beforeend', rowHtml);
                    
                    const element = catContainer.lastElementChild;
                    rowObserver.observe(element);
                });
                
                if (renderedCount < categories.length) {
                    setupLoadMoreCategoriesSensor();
                }
            };

            const rowObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const row = entry.target;
                        rowObserver.unobserve(row);
                        
                        const rowId = row.dataset.rowId;
                        const type = row.dataset.type;
                        const categoryId = row.dataset.categoryId;
                        const categoryName = row.dataset.category;
                        
                        if (row.dataset.loaded !== 'true') {
                            row.dataset.loaded = 'true';
                            loadXtreamCategoryChannels(type, categoryId, categoryName, rowId, profile);
                        }
                    }
                });
            }, { rootMargin: '150px' });

            let sensorElement = null;
            const sensorObserver = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    sensorObserver.disconnect();
                    sensorElement?.remove();
                    renderNextBatch();
                }
            }, { rootMargin: '300px' });

            const setupLoadMoreCategoriesSensor = () => {
                sensorElement = document.createElement('div');
                sensorElement.style.cssText = 'height: 60px; display: flex; align-items: center; justify-content: center; color: #888; font-size: 14px;';
                sensorElement.innerHTML = '⚡ Kalan kategoriler yükleniyor...';
                catContainer.appendChild(sensorElement);
                sensorObserver.observe(sensorElement);
            };

            const prevCleanup = window.__currentPageCleanup;
            window.__currentPageCleanup = function() {
                if (prevCleanup) prevCleanup();
                rowObserver.disconnect();
                sensorObserver.disconnect();
            };

            renderNextBatch();

        } else {
            // Standard M3U IndexedDB profile handling
            const categories = await channelDB.getCategories(activeId);
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
        }

    } catch(err) {
        document.getElementById('categories-container').innerHTML = `<p style="color:red; text-align:center; padding: 50px;">Hata: ${err.message}</p>`;
    }
}

async function loadCategoryChannels(categoryName, rowId, sourceId) {
    try {
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

async function loadXtreamCategoryChannels(type, categoryId, categoryName, rowId, profile) {
    const slider = document.getElementById(rowId);
    try {
        let streams = [];
        if (type === 'live') {
            streams = await xtreamAPI.getLiveStreams(profile.server_url, profile.username, profile.password, categoryId);
        } else if (type === 'vod') {
            streams = await xtreamAPI.getVodStreams(profile.server_url, profile.username, profile.password, categoryId);
        } else if (type === 'series') {
            streams = await xtreamAPI.getSeriesStreams(profile.server_url, profile.username, profile.password, categoryId);
        }
        
        if (!streams || streams.length === 0) {
            slider.innerHTML = '<p style="padding: 20px; color: var(--text-secondary);">Yayın bulunamadı</p>';
            return;
        }

        const displayStreams = streams.slice(0, 10);
        let html = '';
        
        displayStreams.forEach(ch => {
            const fallbackChar = ch.name.substring(0, 2).toUpperCase();
            const logoUrl = ch.stream_icon || ch.cover || `https://placehold.co/160x90/2a2a35/FFFFFF?text=${encodeURIComponent(fallbackChar)}`;
            const streamId = ch.stream_id || ch.series_id;
            const cardId = `xtream_${type}_${streamId}`;
            
            // Enrich details
            ch.category_name = categoryName;
            ch.category_id = categoryId;

            if (window.registerStreamInfo) {
                window.registerStreamInfo(cardId, ch);
            }
            
            html += `
                <div class="channel-card" id="card-${cardId}" onclick="sessionStorage.setItem('last_played_channel', '${cardId}'); sessionStorage.setItem('last_played_row', '${rowId}'); window.playXtreamStream('${cardId}')">
                    <div class="card-img-container">
                        <img src="${logoUrl}" alt="${ch.name}" loading="lazy" onerror="this.src='https://placehold.co/160x90/2a2a35/FFFFFF?text=${encodeURIComponent(fallbackChar)}'">
                        <div class="play-overlay"><i class="material-icons">play_circle_outline</i></div>
                    </div>
                    <div class="card-info">
                        <h4>${ch.name}</h4>
                    </div>
                </div>
            `;
        });
        
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
        console.error(e);
        slider.innerHTML = '<p style="padding: 20px; color: red;">Yüklenemedi</p>';
    }
}
