import { apiClient } from '../services/api-client.js';

export async function renderProfiles() {
    const container = document.getElementById('app');
    
    // Set basic styling for profiles page
    container.innerHTML = `
        <div class="profiles-wrapper" style="min-height: 100vh; background-color: #141414; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 40px 20px; font-family: 'Inter', 'Outfit', sans-serif; color: white;">
            <div id="profiles-main-content" style="text-align: center; width: 100%; max-width: 800px; animation: fadeIn 0.4s ease-out;">
                <h1 style="font-size: 2.8rem; font-weight: 700; margin-bottom: 40px; letter-spacing: 1px;">Kim izliyor?</h1>
                
                <div id="profiles-list-container" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 30px; margin-bottom: 60px;">
                    <!-- Profiles will load here dynamically -->
                    <div style="padding: 40px;">
                        <div class="spinner" style="width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #E50914; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px auto;"></div>
                        <p style="color: #aaa; font-size: 14px;">Profiller yükleniyor...</p>
                    </div>
                </div>
                
                <button id="manage-btn" class="btn-manage" style="background: transparent; border: 1px solid #808080; color: #808080; padding: 10px 24px; font-size: 1.1rem; letter-spacing: 2px; cursor: pointer; transition: all 0.2s ease; border-radius: 2px;">
                    PROFİLLERİ YÖNET
                </button>
            </div>
            
            <!-- Sleek Modern Add Profile Modal -->
            <div id="add-profile-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 2000; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease;">
                <div class="modal-card" style="background: #181818; padding: 40px; border-radius: 8px; width: 90%; max-width: 500px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #2f2f2f; transform: scale(0.9); transition: transform 0.3s ease;">
                    <h2 style="font-size: 2rem; font-weight: 700; margin-bottom: 20px; color: #fff;">Profil Ekle</h2>
                    <p style="color: #aaa; font-size: 0.95rem; margin-bottom: 25px;">Yeni bir IPTV M3U listesi ekleyerek yeni bir profil oluşturun.</p>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; color: #8c8c8c; font-size: 0.85rem; margin-bottom: 8px; font-weight: 600;">PROFİL ADI</label>
                        <input type="text" id="new-profile-name" placeholder="örn: Babamın Odası, Dizi Listesi" style="width: 100%; padding: 14px; background: #333; border: none; border-radius: 4px; color: white; font-size: 1rem; outline: none; box-sizing: border-box;" />
                    </div>
                    
                    <div style="margin-bottom: 30px;">
                        <label style="display: block; color: #8c8c8c; font-size: 0.85rem; margin-bottom: 8px; font-weight: 600;">M3U LINK URL</label>
                        <input type="text" id="new-profile-url" placeholder="https://site.com/playlist.m3u" style="width: 100%; padding: 14px; background: #333; border: none; border-radius: 4px; color: white; font-size: 1rem; outline: none; box-sizing: border-box;" />
                    </div>
                    
                    <div style="display: flex; gap: 15px; justify-content: flex-end;">
                        <button id="cancel-add-btn" style="background: transparent; border: 1px solid #555; color: #fff; padding: 12px 24px; font-weight: 600; cursor: pointer; border-radius: 4px; transition: all 0.2s;">İptal</button>
                        <button id="save-profile-btn" style="background: #E50914; border: none; color: #fff; padding: 12px 28px; font-weight: 700; cursor: pointer; border-radius: 4px; transition: all 0.2s;">Kaydet</button>
                    </div>
                </div>
            </div>

            <!-- Sync Loader Modal -->
            <div id="sync-loader-modal" style="display: none; position: fixed; inset: 0; background: #141414; z-index: 3000; align-items: center; justify-content: center; flex-direction: column; text-align: center; padding: 20px;">
                <div style="max-width: 450px; width: 100%;">
                    <div class="netflix-spinner" style="position: relative; width: 80px; height: 80px; margin: 0 auto 30px auto;">
                        <div style="box-sizing: border-box; display: block; position: absolute; width: 80px; height: 80px; border: 6px solid transparent; border-top-color: #E50914; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                        <div style="box-sizing: border-box; display: block; position: absolute; width: 80px; height: 80px; border: 6px solid transparent; border-bottom-color: rgba(229, 9, 20, 0.2); border-radius: 50%;"></div>
                    </div>
                    
                    <h2 id="sync-profile-name" style="font-size: 1.8rem; font-weight: 700; margin-bottom: 10px;">Profil Hazırlanıyor</h2>
                    <p id="sync-status-text" style="color: #aaa; font-size: 1rem; margin-bottom: 30px;">Kanal listesi indiriliyor...</p>
                    
                    <div class="progress-bar-container" style="background: #333; height: 4px; width: 100%; border-radius: 2px; overflow: hidden; margin-bottom: 12px;">
                        <div id="sync-progress-fill" style="background: #E50914; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                    </div>
                    <p id="sync-percent-text" style="font-weight: bold; color: #E50914; font-size: 1.1rem; margin: 0;">%0</p>
                </div>
            </div>
        </div>
        
        <style>
            @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes spin { to { transform: rotate(360deg); } }
            
            .btn-manage:hover {
                border-color: white !important;
                color: white !important;
                background: rgba(255,255,255,0.05);
            }
            .profile-avatar-box:hover {
                transform: scale(1.05);
            }
            .profile-avatar-box:hover .avatar-img {
                border-color: #e50914 !important;
            }
            .profile-avatar-box:hover .profile-label {
                color: white !important;
            }
        </style>
    `;
    
    // Elements references
    const listContainer = document.getElementById('profiles-list-container');
    const manageBtn = document.getElementById('manage-btn');
    
    const addModal = document.getElementById('add-profile-modal');
    const newNameInput = document.getElementById('new-profile-name');
    const newUrlInput = document.getElementById('new-profile-url');
    const cancelAddBtn = document.getElementById('cancel-add-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    
    const syncModal = document.getElementById('sync-loader-modal');
    const syncProfileName = document.getElementById('sync-profile-name');
    const syncStatusText = document.getElementById('sync-status-text');
    const syncProgressFill = document.getElementById('sync-progress-fill');
    const syncPercentText = document.getElementById('sync-percent-text');

    let isManageMode = false;
    let profiles = [];
    
    // Beautiful default gradients for avatars
    const avatarGradients = [
        'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)',
        'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)',
        'linear-gradient(135deg, #F3F9A7 0%, #CAC531 100%)',
        'linear-gradient(135deg, #e52d27 0%, #b31217 100%)',
        'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)'
    ];

    // Load and render all profiles
    async function loadProfiles() {
        try {
            profiles = await apiClient.getSources();
            renderList();
        } catch (e) {
            console.error(e);
            profiles = [];
            renderList();
            
            // Show a non-blocking elegant warning box at the top of the profiles list
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = 'color: #ffc107; background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.2); padding: 12px 20px; border-radius: 4px; font-size: 0.95rem; margin-bottom: 30px; width: 100%; text-align: center; box-sizing: border-box;';
            errorMsg.innerText = `Sistem varsayılan profilleri yükleyemedi. Ancak yine de '+' tuşuna basarak kendi profilinizi ekleyebilirsiniz!`;
            
            const mainContent = document.getElementById('profiles-main-content');
            const listContainer = document.getElementById('profiles-list-container');
            if (mainContent && listContainer) {
                mainContent.insertBefore(errorMsg, listContainer);
            }
        }
    }

    function renderList() {
        listContainer.innerHTML = '';
        
        profiles.forEach((p, index) => {
            const initial = p.name.substring(0, 2).toUpperCase();
            const grad = avatarGradients[index % avatarGradients.length];
            
            const card = document.createElement('div');
            card.className = 'profile-avatar-box';
            card.style.cssText = 'width: 140px; cursor: pointer; text-align: center; transition: all 0.3s ease;';
            
            card.innerHTML = `
                <div style="position: relative; width: 130px; height: 130px; margin: 0 auto 15px auto;">
                    <div class="avatar-img" style="width: 100%; height: 100%; border-radius: 4px; background: ${grad}; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: 800; border: 3px solid transparent; transition: border-color 0.2s; box-sizing: border-box; color: white;">
                        ${initial}
                    </div>
                    
                    ${isManageMode ? `
                        <div class="delete-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; border-radius: 4px;">
                            <span class="material-icons" style="font-size: 42px; color: #fff; text-shadow: 0 0 10px rgba(0,0,0,0.5);">delete_forever</span>
                        </div>
                    ` : ''}
                </div>
                <div class="profile-label" style="font-size: 1.05rem; color: #aaa; transition: color 0.2s; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 5px;">
                    ${p.name}
                </div>
                <div style="font-size: 0.8rem; color: #666; margin-top: 4px;">
                    ${p.channel_count > 0 ? `${p.channel_count} Kanal` : 'Eşleşmedi'}
                </div>
            `;
            
            card.addEventListener('click', () => {
                if (isManageMode) {
                    confirmDelete(p);
                } else {
                    selectProfile(p);
                }
            });
            
            listContainer.appendChild(card);
        });

        // Add Profile Card
        const addCard = document.createElement('div');
        addCard.style.cssText = 'width: 140px; cursor: pointer; text-align: center; transition: all 0.3s ease;';
        addCard.className = 'profile-avatar-box';
        
        addCard.innerHTML = `
            <div class="avatar-img" style="width: 130px; height: 130px; margin: 0 auto 15px auto; border-radius: 4px; background: transparent; border: 3px dashed #333; display: flex; align-items: center; justify-content: center; color: #333; font-size: 4rem; font-weight: 200; box-sizing: border-box; transition: all 0.2s;" onmouseover="this.style.borderColor='#888'; this.style.color='#888'" onmouseout="this.style.borderColor='#333'; this.style.color='#333'">
                +
            </div>
            <div style="font-size: 1.05rem; color: #555; transition: color 0.2s;">Profil Ekle</div>
        `;
        
        addCard.addEventListener('click', openAddModal);
        listContainer.appendChild(addCard);
    }

    // Toggle Manage Profiles Mode
    manageBtn.addEventListener('click', () => {
        isManageMode = !isManageMode;
        manageBtn.innerText = isManageMode ? 'TAMAM' : 'PROFİLLERİ YÖNET';
        manageBtn.style.color = isManageMode ? 'white' : '#808080';
        manageBtn.style.borderColor = isManageMode ? 'white' : '#808080';
        renderList();
    });

    // Delete Profile confirmation
    async function confirmDelete(profile) {
        if (profile.name === 'Free-TV IPTV' || profile.name === 'Global IPTV') {
            alert('Varsayılan profiller silinemez.');
            return;
        }
        
        const confirmResult = confirm(`"${profile.name}" profilini silmek istediğinize emin misiniz?\n\nBu profile ait tüm kanallar veritabanından kalıcı olarak temizlenecektir!`);
        if (!confirmResult) return;

        try {
            await apiClient.deleteSource(profile.id);
            // If the deleted profile was active, clear active profile
            if (localStorage.getItem('iptv_active_source_id') == profile.id) {
                localStorage.removeItem('iptv_active_source_id');
                apiClient.store.activeSource = null;
            }
            await loadProfiles();
        } catch (e) {
            alert('Silme işlemi başarısız: ' + e.message);
        }
    }

    // Select Profile Flow
    async function selectProfile(profile) {
        if (profile.channel_count > 0) {
            // Already synced, activate directly
            localStorage.setItem('iptv_active_source_id', profile.id);
            apiClient.store.activeSource = profile;
            window.location.hash = '#/home';
        } else {
            // Need to synchronize for the first time
            startSync(profile);
        }
    }

    // Trigger Dynamic Client-Side Sync
    async function startSync(profile) {
        syncModal.style.display = 'flex';
        syncProfileName.innerText = profile.name;
        syncStatusText.innerText = "Playlist indiriliyor...";
        syncProgressFill.style.width = '10%';
        syncPercentText.innerText = '%10';

        try {
            // Fetch M3U text through proxy
            const m3uText = await apiClient.proxyM3u(profile.m3u_url);
            
            syncStatusText.innerText = "Kategorize ediliyor...";
            syncProgressFill.style.width = '30%';
            syncPercentText.innerText = '%30';

            // Web worker for parsing
            const worker = new Worker(new URL('../workers/parse-worker.js', import.meta.url), { type: 'module' });
            
            worker.onmessage = async (e) => {
                if (e.data.type === 'progress') {
                    // map progress 30% -> 90%
                    const mappedProgress = Math.floor(30 + (e.data.percent * 0.6));
                    syncProgressFill.style.width = `${mappedProgress}%`;
                    syncPercentText.innerText = `%${mappedProgress}`;
                    syncStatusText.innerText = `%${e.data.percent} parse edildi...`;
                } else if (e.data.type === 'done') {
                    syncStatusText.innerText = "Sunucuya kaydediliyor... (Lütfen bekleyin)";
                    syncProgressFill.style.width = '95%';
                    syncPercentText.innerText = '%95';
                    
                    try {
                        await apiClient.syncChannels({
                            sourceId: profile.id,
                            m3u_url: profile.m3u_url,
                            channels: e.data.channels
                        });
                        
                        syncProgressFill.style.width = '100%';
                        syncPercentText.innerText = '%100';
                        syncStatusText.innerText = "Tamamlandı!";
                        
                        setTimeout(() => {
                            localStorage.setItem('iptv_active_source_id', profile.id);
                            apiClient.store.activeSource = profile;
                            syncModal.style.display = 'none';
                            window.location.hash = '#/home';
                        }, 500);
                        
                    } catch(err) {
                        alert("Veritabanı senkronizasyon hatası: " + err.message);
                        syncModal.style.display = 'none';
                    }
                } else if (e.data.type === 'error') {
                    alert('Parse hatası: ' + e.data.message);
                    syncModal.style.display = 'none';
                }
            };

            worker.postMessage({ text: m3uText });
            
        } catch (err) {
            alert('Kanallar indirilemedi veya bağlantı hatası: ' + err.message);
            syncModal.style.display = 'none';
        }
    }

    // Modal Add Profile handlers
    function openAddModal() {
        addModal.style.display = 'flex';
        setTimeout(() => {
            addModal.style.opacity = '1';
            addModal.querySelector('.modal-card').style.transform = 'scale(1)';
        }, 10);
        newNameInput.value = '';
        newUrlInput.value = '';
        newNameInput.focus();
    }

    function closeAddModal() {
        addModal.style.opacity = '0';
        addModal.querySelector('.modal-card').style.transform = 'scale(0.9)';
        setTimeout(() => {
            addModal.style.display = 'none';
        }, 300);
    }

    cancelAddBtn.addEventListener('click', closeAddModal);
    
    // Save custom profile
    saveProfileBtn.addEventListener('click', async () => {
        const name = newNameInput.value.trim();
        const url = newUrlInput.value.trim();
        
        if (!name || !url) {
            alert('Lütfen profil adı ve M3U url adresini doldurun.');
            return;
        }

        try {
            saveProfileBtn.disabled = true;
            saveProfileBtn.innerText = 'Ekleniyor...';
            
            await apiClient.addSource({ name, m3u_url: url });
            
            closeAddModal();
            await loadProfiles();
        } catch (e) {
            alert('Profil eklenemedi: ' + e.message);
        } finally {
            saveProfileBtn.disabled = false;
            saveProfileBtn.innerText = 'Kaydet';
        }
    });

    // Start fetching
    await loadProfiles();
}
