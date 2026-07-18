import { apiClient } from '../services/api-client.js';
import { channelDB } from '../services/channel-db.js';
import { xtreamAPI } from '../services/xtream-api.js';

export async function renderProfiles() {
    const container = document.getElementById('app');
    
    container.innerHTML = `
        <div class="profiles-wrapper" style="min-height: 100vh; background-color: #141414; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 40px 20px; font-family: 'Inter', 'Outfit', sans-serif; color: white;">
            <div id="profiles-main-content" style="text-align: center; width: 100%; max-width: 800px; animation: fadeIn 0.4s ease-out;">
                <h1 style="font-size: 2.8rem; font-weight: 700; margin-bottom: 40px; letter-spacing: 1px;">Kim izliyor?</h1>
                
                <div id="profiles-list-container" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 30px; margin-bottom: 60px;">
                    <div style="padding: 40px;">
                        <div style="width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #E50914; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px auto;"></div>
                        <p style="color: #aaa; font-size: 14px;">Profiller yükleniyor...</p>
                    </div>
                </div>
                
                <button id="manage-btn" class="btn-manage" style="background: transparent; border: 1px solid #808080; color: #808080; padding: 10px 24px; font-size: 1.1rem; letter-spacing: 2px; cursor: pointer; transition: all 0.2s ease; border-radius: 2px;">
                    PROFİLLERİ YÖNET
                </button>
            </div>
            
            <!-- Add Profile Modal -->
            <div id="add-profile-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.88); z-index: 2000; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease; overflow-y: auto; padding: 20px;">
                <div class="modal-card" style="background: #181818; padding: 36px; border-radius: 10px; width: 100%; max-width: 540px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); border: 1px solid #2f2f2f; transform: scale(0.9); transition: transform 0.3s ease; margin: auto;">
                    <h2 style="font-size: 1.8rem; font-weight: 700; margin-bottom: 20px; color: #fff;">Profil Ekle</h2>

                    <!-- Sekme Başlıkları -->
                    <div style="display: flex; gap: 0; margin-bottom: 28px; background: #111; border-radius: 6px; padding: 3px; border: 1px solid #222;">
                        <button id="tab-m3u" class="modal-tab active-tab" style="flex: 1; padding: 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: all 0.2s; background: #E50914; color: #fff;">
                            📋 M3U / Dosya
                        </button>
                        <button id="tab-xtream" class="modal-tab" style="flex: 1; padding: 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: all 0.2s; background: transparent; color: #888;">
                            ⚡ Xtream Codes
                        </button>
                    </div>

                    <!-- Profil Adı (her iki sekmede ortak) -->
                    <div style="margin-bottom: 18px;">
                        <label style="display: block; color: #8c8c8c; font-size: 0.8rem; margin-bottom: 7px; font-weight: 600; letter-spacing: 1px;">PROFİL ADI</label>
                        <input type="text" id="new-profile-name" placeholder="örn: Ev TV, Dizi Listesi" style="width: 100%; padding: 13px 14px; background: #252525; border: 1px solid #333; border-radius: 6px; color: white; font-size: 0.95rem; outline: none; box-sizing: border-box; transition: border-color 0.2s;" onfocus="this.style.borderColor='#E50914'" onblur="this.style.borderColor='#333'" />
                    </div>

                    <!-- M3U Paneli -->
                    <div id="panel-m3u">
                        <div style="margin-bottom: 14px;">
                            <label style="display: block; color: #8c8c8c; font-size: 0.8rem; margin-bottom: 7px; font-weight: 600; letter-spacing: 1px;">M3U LİNK <span style="color:#555; font-weight:400;">(opsiyonel)</span></label>
                            <input type="text" id="new-profile-url" placeholder="https://site.com/playlist.m3u?username=X&password=Y" style="width: 100%; padding: 13px 14px; background: #252525; border: 1px solid #333; border-radius: 6px; color: white; font-size: 0.9rem; outline: none; box-sizing: border-box; transition: border-color 0.2s;" onfocus="this.style.borderColor='#E50914'" onblur="this.style.borderColor='#333'" />
                            <p style="color: #555; font-size: 0.78rem; margin: 5px 0 0 0;">Sonraki oturumda bu linkten otomatik güncellenir.</p>
                        </div>

                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
                            <div style="flex: 1; height: 1px; background: #2a2a2a;"></div>
                            <span style="color: #444; font-size: 0.78rem; white-space: nowrap;">veya dosya yükle</span>
                            <div style="flex: 1; height: 1px; background: #2a2a2a;"></div>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label id="file-drop-zone" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 18px; background: #1e1e1e; border: 2px dashed #333; border-radius: 6px; cursor: pointer; transition: all 0.2s; box-sizing: border-box;">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                                <span id="file-drop-label" style="color: #555; font-size: 0.88rem;">Dosyayı sürükleyin veya tıklayın</span>
                                <span style="color: #3a3a3a; font-size: 0.75rem;">.m3u, .m3u8 desteklenir</span>
                                <input type="file" id="new-profile-file" accept=".m3u,.m3u8,text/plain" style="display: none;" />
                            </label>
                        </div>

                        <div id="source-info-box" style="display: none; background: rgba(229,9,20,0.08); border: 1px solid rgba(229,9,20,0.2); border-radius: 5px; padding: 10px 14px; margin-bottom: 16px; font-size: 0.82rem; color: #e57373;"></div>
                    </div>

                    <!-- Xtream Paneli -->
                    <div id="panel-xtream" style="display: none;">
                        <div style="background: rgba(255,193,7,0.07); border: 1px solid rgba(255,193,7,0.2); border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; font-size: 0.83rem; color: #ffc107; line-height: 1.5;">
                            ⚡ <b>Xtream Codes</b> ile kanallar <b>anında</b> yüklenir — büyük M3U dosyası indirmeye gerek yoktur. Kategoriler lazy-load edilir.
                        </div>

                        <div style="margin-bottom: 14px;">
                            <label style="display: block; color: #8c8c8c; font-size: 0.8rem; margin-bottom: 7px; font-weight: 600; letter-spacing: 1px;">SUNUCU ADRESİ</label>
                            <input type="text" id="xtream-server" placeholder="http://sunucu.com:8080" style="width: 100%; padding: 13px 14px; background: #252525; border: 1px solid #333; border-radius: 6px; color: white; font-size: 0.9rem; outline: none; box-sizing: border-box; transition: border-color 0.2s;" onfocus="this.style.borderColor='#ffc107'" onblur="this.style.borderColor='#333'" />
                            <p style="color: #555; font-size: 0.78rem; margin: 5px 0 0 0;">Port numarasıyla birlikte girin. Örn: http://example.com:25461</p>
                        </div>
                        <div style="display: flex; gap: 12px; margin-bottom: 14px;">
                            <div style="flex: 1;">
                                <label style="display: block; color: #8c8c8c; font-size: 0.8rem; margin-bottom: 7px; font-weight: 600; letter-spacing: 1px;">KULLANICI ADI</label>
                                <input type="text" id="xtream-username" placeholder="kullanici" style="width: 100%; padding: 13px 14px; background: #252525; border: 1px solid #333; border-radius: 6px; color: white; font-size: 0.9rem; outline: none; box-sizing: border-box; transition: border-color 0.2s;" onfocus="this.style.borderColor='#ffc107'" onblur="this.style.borderColor='#333'" />
                            </div>
                            <div style="flex: 1;">
                                <label style="display: block; color: #8c8c8c; font-size: 0.8rem; margin-bottom: 7px; font-weight: 600; letter-spacing: 1px;">ŞİFRE</label>
                                <input type="password" id="xtream-password" placeholder="••••••••" style="width: 100%; padding: 13px 14px; background: #252525; border: 1px solid #333; border-radius: 6px; color: white; font-size: 0.9rem; outline: none; box-sizing: border-box; transition: border-color 0.2s;" onfocus="this.style.borderColor='#ffc107'" onblur="this.style.borderColor='#333'" />
                            </div>
                        </div>

                        <div id="xtream-verify-status" style="display: none; padding: 10px 14px; border-radius: 5px; margin-bottom: 14px; font-size: 0.83rem;"></div>

                        <button id="xtream-verify-btn" style="width: 100%; padding: 11px; background: transparent; border: 1px solid #ffc107; color: #ffc107; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 600; margin-bottom: 16px; transition: all 0.2s;">
                            🔍 Bağlantıyı Test Et
                        </button>
                    </div>

                    <!-- Butonlar -->
                    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 4px;">
                        <button id="cancel-add-btn" style="background: transparent; border: 1px solid #444; color: #aaa; padding: 11px 22px; font-weight: 600; cursor: pointer; border-radius: 6px; transition: all 0.2s; font-size: 0.9rem;">İptal</button>
                        <button id="save-profile-btn" style="background: #E50914; border: none; color: #fff; padding: 11px 26px; font-weight: 700; cursor: pointer; border-radius: 6px; transition: all 0.2s; font-size: 0.9rem;">Kaydet</button>
                    </div>
                </div>
            </div>

            <!-- Sync Loader -->
            <div id="sync-loader-modal" style="display: none; position: fixed; inset: 0; background: #141414; z-index: 3000; align-items: center; justify-content: center; flex-direction: column; text-align: center; padding: 20px;">
                <div style="max-width: 450px; width: 100%;">
                    <div style="position: relative; width: 80px; height: 80px; margin: 0 auto 30px auto;">
                        <div style="box-sizing: border-box; position: absolute; width: 80px; height: 80px; border: 6px solid transparent; border-top-color: #E50914; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                        <div style="box-sizing: border-box; position: absolute; width: 80px; height: 80px; border: 6px solid transparent; border-bottom-color: rgba(229,9,20,0.2); border-radius: 50%;"></div>
                    </div>
                    <h2 id="sync-profile-name" style="font-size: 1.8rem; font-weight: 700; margin-bottom: 10px;">Profil Hazırlanıyor</h2>
                    <p id="sync-status-text" style="color: #aaa; font-size: 1rem; margin-bottom: 30px;">Kanal listesi indiriliyor...</p>
                    <div style="background: #333; height: 4px; width: 100%; border-radius: 2px; overflow: hidden; margin-bottom: 12px;">
                        <div id="sync-progress-fill" style="background: #E50914; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                    </div>
                    <p id="sync-percent-text" style="font-weight: bold; color: #E50914; font-size: 1.1rem; margin: 0;">%0</p>
                </div>
            </div>
        </div>
        
        <style>
            @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes spin { to { transform: rotate(360deg); } }
            .btn-manage:hover { border-color: white !important; color: white !important; background: rgba(255,255,255,0.05); }
            .profile-avatar-box:hover { transform: scale(1.05); }
            .profile-avatar-box:hover .avatar-img { border-color: #e50914 !important; }
            .profile-avatar-box:hover .profile-label { color: white !important; }
            #file-drop-zone:hover { border-color: #E50914 !important; background: rgba(229,9,20,0.05) !important; }
            #file-drop-zone.dragover { border-color: #E50914 !important; background: rgba(229,9,20,0.1) !important; }
            .modal-tab:hover { opacity: 0.85; }
            #xtream-verify-btn:hover { background: rgba(255,193,7,0.1) !important; }
        </style>
    `;
    
    // Element refs
    const listContainer   = document.getElementById('profiles-list-container');
    const manageBtn       = document.getElementById('manage-btn');
    const addModal        = document.getElementById('add-profile-modal');
    const newNameInput    = document.getElementById('new-profile-name');
    const newUrlInput     = document.getElementById('new-profile-url');
    const newFileInput    = document.getElementById('new-profile-file');
    const fileDropZone    = document.getElementById('file-drop-zone');
    const fileDropLabel   = document.getElementById('file-drop-label');
    const sourceInfoBox   = document.getElementById('source-info-box');
    const cancelAddBtn    = document.getElementById('cancel-add-btn');
    const saveProfileBtn  = document.getElementById('save-profile-btn');
    const tabM3u          = document.getElementById('tab-m3u');
    const tabXtream       = document.getElementById('tab-xtream');
    const panelM3u        = document.getElementById('panel-m3u');
    const panelXtream     = document.getElementById('panel-xtream');
    const xtreamServer    = document.getElementById('xtream-server');
    const xtreamUser      = document.getElementById('xtream-username');
    const xtreamPass      = document.getElementById('xtream-password');
    const xtreamVerifyBtn = document.getElementById('xtream-verify-btn');
    const xtreamStatus    = document.getElementById('xtream-verify-status');
    const syncModal       = document.getElementById('sync-loader-modal');
    const syncProfileName = document.getElementById('sync-profile-name');
    const syncStatusText  = document.getElementById('sync-status-text');
    const syncProgressFill= document.getElementById('sync-progress-fill');
    const syncPercentText = document.getElementById('sync-percent-text');

    let isManageMode = false;
    let profiles = [];
    let selectedFileContent = null;
    let activeTab = 'm3u'; // 'm3u' | 'xtream'

    const avatarGradients = [
        'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)',
        'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)',
        'linear-gradient(135deg, #F3F9A7 0%, #CAC531 100%)',
        'linear-gradient(135deg, #e52d27 0%, #b31217 100%)',
        'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
        'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
        'linear-gradient(135deg, #834d9b 0%, #d04ed6 100%)'
    ];

    // ──── Profil Listesi ────────────────────────────────────────────────────

    async function loadProfiles() {
        try {
            profiles = await apiClient.getSources();
            renderList();
        } catch (e) {
            console.error(e);
            profiles = [];
            renderList();
            const msg = document.createElement('div');
            msg.style.cssText = 'color:#ffc107;background:rgba(255,193,7,0.1);border:1px solid rgba(255,193,7,0.2);padding:12px 20px;border-radius:4px;font-size:0.9rem;margin-bottom:24px;width:100%;text-align:center;box-sizing:border-box;';
            msg.innerText = 'Profiller yüklenemedi. Yine de yeni profil ekleyebilirsiniz.';
            const mc = document.getElementById('profiles-main-content');
            mc?.insertBefore(msg, listContainer);
        }
    }

    function renderList() {
        listContainer.innerHTML = '';
        
        profiles.forEach((p, idx) => {
            const initial = p.name.substring(0, 2).toUpperCase();
            const grad    = avatarGradients[idx % avatarGradients.length];
            const isXtream = p.source_type === 'xtream';
            
            const card = document.createElement('div');
            card.className = 'profile-avatar-box';
            card.style.cssText = 'width: 140px; cursor: pointer; text-align: center; transition: all 0.3s ease;';
            
            card.innerHTML = `
                <div style="position: relative; width: 130px; height: 130px; margin: 0 auto 12px auto;">
                    <div class="avatar-img" style="width:100%;height:100%;border-radius:6px;background:${grad};display:flex;align-items:center;justify-content:center;font-size:2.4rem;font-weight:800;border:3px solid transparent;transition:border-color 0.2s;box-sizing:border-box;color:white;">
                        ${initial}
                    </div>
                    ${isXtream ? `<div style="position:absolute;top:6px;right:6px;background:#ffc107;color:#000;font-size:9px;font-weight:700;padding:2px 5px;border-radius:3px;">⚡XTREAM</div>` : ''}
                    ${isManageMode ? `
                        <div class="delete-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;border-radius:6px;">
                            <span class="material-icons" style="font-size:40px;color:#fff;">delete_forever</span>
                        </div>
                    ` : ''}
                </div>
                <div class="profile-label" style="font-size:1rem;color:#aaa;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 5px;">${p.name}</div>
                <div style="font-size:0.78rem;color:#555;margin-top:4px;">
                    ${isXtream ? '⚡ Xtream Codes' : (p.channel_count > 0 ? `${p.channel_count} Kanal` : 'Kurulum gerekli')}
                </div>
            `;
            
            card.addEventListener('click', () => {
                if (isManageMode) confirmDelete(p);
                else selectProfile(p);
            });
            listContainer.appendChild(card);
        });

        // + Profil Ekle
        const addCard = document.createElement('div');
        addCard.className = 'profile-avatar-box';
        addCard.style.cssText = 'width: 140px; cursor: pointer; text-align: center; transition: all 0.3s ease;';
        addCard.innerHTML = `
            <div class="avatar-img" style="width:130px;height:130px;margin:0 auto 12px auto;border-radius:6px;background:transparent;border:3px dashed #2a2a2a;display:flex;align-items:center;justify-content:center;color:#2a2a2a;font-size:3.5rem;font-weight:200;box-sizing:border-box;transition:all 0.2s;" onmouseover="this.style.borderColor='#555';this.style.color='#555'" onmouseout="this.style.borderColor='#2a2a2a';this.style.color='#2a2a2a'">+</div>
            <div style="font-size:1rem;color:#444;">Profil Ekle</div>
        `;
        addCard.addEventListener('click', openAddModal);
        listContainer.appendChild(addCard);
    }

    manageBtn.addEventListener('click', () => {
        isManageMode = !isManageMode;
        manageBtn.innerText    = isManageMode ? 'TAMAM' : 'PROFİLLERİ YÖNET';
        manageBtn.style.color  = isManageMode ? 'white' : '#808080';
        manageBtn.style.borderColor = isManageMode ? 'white' : '#808080';
        renderList();
    });

    async function confirmDelete(profile) {
        if (profile.name === 'Free-TV IPTV' || profile.name === 'Global IPTV') {
            alert('Varsayılan profiller silinemez.');
            return;
        }
        if (!confirm(`"${profile.name}" profilini silmek istediğinize emin misiniz?`)) return;
        try {
            await channelDB.clearChannels(profile.id);
            await apiClient.deleteSource(profile.id);
            if (localStorage.getItem('iptv_active_source_id') == profile.id) {
                localStorage.removeItem('iptv_active_source_id');
                localStorage.removeItem('iptv_active_xtream_profile');
            }
            await loadProfiles();
        } catch (e) {
            alert('Silme başarısız: ' + e.message);
        }
    }

    // ──── Profil Seçimi ─────────────────────────────────────────────────────

    async function selectProfile(profile) {
        // Xtream profili — IndexedDB'ye gerek yok, direkt açılır
        if (profile.source_type === 'xtream') {
            xtreamAPI.saveActiveXtreamProfile(profile);
            localStorage.setItem('iptv_active_source_id', profile.id);
            window.location.hash = '#/home';
            return;
        }

        // M3U profili — IndexedDB kontrolü
        const localCount = await channelDB.getChannelCount(profile.id);
        if (localCount > 0) {
            const cats = await channelDB.getCategories(profile.id).catch(() => []);
            let valid = false;
            if (cats.length > 0) {
                const sample = await channelDB.getChannelsByCategory(profile.id, cats[0].category, 1, 1).catch(() => ({ data: [] }));
                valid = sample.data?.length > 0 && !!sample.data[0].streamUrl;
            }
            if (valid) {
                localStorage.setItem('iptv_active_source_id', profile.id);
                localStorage.removeItem('iptv_active_xtream_profile');
                window.location.hash = '#/home';
            } else {
                await channelDB.clearChannels(profile.id);
                startSync(profile, null);
            }
        } else {
            if (profile.m3u_url) {
                startSync(profile, null);
            } else {
                alert('Bu profilin M3U linki yok ve yerel kanal verisi bulunamadı.');
            }
        }
    }

    // ──── M3U Sync ─────────────────────────────────────────────────────────

    async function startSync(profile, m3uTextOverride) {
        syncModal.style.display = 'flex';
        syncProfileName.innerText = profile.name;
        syncStatusText.innerText  = m3uTextOverride ? 'Dosya okunuyor...' : 'Playlist indiriliyor...';
        syncProgressFill.style.width = '10%';
        syncPercentText.innerText = '%10';

        try {
            let m3uText;
            if (m3uTextOverride) {
                m3uText = m3uTextOverride;
            } else {
                m3uText = await apiClient.proxyM3u(profile.m3u_url);
            }
            syncProgressFill.style.width = '30%';
            syncPercentText.innerText = '%30';
            syncStatusText.innerText = 'Kategorize ediliyor...';

            const worker = new Worker(new URL('../workers/parse-worker.js', import.meta.url), { type: 'module' });

            worker.onmessage = async (e) => {
                if (e.data.type === 'progress') {
                    const p = Math.floor(30 + e.data.percent * 0.4);
                    syncProgressFill.style.width = `${p}%`;
                    syncPercentText.innerText = `%${p}`;
                    syncStatusText.innerText = `%${e.data.percent} parse edildi...`;
                } else if (e.data.type === 'done') {
                    syncStatusText.innerText = 'Cihaza kaydediliyor...';
                    syncProgressFill.style.width = '75%';
                    syncPercentText.innerText = '%75';
                    try {
                        const channels = e.data.channels;
                        await channelDB.saveChannels(profile.id, channels, (pct) => {
                            const s = Math.floor(75 + pct * 0.2);
                            syncProgressFill.style.width = `${s}%`;
                            syncPercentText.innerText = `%${s}`;
                        });
                        syncStatusText.innerText = 'Profil güncelleniyor...';
                        syncProgressFill.style.width = '97%';
                        syncPercentText.innerText = '%97';
                        try { await apiClient.updateSourceChannelCount(profile.id, channels.length); } catch {}
                        syncProgressFill.style.width = '100%';
                        syncPercentText.innerText = '%100';
                        syncStatusText.innerText = 'Tamamlandı! ✓';
                        setTimeout(() => {
                            localStorage.setItem('iptv_active_source_id', profile.id);
                            localStorage.removeItem('iptv_active_xtream_profile');
                            syncModal.style.display = 'none';
                            window.location.hash = '#/home';
                        }, 500);
                    } catch(err) {
                        alert('Kayıt hatası: ' + err.message);
                        syncModal.style.display = 'none';
                    }
                } else if (e.data.type === 'error') {
                    alert('Parse hatası: ' + e.data.message);
                    syncModal.style.display = 'none';
                }
            };

            worker.postMessage({ text: m3uText });
        } catch (err) {
            alert('İndirme hatası: ' + err.message);
            syncModal.style.display = 'none';
        }
    }

    // ──── Modal ─────────────────────────────────────────────────────────────

    function switchTab(tab) {
        activeTab = tab;
        if (tab === 'm3u') {
            tabM3u.style.background = '#E50914';
            tabM3u.style.color = '#fff';
            tabXtream.style.background = 'transparent';
            tabXtream.style.color = '#888';
            panelM3u.style.display = 'block';
            panelXtream.style.display = 'none';
            saveProfileBtn.style.background = '#E50914';
        } else {
            tabXtream.style.background = '#ffc107';
            tabXtream.style.color = '#000';
            tabM3u.style.background = 'transparent';
            tabM3u.style.color = '#888';
            panelXtream.style.display = 'block';
            panelM3u.style.display = 'none';
            saveProfileBtn.style.background = '#ffc107';
            saveProfileBtn.style.color = '#000';
        }
    }

    tabM3u.addEventListener('click', () => {
        switchTab('m3u');
        saveProfileBtn.style.color = '#fff';
    });
    tabXtream.addEventListener('click', () => switchTab('xtream'));

    function openAddModal() {
        addModal.style.display = 'flex';
        setTimeout(() => {
            addModal.style.opacity = '1';
            addModal.querySelector('.modal-card').style.transform = 'scale(1)';
        }, 10);
        // Reset
        newNameInput.value = '';
        newUrlInput.value = '';
        newFileInput.value = '';
        xtreamServer.value = '';
        xtreamUser.value = '';
        xtreamPass.value = '';
        selectedFileContent = null;
        fileDropLabel.textContent = 'Dosyayı sürükleyin veya tıklayın';
        fileDropLabel.style.color = '#555';
        fileDropZone.style.borderColor = '#333';
        sourceInfoBox.style.display = 'none';
        xtreamStatus.style.display = 'none';
        switchTab('m3u');
        saveProfileBtn.style.color = '#fff';
        newNameInput.focus();
    }

    function closeAddModal() {
        addModal.style.opacity = '0';
        addModal.querySelector('.modal-card').style.transform = 'scale(0.9)';
        setTimeout(() => { addModal.style.display = 'none'; }, 300);
    }

    cancelAddBtn.addEventListener('click', closeAddModal);

    // Dosya seçimi
    fileDropZone.addEventListener('click', () => newFileInput.click());
    newFileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) readM3UFile(file);
    });
    fileDropZone.addEventListener('dragover', e => { e.preventDefault(); fileDropZone.classList.add('dragover'); });
    fileDropZone.addEventListener('dragleave', () => fileDropZone.classList.remove('dragover'));
    fileDropZone.addEventListener('drop', e => {
        e.preventDefault();
        fileDropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) readM3UFile(file);
    });

    function readM3UFile(file) {
        const reader = new FileReader();
        reader.onload = e => {
            selectedFileContent = e.target.result;
            fileDropLabel.textContent = `✓ ${file.name} (${(file.size/1024).toFixed(0)} KB)`;
            fileDropLabel.style.color = '#4caf50';
            fileDropZone.style.borderColor = '#4caf50';
            updateInfoBox();
        };
        reader.onerror = () => alert('Dosya okunamadı.');
        reader.readAsText(file, 'UTF-8');
    }

    function updateInfoBox() {
        const hasUrl  = newUrlInput.value.trim().length > 0;
        const hasFile = !!selectedFileContent;
        if (hasFile && hasUrl) {
            sourceInfoBox.style.display = 'block';
            sourceInfoBox.innerHTML = '📁 <b>Dosyadan yüklenecek.</b> Link saklanacak — sonraki oturumda linkten güncellenir.';
        } else if (hasFile) {
            sourceInfoBox.style.display = 'block';
            sourceInfoBox.innerHTML = '📁 <b>Sadece dosyadan yüklenecek.</b> Link girilmedi, otomatik güncelleme yapılmaz.';
        } else {
            sourceInfoBox.style.display = 'none';
        }
    }
    newUrlInput.addEventListener('input', updateInfoBox);

    // ──── Xtream Bağlantı Testi ──────────────────────────────────────────────

    xtreamVerifyBtn.addEventListener('click', async () => {
        const srv  = xtreamServer.value.trim();
        const usr  = xtreamUser.value.trim();
        const pwd  = xtreamPass.value.trim();

        if (!srv || !usr || !pwd) {
            showXtreamStatus('Lütfen sunucu, kullanıcı adı ve şifreyi doldurun.', 'error');
            return;
        }

        // Sunucu URL ve Port doğrulaması
        try {
            const urlObj = new URL(srv);
            if (urlObj.port) {
                const port = parseInt(urlObj.port, 10);
                if (isNaN(port) || port < 1 || port > 65535) {
                    showXtreamStatus('❌ Geçersiz port numarası! Port 1 ile 65535 arasında olmalıdır.', 'error');
                    return;
                }
            }
        } catch (e) {
            showXtreamStatus('❌ Geçersiz sunucu adresi! Lütfen geçerli bir URL girin (örn: http://sadeturk.com:8080)', 'error');
            return;
        }

        xtreamVerifyBtn.disabled = true;
        xtreamVerifyBtn.textContent = '⏳ Test ediliyor...';
        xtreamStatus.style.display = 'none';

        try {
            const info = await xtreamAPI.verify(srv, usr, pwd);
            const userInfo = info?.user_info;
            if (userInfo) {
                const expDate  = userInfo.exp_date
                    ? new Date(parseInt(userInfo.exp_date) * 1000).toLocaleDateString('tr-TR')
                    : 'Sınırsız';
                const maxConns = userInfo.max_connections || '?';
                showXtreamStatus(`✅ Bağlantı başarılı! Bitiş: ${expDate} · Maks bağlantı: ${maxConns}`, 'success');
                // Profil adını otomatik doldur (boşsa)
                if (!newNameInput.value.trim()) {
                    newNameInput.value = userInfo.username || srv.replace(/https?:\/\//, '').split(':')[0];
                }
            } else {
                showXtreamStatus('⚠️ Sunucu yanıt verdi ancak kullanıcı bilgisi alınamadı.', 'warn');
            }
        } catch (err) {
            showXtreamStatus(`❌ Bağlantı başarısız: ${err.message}`, 'error');
        } finally {
            xtreamVerifyBtn.disabled = false;
            xtreamVerifyBtn.textContent = '🔍 Bağlantıyı Test Et';
        }
    });

    function showXtreamStatus(msg, type) {
        const colors = {
            success: { bg: 'rgba(76,175,80,0.12)', border: 'rgba(76,175,80,0.3)', color: '#81c784' },
            error:   { bg: 'rgba(229,9,20,0.1)',   border: 'rgba(229,9,20,0.25)', color: '#e57373' },
            warn:    { bg: 'rgba(255,193,7,0.1)',   border: 'rgba(255,193,7,0.25)',color: '#ffc107' }
        };
        const c = colors[type] || colors.warn;
        xtreamStatus.style.cssText = `display:block;background:${c.bg};border:1px solid ${c.border};color:${c.color};padding:10px 14px;border-radius:5px;margin-bottom:14px;font-size:0.83rem;`;
        xtreamStatus.textContent = msg;
    }

    // URL'den Xtream bilgilerini ayıklayan yardımcı fonksiyon
    function parseXtreamFromM3uUrl(urlStr) {
        try {
            const url = new URL(urlStr);
            const username = url.searchParams.get('username') || url.searchParams.get('user');
            const password = url.searchParams.get('password') || url.searchParams.get('pass');
            if (username && password) {
                return {
                    server: url.origin,
                    username: username,
                    password: password
                };
            }
        } catch (e) {
            // Geçersiz URL
        }
        return null;
    }

    // ──── Kaydet ────────────────────────────────────────────────────────────

    saveProfileBtn.addEventListener('click', async () => {
        const name = newNameInput.value.trim();
        if (!name) { alert('Profil adı giriniz.'); return; }

        if (activeTab === 'xtream') {
            // ─ Xtream kaydet
            const srv = xtreamServer.value.trim();
            const usr = xtreamUser.value.trim();
            const pwd = xtreamPass.value.trim();
            if (!srv || !usr || !pwd) {
                alert('Sunucu, kullanıcı adı ve şifreyi eksiksiz doldurun.');
                return;
            }
            try {
                saveProfileBtn.disabled = true;
                saveProfileBtn.textContent = 'Ekleniyor...';
                const newProfile = await apiClient.addXtreamSource({ name, server: srv, username: usr, password: pwd });
                closeAddModal();
                await loadProfiles();
                // Xtream profili hemen aktif et ve yönlendir
                xtreamAPI.saveActiveXtreamProfile(newProfile);
                localStorage.setItem('iptv_active_source_id', newProfile.id);
                window.location.hash = '#/home';
            } catch (e) {
                alert('Xtream profil eklenemedi: ' + e.message);
            } finally {
                saveProfileBtn.disabled = false;
                saveProfileBtn.textContent = 'Kaydet';
                saveProfileBtn.style.color = '#000';
            }
        } else {
            // ─ M3U kaydet (ya da URL Xtream ise otomatik olarak Xtream kaydet)
            const url = newUrlInput.value.trim();
            const hasFile = !!selectedFileContent;
            if (!url && !hasFile) {
                alert('M3U linki girin veya dosya seçin.');
                return;
            }

            // Eğer girilen URL bir Xtream M3U linkiyse (username ve password içeriyorsa) otomatik dönüştür
            if (url && !hasFile) {
                const xtreamInfo = parseXtreamFromM3uUrl(url);
                if (xtreamInfo) {
                    console.log('M3U link is actually an Xtream server, saving as Xtream profile:', xtreamInfo);
                    try {
                        saveProfileBtn.disabled = true;
                        saveProfileBtn.textContent = 'Ekleniyor (Xtream)...';
                        const newProfile = await apiClient.addXtreamSource({
                            name,
                            server: xtreamInfo.server,
                            username: xtreamInfo.username,
                            password: xtreamInfo.password
                        });
                        closeAddModal();
                        await loadProfiles();
                        // Xtream profili hemen aktif et ve yönlendir
                        xtreamAPI.saveActiveXtreamProfile(newProfile);
                        localStorage.setItem('iptv_active_source_id', newProfile.id);
                        window.location.hash = '#/home';
                        return;
                    } catch (e) {
                        console.warn('Xtream olarak ekleme başarısız oldu, normal M3U olarak denenecek...', e);
                    } finally {
                        saveProfileBtn.disabled = false;
                        saveProfileBtn.textContent = 'Kaydet';
                    }
                }
            }

            try {
                saveProfileBtn.disabled = true;
                saveProfileBtn.textContent = 'Ekleniyor...';
                const newProfile = await apiClient.addSource({ name, m3u_url: url || null });
                closeAddModal();
                if (hasFile) {
                    await startSync(newProfile, selectedFileContent);
                } else {
                    await startSync(newProfile, null);
                }
            } catch (e) {
                alert('Profil eklenemedi: ' + e.message);
            } finally {
                saveProfileBtn.disabled = false;
                saveProfileBtn.textContent = 'Kaydet';
                saveProfileBtn.style.color = '#fff';
            }
        }
    });

    await loadProfiles();
}
