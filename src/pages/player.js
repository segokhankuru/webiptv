import { apiClient } from '../services/api-client.js';
import { channelDB } from '../services/channel-db.js';
import Hls from 'hls.js';

export async function renderPlayer(channelId) {
    const container = document.getElementById('app');
    
    // YouTube Style Player Layout with Custom Controls
    container.innerHTML = `
        <div class="netflix-layout">
            <nav class="netflix-navbar" id="navbar" style="background-color: #141414; box-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                <h1 class="logo">WebIPTV <span class="badge">PRO</span></h1>
                <div class="nav-links">
                    <a href="#/home">Ana Sayfa</a>
                    <a href="#/search">Arama</a>
                    <a href="#/favorites">Favoriler</a>
                </div>
                <div class="user-profile">
                    <img src="https://ui-avatars.com/api/?name=${apiClient.store?.user?.username || 'U'}&background=e50914&color=fff" alt="User">
                </div>
            </nav>
            
            <!-- Removed max-width to allow the player to expand horizontally -->
            <div style="display: flex; flex-direction: row; padding: 80px 2% 20px 2%; gap: 24px; width: 100%; margin: 0 auto; align-items: flex-start; flex-wrap: wrap; box-sizing: border-box;">
                
                <!-- Left: Video Player and Info -->
                <div style="flex: 1; min-width: 60%;">
                    <div id="video-wrapper" style="width: 100%; aspect-ratio: 16/9; background: #000; position: relative; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.6);">
                        <video id="hls-video" style="width: 100%; height: 100%; outline: none; cursor: pointer;" autoplay></video>
                        
                        <!-- Netflix Style Subtitle Overlay -->
                        <div id="subtitle-overlay" style="position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%); text-align: center; color: white; font-size: 22px; font-weight: 500; text-shadow: 0 2px 4px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.5); padding: 5px 15px; border-radius: 4px; pointer-events: none; z-index: 24; display: none; max-width: 85%; line-height: 1.4; font-family: 'Inter', 'Roboto', sans-serif; transition: all 0.1s;"></div>
                        
                        <!-- Custom Settings Menu -->
                        <div id="track-settings" style="position: absolute; bottom: 60px; right: 20px; background: rgba(28,28,28,0.95); padding: 15px; border-radius: 8px; color: white; display: none; z-index: 25; min-width: 200px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                            <div id="resolution-info-container" style="margin-bottom: 15px;">
                                <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #aaa; border-bottom: 1px solid #444; padding-bottom: 5px;">📺 Kalite</h4>
                                <div id="resolution-display" style="color: white; font-size: 14px; font-weight: 600; background: #222; padding: 8px; border-radius: 4px; border: 1px solid #444; text-align: center;">Yükleniyor...</div>
                            </div>
                            <div id="audio-tracks-container" style="margin-bottom: 15px; display: none;">
                                <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #aaa; border-bottom: 1px solid #444; padding-bottom: 5px;">🎵 Ses Seçeneği</h4>
                                <select id="audio-tracks" style="width: 100%; background: #222; color: white; border: 1px solid #444; padding: 8px; border-radius: 4px; outline: none; cursor: pointer;"></select>
                            </div>
                            <div id="subtitle-tracks-container" style="display: none;">
                                <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #aaa; border-bottom: 1px solid #444; padding-bottom: 5px;">💬 Altyazı</h4>
                                <select id="subtitle-tracks" style="width: 100%; background: #222; color: white; border: 1px solid #444; padding: 8px; border-radius: 4px; outline: none; cursor: pointer;"></select>
                            </div>
                        </div>

                        <!-- Custom Controls Overlay -->
                        <div id="custom-controls" style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.9)); padding: 30px 15px 10px 15px; opacity: 0; transition: opacity 0.3s; display: flex; flex-direction: column; z-index: 20;">
                            <!-- Progress Bar -->
                            <div id="progress-container" style="width: 100%; height: 4px; background: rgba(255,255,255,0.3); cursor: pointer; margin-bottom: 15px; position: relative; transition: height 0.1s;">
                                <div id="progress-bar" style="height: 100%; background: #f00; width: 0%; position: relative;">
                                    <div style="position: absolute; right: -6px; top: -4px; width: 12px; height: 12px; background: #f00; border-radius: 50%; opacity: 0; transition: opacity 0.1s;" class="progress-knob"></div>
                                </div>
                            </div>
                            
                            <!-- Controls Row -->
                            <div style="display: flex; justify-content: space-between; align-items: center; color: white;">
                                <!-- Left Controls -->
                                <div style="display: flex; align-items: center; gap: 20px;">
                                    <button id="play-pause-btn" style="background: none; border: none; color: white; cursor: pointer; font-size: 24px; padding: 0; display: flex; align-items: center; transition: transform 0.1s;" onmousedown="this.style.transform='scale(0.9)'" onmouseup="this.style.transform='scale(1)'">
                                        <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                    </button>
                                    <div style="display: flex; align-items: center; gap: 10px;" class="volume-group">
                                        <button id="mute-btn" style="background: none; border: none; color: white; cursor: pointer; font-size: 24px; padding: 0; display: flex; align-items: center;">
                                            <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                                        </button>
                                        <input type="range" id="volume-slider" min="0" max="1" step="0.05" value="1" style="width: 80px; accent-color: white; cursor: pointer;">
                                    </div>
                                    <span id="time-display" style="font-size: 13px; font-family: 'Roboto', sans-serif; font-weight: 500;">0:00 / 0:00</span>
                                </div>
                                
                                <!-- Right Controls -->
                                <div style="display: flex; align-items: center; gap: 20px;">
                                    <button id="settings-btn" style="background: none; border: none; color: white; cursor: pointer; padding: 0; display: flex; align-items: center; transition: transform 0.2s;" title="Ayarlar">
                                        <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
                                    </button>
                                    <button id="fullscreen-btn" style="background: none; border: none; color: white; cursor: pointer; padding: 0; display: flex; align-items: center;" title="Tam Ekran">
                                        <svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <h1 id="channel-name" style="margin: 20px 0 10px 0; font-size: 1.5rem; color: white; font-weight: 700;">Yükleniyor...</h1>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 20px; margin-bottom: 20px;">
                        <div style="display: flex; gap: 15px; align-items: center;">
                            <img id="channel-logo" src="https://placehold.co/50x50/222/FFF?text=TV" style="width: 50px; height: 50px; border-radius: 50%; object-fit: contain; background: #000; border: 1px solid #333;">
                            <div>
                                <h3 id="channel-category" style="color: white; font-weight: 600; margin: 0; font-size: 16px;">Kategori</h3>
                                <p style="color: var(--text-secondary); margin: 3px 0 0 0; font-size: 12px;">WebIPTV Tarafından</p>
                            </div>
                        </div>
                        <button id="fav-btn" style="background: var(--surface-hover); color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
                            <span id="fav-icon">🤍</span> <span id="fav-text">Favoriye Ekle</span>
                        </button>
                    </div>
                </div>
                
                <!-- Right: Related Channels Sidebar -->
                <div style="width: 400px; flex-shrink: 0; display: flex; flex-direction: column; max-height: calc(100vh - 100px);" class="related-sidebar">
                    <h3 style="color: white; margin: 0 0 10px 0; font-size: 18px;">Kategori Listesi</h3>
                    <input type="text" id="related-search" placeholder="Bu kategoride ara..." style="width: 100%; background: #222; border: 1px solid #444; color: white; padding: 12px 15px; border-radius: 8px; margin-bottom: 15px; outline: none; box-sizing: border-box; font-size: 14px;">
                    <div id="related-channels" style="display: flex; flex-direction: column; gap: 10px; overflow-y: auto; padding-right: 5px; flex: 1;">
                        <div style="text-align: center; padding: 20px;"><div style="width: 24px; height: 24px; border: 3px solid #555; border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div></div>
                    </div>
                </div>
                
            </div>
        </div>
        <style>
            @media (max-width: 1024px) {
                .related-sidebar { width: 100% !important; max-width: 100% !important; margin-top: 20px; }
            }
            #progress-container:hover { height: 7px !important; }
            #progress-container:hover .progress-knob { opacity: 1 !important; }
        </style>
    `;

    function showToast(msg) {
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 10px 25px; border-radius: 20px; z-index: 1000; font-size: 14px; pointer-events: none; border: 1px solid var(--accent-color); transition: opacity 0.5s;';
        toast.innerText = msg;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = 0; setTimeout(() => toast.remove(), 500); }, 2000);
    }

    try {
        const channel = await channelDB.getChannel(channelId);
        if (!channel) throw new Error('Kanal bulunamadı');
        const fallbackChar = channel.name.substring(0, 2).toUpperCase();
        
        const proxyLogoUrl = (url) => {
            if (!url) return '';
            if (url.startsWith('http://')) {
                return `/api/proxy/m3u?url=${encodeURIComponent(url)}`;
            }
            return url;
        };

        document.getElementById('channel-name').innerText = channel.name;
        document.getElementById('channel-category').innerText = channel.category;
        document.getElementById('channel-logo').src = proxyLogoUrl(channel.logo) || `https://placehold.co/50x50/2a2a35/FFFFFF?text=${encodeURIComponent(fallbackChar)}`;
        document.getElementById('resolution-display').innerText = 'Bağlanıyor...';
        
        // Load related channels from IndexedDB
        const sourceId = localStorage.getItem('iptv_active_source_id');
        if (sourceId) {
            channelDB.getChannelsByCategory(sourceId, channel.category, 1, 10000).then(res => {
                if (res.data) {
                    const allChannels = res.data.filter(c => c.id != channelId);
                    const relatedContainer = document.getElementById('related-channels');
                    const searchInput = document.getElementById('related-search');
 
                    const renderRelated = (list) => {
                        let rHtml = '';
                        const displayList = list.slice(0, 100);
                        for (const rc of displayList) {
                            const rLogo = proxyLogoUrl(rc.logo) || `https://placehold.co/160x90/2a2a35/FFFFFF?text=${encodeURIComponent(rc.name.substring(0,2).toUpperCase())}`;,2).toUpperCase())}`;
                            rHtml += `
                                <div onclick="window.location.hash='#/player/${rc.id}'" style="display: flex; gap: 10px; cursor: pointer; transition: background 0.2s; padding: 5px; border-radius: 8px;" onmouseover="this.style.background='var(--surface-hover)'" onmouseout="this.style.background='transparent'">
                                    <div style="width: 140px; aspect-ratio: 16/9; background: #000; border-radius: 6px; overflow: hidden; position: relative; flex-shrink: 0;">
                                        <img src="${rLogo}" style="width: 100%; height: 100%; object-fit: contain; padding: 2px;" onerror="this.src='https://placehold.co/160x90/2a2a35/FFFFFF?text=TV'">
                                        <span style="position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.8); color: white; font-size: 10px; padding: 2px 4px; border-radius: 3px; font-weight: bold;">${rc.resolution || 'SD'}</span>
                                    </div>
                                    <div style="flex: 1; padding-top: 2px; min-width: 0;">
                                        <h4 style="color: white; margin: 0 0 5px 0; font-size: 13px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${rc.name}</h4>
                                        <p style="color: var(--text-secondary); margin: 0; font-size: 11px;">${rc.category}</p>
                                    </div>
                                </div>
                            `;
                        }
                        if (list.length > 100) {
                            rHtml += `<p style="color:gray; font-size:12px; text-align:center; margin-top:10px;">+ ${list.length - 100} kanal daha (arama yapın)</p>`;
                        }
                        relatedContainer.innerHTML = rHtml || '<p style="color:gray; font-size: 14px; text-align:center;">Sonuç bulunamadı</p>';
                    };

                    renderRelated(allChannels);

                    searchInput.addEventListener('input', (e) => {
                        const term = e.target.value.toLowerCase();
                        if (!term) {
                            renderRelated(allChannels);
                            return;
                        }
                        const filtered = allChannels.filter(c => c.name.toLowerCase().includes(term));
                        renderRelated(filtered);
                    });
                }
            });
        }

        // Setup Favorites Logic
        const favBtn = document.getElementById('fav-btn');
        const favIcon = document.getElementById('fav-icon');
        const favText = document.getElementById('fav-text');
        let isFav = false;
        let favId = null;
        
        apiClient.request('/user/favorites').then(favs => {
            const favRecord = favs.find(f => f.stream_url === channel.streamUrl);
            isFav = !!favRecord;
            favId = favRecord ? favRecord.id : null;
            
            favIcon.innerText = isFav ? '❤️' : '🤍';
            favText.innerText = isFav ? 'Favorilerden Çıkar' : 'Favoriye Ekle';

            favBtn.addEventListener('click', async () => {
                favBtn.style.transform = 'scale(1.05)';
                try {
                    if (isFav) {
                        await apiClient.request(`/user/favorites/${favId}`, { method: 'DELETE' });
                        isFav = false;
                        favIcon.innerText = '🤍';
                        favText.innerText = 'Favoriye Ekle';
                        showToast("Favorilerden çıkarıldı");
                    } else {
                        const res = await apiClient.request('/user/favorites', {
                            method: 'POST',
                            body: JSON.stringify({ 
                                channel_id: channel.id,
                                channel_name: channel.name,
                                channel_logo: channel.logo,
                                stream_url: channel.streamUrl
                            })
                        });
                        isFav = true;
                        favId = res.id;
                        favIcon.innerText = '❤️';
                        favText.innerText = 'Favorilerden Çıkar';
                        showToast("Favorilere eklendi");
                    }
                } catch(e) { console.error("Favori işlemi başarısız", e); }
                setTimeout(() => favBtn.style.transform = 'scale(1)', 200);
            });
        });

        // CUSTOM VIDEO CONTROLS LOGIC
        const video = document.getElementById('hls-video');
        const videoWrapper = document.getElementById('video-wrapper');
        const controls = document.getElementById('custom-controls');
        const playPauseBtn = document.getElementById('play-pause-btn');
        const muteBtn = document.getElementById('mute-btn');
        const volumeSlider = document.getElementById('volume-slider');
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        const timeDisplay = document.getElementById('time-display');
        const progressBar = document.getElementById('progress-bar');
        const progressContainer = document.getElementById('progress-container');

        const icons = {
            play: '<svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M8 5v14l11-7z"/></svg>',
            pause: '<svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
            volume: '<svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
            mute: '<svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>'
        };

        // Show/Hide Controls on Hover
        let controlTimeout;
        const showControls = () => {
            controls.style.opacity = '1';
            videoWrapper.style.cursor = 'default';
            clearTimeout(controlTimeout);
            controlTimeout = setTimeout(() => {
                if (!video.paused) {
                    controls.style.opacity = '0';
                    videoWrapper.style.cursor = 'none';
                }
            }, 3000);
        };
        videoWrapper.addEventListener('mousemove', showControls);
        videoWrapper.addEventListener('mouseenter', showControls);
        videoWrapper.addEventListener('mouseleave', () => { if (!video.paused) controls.style.opacity = '0'; });

        // Play/Pause
        const togglePlay = () => {
            if (video.paused) video.play();
            else video.pause();
        };
        playPauseBtn.addEventListener('click', togglePlay);
        video.addEventListener('click', togglePlay);
        video.addEventListener('play', () => playPauseBtn.innerHTML = icons.pause);
        video.addEventListener('pause', () => { playPauseBtn.innerHTML = icons.play; showControls(); });

        // Volume
        volumeSlider.addEventListener('input', (e) => {
            video.volume = e.target.value;
            video.muted = e.target.value == 0;
        });
        muteBtn.addEventListener('click', () => {
            video.muted = !video.muted;
            if (video.muted) {
                volumeSlider.value = 0;
                muteBtn.innerHTML = icons.mute;
            } else {
                volumeSlider.value = video.volume || 1;
                muteBtn.innerHTML = icons.volume;
            }
        });
        video.addEventListener('volumechange', () => {
            if (video.muted || video.volume == 0) muteBtn.innerHTML = icons.mute;
            else muteBtn.innerHTML = icons.volume;
        });

        // Fullscreen
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) videoWrapper.requestFullscreen().catch(err => console.log(err));
            else document.exitFullscreen();
        });

        // Format time (seconds to M:SS or H:MM:SS)
        const formatTime = (time) => {
            if (isNaN(time)) return '0:00';
            const h = Math.floor(time / 3600);
            const m = Math.floor((time % 3600) / 60);
            const s = Math.floor(time % 60);
            return h > 0 ? `${h}:${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}` : `${m}:${s < 10 ? '0'+s : s}`;
        };

        // Progress Bar
        progressContainer.addEventListener('click', (e) => {
            if (video.duration && video.duration !== Infinity) {
                const rect = progressContainer.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                video.currentTime = pos * video.duration;
            }
        });

        // Dynamic Resolution Logic
        const updateActualResolution = () => {
            const h = video.videoHeight;
            let label = channel.resolution ? `${channel.resolution} (Otomatik)` : 'Otomatik';
            if (h) {
                if (h >= 2160) label = '4K (2160p)';
                else if (h >= 1080) label = 'FHD (1080p)';
                else if (h >= 720) label = 'HD (720p)';
                else if (h >= 480) label = 'SD (480p)';
                else label = `SD (${h}p)`;
            }
            document.getElementById('resolution-display').innerText = label;
        };
        video.addEventListener('loadedmetadata', updateActualResolution);
        video.addEventListener('resize', updateActualResolution); // Catches HLS adaptive bitrate changes

        // VOD Resume Logic & Time Update
        const savedTimeKey = `resume_time_${channel.id}`;
        
        video.addEventListener('loadedmetadata', () => {
            if (video.duration > 0 && video.duration !== Infinity) {
                const savedTime = localStorage.getItem(savedTimeKey);
                if (savedTime) {
                    video.currentTime = parseFloat(savedTime);
                    showToast("Kaldığınız yerden devam ediliyor");
                }
            }
        });

        video.addEventListener('timeupdate', () => {
            if (video.duration > 0 && video.duration !== Infinity) {
                const progress = (video.currentTime / video.duration) * 100;
                progressBar.style.width = `${progress}%`;
                timeDisplay.innerText = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
                
                if (Math.floor(video.currentTime) % 5 === 0) {
                    localStorage.setItem(savedTimeKey, video.currentTime);
                }
            } else {
                progressBar.style.width = '100%';
                timeDisplay.innerText = '🔴 Canlı';
            }
        });

        // Settings Menu Logic
        const settingsBtn = document.getElementById('settings-btn');
        const trackSettings = document.getElementById('track-settings');
        const audioSelect = document.getElementById('audio-tracks');
        const subtitleSelect = document.getElementById('subtitle-tracks');
        const audioContainer = document.getElementById('audio-tracks-container');
        const subtitleContainer = document.getElementById('subtitle-tracks-container');

        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            trackSettings.style.display = trackSettings.style.display === 'none' ? 'block' : 'none';
        });
        videoWrapper.addEventListener('click', (e) => {
            if(e.target !== settingsBtn && !trackSettings.contains(e.target)) {
                trackSettings.style.display = 'none';
            }
        });

        let hls = null;
        if (!channel.streamUrl) {
            throw new Error('Bu kanal için yayın adresi (streamUrl) bulunamadı. Profili yeniden senkronize edin.');
        }

        /**
         * Mixed Content düzeltmesi:
         * Uygulama https:// üzerinde çalışıyor. Eğer stream URL'i http:// ile başlıyorsa
         * tarayıcı bunu "Mixed Content" olarak bloklar. Bunu çözmek için sunucu tarafındaki
         * proxy endpoint'i üzerinden geçiriyoruz.
         */
        const rawUrl = channel.streamUrl;
        const needsProxy = rawUrl.startsWith('http://');
        const playUrl = needsProxy
            ? `/api/proxy/stream?url=${encodeURIComponent(rawUrl)}`
            : rawUrl;

        /**
         * Format algılama:
         * - .m3u8 → HLS.js ile oynat
         * - .mkv, .mp4, .ts, .avi, .mov, .webm → native <video> ile oynat
         * - Bilinmeyen → önce HLS.js dene, hata alırsa native'e düş
         */
        const urlLower = rawUrl.toLowerCase().split('?')[0]; // query string'i çıkar
        const isDirectVideo = /\.(mkv|mp4|avi|mov|webm|flv|wmv|ogv|3gp|m4v|ts)$/.test(urlLower);
        const isHls = urlLower.endsWith('.m3u8') || urlLower.includes('.m3u8?');

        if (isDirectVideo || (!isHls && !Hls.isSupported())) {
            // Native video player — MKV, MP4 ve diğer doğrudan dosyalar
            video.src = playUrl;

            // ── Xtream API Entegrasyonu (Gelişmiş Otomatik Altyazı Arama) ──
            const srtToVtt = (srtText) => {
                let vtt = "WEBVTT\n\n";
                let text = srtText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                const regex = /(\d{2}:\d{2}:\d{2}),(\d{3})/g;
                text = text.replace(regex, '$1.$2');
                vtt += text;
                return vtt;
            };

            const parseXtreamUrl = (url) => {
                try {
                    const urlObj = new URL(url);
                    const host = urlObj.origin;
                    const pathParts = urlObj.pathname.split('/');
                    if (pathParts.length >= 5) {
                        const type = pathParts[1];
                        const username = pathParts[2];
                        const password = pathParts[3];
                        const filePart = pathParts[4];
                        const streamId = filePart.split('.')[0];
                        if ((type === 'movie' || type === 'series') && username && password && streamId) {
                            return { host, type, username, password, streamId };
                        }
                    }
                } catch (e) {
                    console.log("Xtream URL değil");
                }
                return null;
            };

            let xtreamSubsLoaded = false;

            const loadXtreamSubtitles = async (xtream) => {
                try {
                    const res = await apiClient.request('/proxy/xtream', {
                        method: 'POST',
                        body: JSON.stringify({
                            url: `${xtream.host}/player_api.php`,
                            params: {
                                username: xtream.username,
                                password: xtream.password,
                                action: xtream.type === 'movie' ? 'get_vod_info' : 'get_series_info',
                                [xtream.type === 'movie' ? 'vod_id' : 'series_id']: xtream.streamId
                            }
                        })
                    });

                    let subs = [];
                    if (res && res.info && res.info.subtitles) {
                        subs = res.info.subtitles;
                    }

                    if (subs && subs.length > 0) {
                        xtreamSubsLoaded = true;
                        subtitleContainer.style.display = 'block';
                        settingsBtn.style.display = 'flex';

                        subtitleSelect.innerHTML = '<option value="-1">Kapalı</option>' +
                            subs.map((s, i) => `<option value="${i}">${s.language || 'Altyazı ' + (i+1)} (${s.extension})</option>`).join('');

                        subtitleSelect.onchange = async (e) => {
                            const idx = parseInt(e.target.value);
                            const existingTracks = video.querySelectorAll('track.dynamic-sub');
                            existingTracks.forEach(t => t.remove());

                            if (idx === -1) return;

                            const selectedSub = subs[idx];
                            const subUrl = `/api/proxy/m3u?url=${encodeURIComponent(selectedSub.url)}`;
                            
                            try {
                                const subResponse = await fetch(subUrl);
                                let subText = await subResponse.text();
                                
                                if (selectedSub.extension === 'srt' || !subText.startsWith('WEBVTT')) {
                                    subText = srtToVtt(subText);
                                }
                                
                                const blob = new Blob([subText], { type: 'text/vtt' });
                                const blobUrl = URL.createObjectURL(blob);
                                
                                const track = document.createElement('track');
                                track.className = 'dynamic-sub';
                                track.src = blobUrl;
                                track.kind = 'subtitles';
                                track.srclang = selectedSub.language.substring(0, 2).toLowerCase();
                                track.label = selectedSub.language;
                                track.default = true;
                                
                                video.appendChild(track);
                                track.track.mode = 'showing';
                            } catch (err) {
                                console.error("Altyazı yüklenemedi:", err);
                                showToast("Altyazı yüklenemedi");
                            }
                        };
                    }
                } catch (err) {
                    console.error("Xtream altyazı bilgileri alınamadı:", err);
                }
            };

            // Matroska Subtitle Parser Yardımcıları
            const loadMatroskaParser = () => {
                return new Promise((resolve, reject) => {
                    if (window.MatroskaSubtitles) {
                        resolve(window.MatroskaSubtitles);
                        return;
                    }
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/matroska-subtitles@1.1.2/dist/matroska-subtitles.min.js';
                    script.onload = () => resolve(window.MatroskaSubtitles);
                    script.onerror = () => reject(new Error('Altyazı kütüphanesi yüklenemedi.'));
                    document.head.appendChild(script);
                });
            };

            const cleanSubtitleText = (text) => {
                if (!text) return '';
                let cleaned = text.replace(/\{[^}]+\}/g, ''); // ASS/SSA format etiketlerini temizle
                cleaned = cleaned.replace(/\\N/g, '<br>');    // Satır sonlarını br yap
                return cleaned;
            };

            let subtitleCues = [];
            let activeTrackNumber = -1;
            let reader = null;
            let isReading = false;
            const subtitleOverlay = document.getElementById('subtitle-overlay');

            const startMatroskaParser = async () => {
                if (xtreamSubsLoaded) return; // Yarış durumunu engelle
                try {
                    const MatroskaSubtitles = await loadMatroskaParser();
                    const parser = new MatroskaSubtitles.SubtitleParser();
                    
                    parser.on('tracks', (tracks) => {
                        if (xtreamSubsLoaded) return; // Yarış durumunu engelle
                        const subTracks = tracks.filter(t => t.type === 'subtitle');
                        if (subTracks.length > 0) {
                            subtitleContainer.style.display = 'block';
                            settingsBtn.style.display = 'flex';
                            
                            subtitleSelect.innerHTML = '<option value="-1">Kapalı</option>' +
                                subTracks.map(t => `<option value="${t.number}">${t.name || t.language || 'Altyazı ' + t.number}</option>`).join('');
                                
                            subtitleSelect.onchange = (e) => {
                                activeTrackNumber = parseInt(e.target.value);
                                if (activeTrackNumber === -1) {
                                    subtitleOverlay.style.display = 'none';
                                    subtitleOverlay.innerHTML = '';
                                }
                            };
                        }
                    });

                    parser.on('subtitle', (subtitle, trackNumber) => {
                        subtitleCues.push({
                            trackNumber,
                            start: subtitle.time / 1000,
                            end: (subtitle.time + subtitle.duration) / 1000,
                            text: subtitle.text
                        });
                    });

                    isReading = true;
                    const response = await fetch(playUrl);
                    reader = response.body.getReader();

                    while (isReading) {
                        if (video.paused) {
                            await new Promise(r => setTimeout(r, 500));
                            continue;
                        }
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        parser.write(value);
                        await new Promise(r => setTimeout(r, 10)); // CPU'yu korumak için hafif bekleme
                    }
                } catch (err) {
                    console.log("Matroska altyazıları çözülemedi veya stream okunamadı:", err.message);
                }
            };

            video.addEventListener('loadedmetadata', () => {
                video.play().catch(() => {
                    playPauseBtn.innerHTML = icons.play;
                });

                // ── Ses Track'leri ──────────────────────────────────────────
                const aTracks = video.audioTracks;
                if (aTracks && aTracks.length > 1) {
                    audioContainer.style.display = 'block';
                    settingsBtn.style.display = 'flex';

                    audioSelect.innerHTML = Array.from(aTracks).map((t, i) =>
                        `<option value="${i}">${t.label || t.language || 'Ses ' + (i + 1)}</option>`
                    ).join('');

                    audioSelect.onchange = (e) => {
                        const idx = parseInt(e.target.value);
                        Array.from(aTracks).forEach((t, i) => { t.enabled = (i === idx); });
                    };
                }

                // ── Altyazı Track'leri (Native varsa) ───────────────────────
                const tTracks = video.textTracks;
                const populateSubtitles = () => {
                    const validTracks = Array.from(tTracks).filter(t => t.kind === 'subtitles' || t.kind === 'captions');
                    if (validTracks.length > 0) {
                        subtitleContainer.style.display = 'block';
                        settingsBtn.style.display = 'flex';

                        subtitleSelect.innerHTML = '<option value="-1">Kapalı</option>' +
                            validTracks.map((t, i) =>
                                `<option value="${i}">${t.label || t.language || 'Altyazı ' + (i + 1)}</option>`
                            ).join('');

                        subtitleSelect.onchange = (e) => {
                            const idx = parseInt(e.target.value);
                            validTracks.forEach((t, i) => {
                                t.mode = (i === idx) ? 'showing' : 'hidden';
                            });
                        };
                    }
                };

                if (tTracks.length > 0) {
                    populateSubtitles();
                }
                tTracks.onaddtrack = populateSubtitles;

                // Altyazıları yükle (Önce Xtream API, yoksa local parser fallback)
                const xtream = parseXtreamUrl(rawUrl);
                if (xtream) {
                    loadXtreamSubtitles(xtream).then(() => {
                        if (!xtreamSubsLoaded) {
                            startMatroskaParser();
                        }
                    });
                } else {
                    startMatroskaParser();
                }
            });

            // Video timeupdate ile altyazı senkronizasyonu (Matroska parser için)
            video.addEventListener('timeupdate', () => {
                if (activeTrackNumber === -1) return;
                const now = video.currentTime;
                const currentCue = subtitleCues.find(c => c.trackNumber === activeTrackNumber && now >= c.start && now <= c.end);
                if (currentCue) {
                    subtitleOverlay.style.display = 'block';
                    subtitleOverlay.innerHTML = cleanSubtitleText(currentCue.text);
                } else {
                    subtitleOverlay.style.display = 'none';
                }
            });

            video.addEventListener('error', () => {
                const codes = { 1: 'Kullanıcı iptal etti', 2: 'Ağ hatası', 3: 'Decode hatası', 4: 'Desteklenmeyen format' };
                const msg = codes[video.error?.code] || 'Bilinmeyen hata';
                showToast(`Video yüklenemedi: ${msg}`);
            });

            // Cleanup event'i (Sayfa kapandığında stream'i keser)
            window.addEventListener('hashchange', function cleanup() {
                if (window.location.hash.indexOf('#/player') === -1) {
                    isReading = false;
                    if (reader) reader.cancel();
                    window.removeEventListener('hashchange', cleanup);
                }
            });

        } else if (Hls.isSupported()) {
            // HLS.js — .m3u8 stream'ler
            hls = new Hls({ maxBufferLength: 30, enableWorker: true });
            hls.loadSource(playUrl);
            hls.attachMedia(video);
            
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                video.play().catch(e => {
                    console.log('Otomatik oynatma engellendi');
                    playPauseBtn.innerHTML = icons.play;
                });
            });

            // Asenkron ses kanalı güncellemelerini yakala
            const populateHlsAudio = () => {
                if (hls.audioTracks && hls.audioTracks.length > 1) {
                    audioContainer.style.display = 'block';
                    settingsBtn.style.display = 'block';
                    audioSelect.innerHTML = hls.audioTracks.map((t, i) => 
                        `<option value="${t.id}">${t.name || t.language || 'Ses ' + (i+1)}</option>`
                    ).join('');
                    audioSelect.value = hls.audioTrack;
                }
            };
            hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, populateHlsAudio);
            audioSelect.onchange = (e) => {
                hls.audioTrack = parseInt(e.target.value);
            };

            // Asenkron altyazı kanalı güncellemelerini yakala
            const populateHlsSubtitles = () => {
                if (hls.subtitleTracks && hls.subtitleTracks.length > 0) {
                    subtitleContainer.style.display = 'block';
                    settingsBtn.style.display = 'block';
                    subtitleSelect.innerHTML = '<option value="-1">Kapalı</option>' + 
                        hls.subtitleTracks.map((t, i) => 
                            `<option value="${t.id}">${t.name || t.language || 'Altyazı ' + (i+1)}</option>`
                        ).join('');
                    subtitleSelect.value = hls.subtitleTrack;
                }
            };
            hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, populateHlsSubtitles);
            
            // Başlangıçta da bir kez doldurmayı dene
            populateHlsAudio();
            populateHlsSubtitles();

            subtitleSelect.onchange = (e) => {
                hls.subtitleTrack = parseInt(e.target.value);
            };

            hls.on(Hls.Events.ERROR, function(event, data) {
                if (data.fatal) {
                    showToast('Yayın yüklenemedi. Bağlantı hatası.');
                    playPauseBtn.innerHTML = icons.play;
                }
            });
            
            window.addEventListener('hashchange', function cleanup() {
                if (window.location.hash.indexOf('#/player') === -1) {
                    if (hls) hls.destroy();
                    window.removeEventListener('hashchange', cleanup);
                }
            });
            
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari native HLS
            video.src = playUrl;
            video.addEventListener('loadedmetadata', () => video.play());
        }

    } catch(err) {
        container.innerHTML = `<div style="color:white; padding: 50px; text-align: center;"><h2>Hata</h2><p>Kanal yüklenemedi: ${err.message}</p><button onclick="window.history.back()" style="padding: 10px 20px; margin-top: 20px;">Geri Dön</button></div>`;
    }
}
