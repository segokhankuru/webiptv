import './styles/base.css';
import './styles/login.css';
import './styles/netflix.css';
import { initRouter } from './router.js';
import { apiClient } from './services/api-client.js';

async function bootstrap() {
    if (localStorage.getItem('iptv_token')) {
        try {
            const me = await apiClient.getMe();
            if (me && me.theme) {
                document.documentElement.setAttribute('data-theme', me.theme);
            }
        } catch(e) {
            console.warn('Geçersiz token, giriş sayfasına yönlendirilecek.');
        }
    }
    initRouter();
}

bootstrap();
