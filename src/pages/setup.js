import { apiClient } from '../services/api-client.js';

export function renderSetup() {
    const container = document.getElementById('app');
    container.innerHTML = `
        <div class="login-container">
            <div class="login-box">
                <h2>IPTV Kaynağı Ekle</h2>
                <p>M3U Linkinizi Girerek Kurulumu Tamamlayın</p>
                <div class="input-group">
                    <input type="text" id="m3u-url" placeholder="http://sunucu.com/get.php?username=...&type=m3u_plus" />
                </div>
                <button id="connect-btn" class="btn btn-primary">Bağlan ve İndir</button>
                <div id="progress-container" style="display: none; margin-top: 20px;">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <p id="progress-text" style="margin-top: 10px; font-size: 14px; color: var(--text-secondary); text-align: center;">%0</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('connect-btn').addEventListener('click', async () => {
        const url = document.getElementById('m3u-url').value;
        if (!url) return alert('Lütfen bir M3U linki girin');

        const connectBtn = document.getElementById('connect-btn');
        const progressContainer = document.getElementById('progress-container');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');

        connectBtn.disabled = true;
        progressContainer.style.display = 'block';
        progressText.innerText = "İndiriliyor...";

        try {
            progressFill.style.width = '10%';
            progressText.innerText = "Dosya indiriliyor... (Lütfen bekleyin)";
            
            const m3uText = await apiClient.proxyM3u(url);
            
            progressFill.style.width = '30%';
            progressText.innerText = "Kategorize ediliyor...";
            
            const worker = new Worker(new URL('../workers/parse-worker.js', import.meta.url), { type: 'module' });
            
            worker.onmessage = async (e) => {
                if (e.data.type === 'progress') {
                    progressFill.style.width = `${e.data.percent}%`;
                    progressText.innerText = `%${e.data.percent} parse edildi`;
                } else if (e.data.type === 'done') {
                    progressText.innerText = "Veritabanına kaydediliyor... (Bu işlem birkaç saniye sürebilir)";
                    
                    try {
                        await apiClient.syncChannels({
                            m3u_url: url,
                            channels: e.data.channels
                        });
                        
                        // Update local store flag
                        apiClient.store.user.hasSource = true;
                        window.location.hash = '#/home';
                    } catch(err) {
                        alert("Veritabanı kaydı başarısız: " + err.message);
                        connectBtn.disabled = false;
                        progressContainer.style.display = 'none';
                    }
                } else if (e.data.type === 'error') {
                    alert('Parse hatası: ' + e.data.message);
                    connectBtn.disabled = false;
                    progressContainer.style.display = 'none';
                }
            };
            
            worker.postMessage({ text: m3uText });

        } catch (err) {
            alert('Bağlantı hatası: ' + err.message);
            connectBtn.disabled = false;
            progressContainer.style.display = 'none';
        }
    });
}
