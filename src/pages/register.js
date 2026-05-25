import { apiClient } from '../services/api-client.js';

export function renderRegister() {
    const container = document.getElementById('app');
    container.innerHTML = `
        <div class="login-container">
            <div class="login-box">
                <h2>Kayıt Ol</h2>
                <p>Yeni bir WebIPTV PRO hesabı oluşturun</p>
                <form id="register-form">
                    <div class="input-group">
                        <input type="text" id="username" placeholder="Kullanıcı Adı" required />
                    </div>
                    <div class="input-group">
                        <input type="email" id="email" placeholder="E-posta Adresi" required />
                    </div>
                    <div class="input-group">
                        <input type="password" id="password" placeholder="Şifre" required />
                    </div>
                    <button type="submit" class="btn btn-primary" id="register-btn">Kayıt Ol</button>
                </form>
                <div style="margin-top: 20px; text-align: center; font-size: 13px;">
                    <a href="#/login" style="color: #aaa; text-decoration: none;">Zaten hesabınız var mı? Giriş Yap</a>
                </div>
            </div>
        </div>
    `;

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('username').value;
        const em = document.getElementById('email').value;
        const p = document.getElementById('password').value;
        const btn = document.getElementById('register-btn');
        
        btn.disabled = true;
        btn.innerText = 'Kayıt olunuyor...';

        try {
            await apiClient.register(u, em, p, u);
            alert('Kayıt başarılı! Lütfen giriş yapın.');
            window.location.hash = '#/login';
        } catch (err) {
            alert(err.message);
            btn.disabled = false;
            btn.innerText = 'Kayıt Ol';
        }
    });
}
