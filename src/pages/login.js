import { apiClient } from '../services/api-client.js';

export function renderLogin() {
    const container = document.getElementById('app');
    container.innerHTML = `
        <div class="login-container">
            <div class="login-box">
                <h2>Oturum Aç</h2>
                <p>WebIPTV PRO hesabınıza giriş yapın</p>
                <form id="login-form">
                    <div class="input-group">
                        <input type="text" id="username" placeholder="Kullanıcı Adı" required />
                    </div>
                    <div class="input-group">
                        <input type="password" id="password" placeholder="Şifre" required />
                    </div>
                    <button type="submit" class="btn btn-primary" id="login-btn">Giriş Yap</button>
                </form>
                <div style="margin-top: 20px; text-align: center; font-size: 13px;">
                    <a href="#/register" style="color: #aaa; text-decoration: none;">Hesabınız yok mu? Kayıt Ol</a>
                </div>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('username').value;
        const p = document.getElementById('password').value;
        const btn = document.getElementById('login-btn');
        
        btn.disabled = true;
        btn.innerText = 'Giriş yapılıyor...';

        try {
            await apiClient.login(u, p);
            window.location.hash = '#/profiles';
        } catch (err) {
            alert(err.message);
            btn.disabled = false;
            btn.innerText = 'Giriş Yap';
        }
    });
}
