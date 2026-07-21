import { apiClient } from '../services/api-client.js';
import { channelDB } from '../services/channel-db.js';
import { xtreamAPI } from '../services/xtream-api.js';

export function renderSearch() {
    let searchTimeout = null;
    
    let overlay = document.getElementById('search-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'search-overlay';
        overlay.innerHTML = `
            <div style="position: fixed; inset: 0; background: rgba(10,10,12,0.95); z-index: 1000; display: flex; flex-direction: column; padding: 40px; animation: fadeIn 0.2s;">
                <button onclick="document.getElementById('search-overlay').remove(); window.history.back()" style="position: absolute; top: 20px; right: 40px; background: none; border: none; color: white; font-size: 30px; cursor: pointer; opacity: 0.7; transition: opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">✕</button>
                <div style="max-width: 800px; margin: 0 auto; width: 100%; margin-top: 5vh;">
                    <input type="text" id="search-input" placeholder="Kanal, film veya dizi ara..." style="width: 100%; padding: 20px 0; font-size: 28px; background: transparent; border: none; border-bottom: 2px solid #333; color: white; outline: none; margin-bottom: 30px; transition: border-color 0.3s;" onfocus="this.style.borderColor='var(--accent-color)'" onblur="this.style.borderColor='#333'">
                    <div id="search-results" style="display: flex; flex-direction: column; gap: 10px; overflow-y: auto; max-height: calc(100vh - 200px); padding-right: 10px;">
                        <p style="color: var(--text-secondary); text-align: center; font-size: 18px; margin-top: 40px;">Sonuçları görmek için yazmaya başlayın.</p>
                    </div>
                </div>
            </div>
            <style>
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                #search-results::-webkit-scrollbar { width: 6px; }
                #search-results::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
            </style>
        `;
        document.body.appendChild(overlay);
        
        document.getElementById('search-input').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            const resultsContainer = document.getElementById('search-results');
            
            if (query.length < 2) {
                resultsContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; font-size: 18px; margin-top: 40px;">Sonuçları görmek için yazmaya başlayın.</p>';
                return;
            }
            
            resultsContainer.innerHTML = '<div style="text-align: center; margin-top: 40px;"><div style="width: 40px; height: 40px; border: 4px solid #333; border-top-color: var(--accent-color); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div><p style="color: #888; font-size: 14px; margin-top: 10px;">Arama yapılıyor...</p></div>';
            
            searchTimeout = setTimeout(async () => {
                try {
                    const sourceId = localStorage.getItem('iptv_active_source_id');
                    if (!sourceId) {
                        resultsContainer.innerHTML = '<p style="color: #ffc107; text-align: center; font-size: 18px; margin-top: 40px;">Lütfen önce bir profil seçin.</p>';
                        return;
                    }
                    
                    let html = '';
                    if (xtreamAPI.isXtreamProfile()) {
                        const profile = xtreamAPI.getActiveXtreamProfile();
                        if (!profile) {
                            resultsContainer.innerHTML = '<p style="color: red; text-align: center; font-size: 18px; margin-top: 40px;">Profil yüklenemedi.</p>';
                            return;
                        }

                        // Build cache of all streams if not loaded yet
                        if (!window.__xtreamSearchCache || window.__xtreamSearchCache.profileId !== sourceId) {
                            const [live, vod, series] = await Promise.allSettled([
                                xtreamAPI.getLiveStreams(profile.server_url, profile.username, profile.password),
                                xtreamAPI.getVodStreams(profile.server_url, profile.username, profile.password),
                                xtreamAPI.getSeriesStreams(profile.server_url, profile.username, profile.password)
                            ]);
                            
                            let all = [];
                            if (live.status === 'fulfilled' && Array.isArray(live.value)) {
                                live.value.forEach(s => all.push({ ...s, type: 'live' }));
                            }
                            if (vod.status === 'fulfilled' && Array.isArray(vod.value)) {
                                vod.value.forEach(s => all.push({ ...s, type: 'vod' }));
                            }
                            if (series.status === 'fulfilled' && Array.isArray(series.value)) {
                                series.value.forEach(s => all.push({ ...s, type: 'series' }));
                            }
                            
                            window.__xtreamSearchCache = {
                                profileId: sourceId,
                                streams: all
                            };
                        }

                        const queryLower = query.toLowerCase();
                        const allowAdult = localStorage.getItem('iptv_allow_adult') === 'true';
                        
                        const ADULT_KEYWORDS = [
                            'xxx', 'adult', 'porn', '18+', 'erotic', 'sex', 'yetişkin',
                            'brazzers', 'bangbros', 'onlyfans', 'hustler', 'playboy',
                            'penthouse', 'gonzo', 'perfectgonzo', 'fakehostel', 'faketaxi',
                            'evil angel', 'evilangel', 'nubile', 'tushy', 'hardx',
                            'ddfnetwork', 'redlight', 'dorcel', 'vivid', 'private hd',
                            'mofos', 'realitykings', 'julesjourdan', 'swallowed', 'legalporno',
                            'legal porno', 'pink erotic', 'passionxxx', 'hot tv live'
                        ];

                        let results = window.__xtreamSearchCache.streams.filter(s => s.name && s.name.toLowerCase().includes(queryLower));

                        if (!allowAdult) {
                            results = results.filter(s => {
                                const nameLower = (s.name || '').toLowerCase();
                                return !ADULT_KEYWORDS.some(kw => nameLower.includes(kw));
                            });
                        }

                        results = results.slice(0, 50);

                        if (results.length === 0) {
                            resultsContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; font-size: 18px; margin-top: 40px;">Maalesef sonuç bulunamadı.</p>';
                            return;
                        }

                        for (const ch of results) {
                            const fallbackChar = ch.name.substring(0, 2).toUpperCase();
                            const logoUrl = ch.stream_icon || ch.cover || `https://placehold.co/120x80/2a2a35/FFFFFF?text=${encodeURIComponent(fallbackChar)}`;
                            const cardId = `xtream_${ch.type}_${ch.stream_id || ch.series_id}`;
                            const typeLabel = ch.type === 'live' ? 'Canlı' : (ch.type === 'vod' ? 'Film' : 'Dizi');
                            
                            if (window.registerStreamInfo) {
                                window.registerStreamInfo(cardId, ch);
                            }

                            html += `
                                <div onclick="document.getElementById('search-overlay').remove(); window.playXtreamStream('${cardId}')" style="display: flex; align-items: center; background: #1a1a1a; padding: 12px 20px; border-radius: 8px; cursor: pointer; transition: transform 0.2s, background 0.2s;" onmouseover="this.style.background='#2a2a2a'; this.style.transform='scale(1.02)'" onmouseout="this.style.background='#1a1a1a'; this.style.transform='scale(1)'">
                                    <img src="${logoUrl}" style="width: 80px; height: 50px; object-fit: contain; margin-right: 20px; background: #000; border-radius: 4px;" onerror="this.src='https://placehold.co/120x80/2a2a35/FFFFFF?text=${encodeURIComponent(fallbackChar)}'">
                                    <div style="flex: 1;">
                                        <h4 style="font-size: 16px; margin: 0 0 5px 0; color: #fff;">${ch.name} <span style="font-size: 10px; background: rgba(255,255,255,0.1); color: #aaa; padding: 2px 5px; border-radius: 3px; margin-left: 10px;">${typeLabel}</span></h4>
                                        <p style="font-size: 12px; color: var(--text-secondary); margin: 0;">📁 Kategori ID: ${ch.category_id}</p>
                                    </div>
                                    <i style="color: var(--text-secondary); font-size: 20px;">▶</i>
                                </div>
                            `;
                        }
                    } else {
                        const results = await channelDB.searchChannels(sourceId, query, 50);
                        if (results.length === 0) {
                            resultsContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; font-size: 18px; margin-top: 40px;">Maalesef sonuç bulunamadı.</p>';
                            return;
                        }
                        
                        for (const ch of results) {
                            const fallbackChar = ch.name.substring(0,2).toUpperCase();
                            const logoUrl = ch.logo || `https://placehold.co/120x80/2a2a35/FFFFFF?text=${encodeURIComponent(fallbackChar)}`;
                            
                            let resBadge = '';
                            if (ch.resolution === '4K') resBadge = `<span style="font-size: 10px; background: var(--badge-4k-bg); color: var(--badge-4k); padding: 2px 5px; border-radius: 3px; margin-left: 10px;">4K</span>`;
                            else if (ch.resolution === 'FHD') resBadge = `<span style="font-size: 10px; background: var(--badge-fhd-bg); color: var(--badge-fhd); padding: 2px 5px; border-radius: 3px; margin-left: 10px;">FHD</span>`;
                            else if (ch.resolution === 'HD') resBadge = `<span style="font-size: 10px; background: var(--badge-hd-bg); color: var(--badge-hd); padding: 2px 5px; border-radius: 3px; margin-left: 10px;">HD</span>`;

                            html += `
                                <div onclick="document.getElementById('search-overlay').remove(); window.location.hash='#/player/${ch.id}'" style="display: flex; align-items: center; background: #1a1a1a; padding: 12px 20px; border-radius: 8px; cursor: pointer; transition: transform 0.2s, background 0.2s;" onmouseover="this.style.background='#2a2a2a'; this.style.transform='scale(1.02)'" onmouseout="this.style.background='#1a1a1a'; this.style.transform='scale(1)'">
                                    <img src="${logoUrl}" style="width: 80px; height: 50px; object-fit: contain; margin-right: 20px; background: #000; border-radius: 4px;" onerror="this.src='https://placehold.co/120x80/2a2a35/FFFFFF?text=${encodeURIComponent(fallbackChar)}'">
                                    <div style="flex: 1;">
                                        <h4 style="font-size: 16px; margin: 0 0 5px 0; color: #fff;">${ch.name} ${resBadge}</h4>
                                        <p style="font-size: 12px; color: var(--text-secondary); margin: 0;">📁 ${ch.category}</p>
                                    </div>
                                    <i style="color: var(--text-secondary); font-size: 20px;">▶</i>
                                </div>
                            `;
                        }
                    }
                    resultsContainer.innerHTML = html;
                } catch(err) {
                    resultsContainer.innerHTML = '<p style="color: red; text-align: center; margin-top: 40px;">Arama sırasında hata oluştu.</p>';
                }
            }, 300);
        });
    }
    
    // Focus automatically
    setTimeout(() => document.getElementById('search-input').focus(), 100);
}
