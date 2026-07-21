import { apiClient } from '../services/api-client.js';
import { parseXtreamFromM3uUrl, xtreamAPI } from '../services/xtream-api.js';

export function renderSetup() {
    const container = document.getElementById('app');
    container.innerHTML = `
        <div class="login-container">
            <div class="login-box">
                <h2>IPTV Kaynağı Ekle</h2>
                <p>M3U Linkinizi Yapıştırarak Kurulumu Tamamlayın</p>
                <div class="input-group">
                    <input type="text" id="m3u-url" placeholder="http://sunucu.com:8080/get.php?username=...&password=..." />
                </div>
                <button id="connect-btn" class="btn btn-primary">Bağlan ve Başlat</button>
            </div>
        </div>
    `;

    document.getElementById('connect-btn').addEventListener('click', async () => {
        const url = document.getElementById('m3u-url').value.trim();
        if (!url) return alert('Lütfen bir M3U linki girin');

        const connectBtn = document.getElementById('connect-btn');
        connectBtn.disabled = true;
        connectBtn.innerText = "Doğrulanıyor...";

        const parsed = parseXtreamFromM3uUrl(url);
        if (parsed) {
            try {
                const newProfile = await apiClient.addXtreamSource({
                    name: 'IPTV Profilim',
                    server: parsed.server,
                    username: parsed.username,
                    password: parsed.password
                });
                xtreamAPI.saveActiveXtreamProfile(newProfile);
                localStorage.setItem('iptv_active_source_id', newProfile.id);
                if (apiClient.store?.user) {
                    apiClient.store.user.hasSource = true;
                }
                window.location.hash = '#/home';
            } catch(err) {
                alert('Xtream profili eklenemedi: ' + err.message);
                connectBtn.disabled = false;
                connectBtn.innerText = "Bağlan ve Başlat";
            }
        } else {
            alert('Girdiğiniz M3U linkinden Xtream kullanıcı bilgileri (kullanıcı adı ve şifre) okunamadı. Lütfen geçerli bir IPTV M3U linki yapıştırın.');
            connectBtn.disabled = false;
            connectBtn.innerText = "Bağlan ve Başlat";
        }
    });
}

