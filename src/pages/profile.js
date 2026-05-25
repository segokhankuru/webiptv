import { apiClient } from '../services/api-client.js';

export async function renderProfile() {
    const container = document.getElementById('app');
    
    // Auth Check
    if (!apiClient.store.user) {
        window.location.hash = '#/login';
        return;
    }

    const user = apiClient.store.user;

    // We'll fetch the fresh user info directly to ensure expiry dates are correct
    let freshUser;
    try {
        freshUser = await apiClient.getMe();
    } catch(e) {
        return;
    }

    const isPremium = freshUser.subscription_type === 'premium';
    const expiryText = freshUser.subscription_expires_at 
        ? new Date(freshUser.subscription_expires_at).toLocaleDateString() 
        : 'Süresiz';

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

    const renderNavbar = () => `
        <nav class="netflix-navbar" id="navbar" style="position: relative; background: var(--navbar-scrolled);">
            <h1 class="logo" onclick="window.location.hash='#/home'" style="cursor: pointer;">WebIPTV <span class="badge">PRO</span></h1>
            <div class="nav-links">
                <a href="#/home">Ana Sayfa</a>
                <a href="#/search">Arama</a>
                <a href="#/favorites">Favoriler</a>
                <a href="#/profiles" style="color: #FFC107; font-weight: 600;">Profil Değiştir</a>
                ${freshUser.role === 'admin' ? '<a href="#/admin" style="color: #E50914; font-weight: bold;">Admin Paneli</a>' : ''}
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
    `;

    container.innerHTML = `
        <div style="background: var(--bg-color); min-height: 100vh; color: var(--text-primary);">
            ${renderNavbar()}
            
            <div style="max-width: 800px; margin: 40px auto; padding: 0 20px;">
                <h1 style="font-size: 32px; margin-bottom: 30px;">Hesap Ayarları</h1>
                
                <div style="display: flex; gap: 30px; margin-bottom: 40px; flex-wrap: wrap;">
                    
                    <!-- Profile Info -->
                    <div style="flex: 1; min-width: 300px; background: var(--surface-color); padding: 30px; border-radius: 12px; border: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 25px;">
                            <img src="https://ui-avatars.com/api/?name=${freshUser.username}&background=e50914&color=fff&size=80" style="border-radius: 50%;" alt="Avatar">
                            <div>
                                <h2 style="margin: 0; font-size: 24px;">${freshUser.display_name || freshUser.username}</h2>
                                <p style="margin: 5px 0 0 0; color: var(--text-secondary);">${freshUser.email}</p>
                            </div>
                        </div>
                        
                        <div style="margin-top: 30px;">
                            <h3 style="font-size: 16px; color: var(--text-secondary); margin-bottom: 15px;">Tema Tercihi</h3>
                            <select id="theme-select" style="width: 100%; padding: 12px; background: var(--input-bg); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 6px; outline: none; cursor: pointer;">
                                <option value="dark"   ${freshUser.theme === 'dark'   || !freshUser.theme ? 'selected' : ''}>🌑 Koyu (Varsayılan)</option>
                                <option value="light"  ${freshUser.theme === 'light'  ? 'selected' : ''}>☀️ Açık Tema</option>
                                <option value="amoled" ${freshUser.theme === 'amoled' ? 'selected' : ''}>⬛ AMOLED (Saf Siyah)</option>
                                <option value="ocean"  ${freshUser.theme === 'ocean'  ? 'selected' : ''}>🌊 Okyanus (Mavi)</option>
                                <option value="forest" ${freshUser.theme === 'forest' ? 'selected' : ''}>🌲 Orman (Yeşil)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Subscription Info -->
                    <div style="flex: 1; min-width: 300px; background: var(--surface-color); padding: 30px; border-radius: 12px; border: 1px solid var(--border-color); position: relative; overflow: hidden;">
                        ${isPremium 
                            ? `<div style="position: absolute; top: 0; right: 0; background: #FFC107; color: black; font-weight: bold; padding: 5px 30px; font-size: 12px; transform: rotate(45deg) translate(25px, -15px);">PREMIUM</div>`
                            : ''
                        }
                        
                        <h2 style="margin: 0 0 20px 0; font-size: 20px;">Abonelik Durumu</h2>
                        
                        <div style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; border: 1px solid ${isPremium ? 'var(--accent-color)' : 'var(--border-color)'}; text-align: center;">
                            <h3 style="margin: 0 0 10px 0; color: ${isPremium ? 'var(--accent-color)' : 'var(--text-primary)'}; font-size: 24px;">
                                ${isPremium ? 'Premium Plan' : 'Ücretsiz Plan'}
                            </h3>
                            <p style="color: var(--text-secondary); margin: 0; font-size: 14px;">
                                ${isPremium ? `Bitiş Tarihi: <strong>${expiryText}</strong>` : 'Reklamı standart erişim.'}
                            </p>
                        </div>

                        ${!isPremium ? `
                            <div style="margin-top: 25px; text-align: center;">
                                <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 15px;">Premium plan ile 5 saniyelik zorunlu reklamları kaldırın ve sınırsız izleme deneyiminin keyfini çıkarın.</p>
                                <button id="upgrade-btn" style="width: 100%; padding: 14px; background: var(--accent-color); color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; transition: 0.2s;">
                                    Premium'a Geç (99 TL/Ay)
                                </button>
                            </div>
                        ` : `
                            <div style="margin-top: 25px; text-align: center;">
                                <button disabled style="width: 100%; padding: 14px; background: #333; color: #888; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: not-allowed;">
                                    Aboneliğiniz Aktif
                                </button>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Theme Change Handler
    document.getElementById('theme-select').addEventListener('change', async (e) => {
        try {
            await apiClient.request('/user/theme', {
                method: 'POST',
                body: JSON.stringify({ theme: e.target.value })
            });
            apiClient.store.user.theme = e.target.value;
            document.documentElement.setAttribute('data-theme', e.target.value);
        } catch(err) {
            alert('Tema güncellenemedi: ' + err.message);
        }
    });

    // Upgrade Handler
    const upgradeBtn = document.getElementById('upgrade-btn');
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', async () => {
            const confirmPurchase = confirm('Demo Ödeme Ekranı\\n\\nKredi kartınızdan 99.99 TL çekilecektir. Onaylıyor musunuz?');
            if (!confirmPurchase) return;

            upgradeBtn.disabled = true;
            upgradeBtn.innerText = 'İşleniyor...';

            try {
                await apiClient.request('/user/subscribe', {
                    method: 'POST',
                    body: JSON.stringify({ plan: 'premium', durationDays: 30 })
                });
                alert('Tebrikler! Premium aboneliğiniz başarıyla aktifleştirildi.');
                window.location.reload(); // Reload to show Premium UI
            } catch(err) {
                alert('Abonelik başlatılamadı: ' + err.message);
                upgradeBtn.disabled = false;
                upgradeBtn.innerText = "Premium'a Geç (99 TL/Ay)";
            }
        });
    }
}
