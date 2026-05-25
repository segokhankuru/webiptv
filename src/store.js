export const store = {
    user: null,
    token: localStorage.getItem('iptv_token') || null,
    activeSource: null,
    
    setToken(token) {
        this.token = token;
        localStorage.setItem('iptv_token', token);
    },
    
    logout() {
        this.user = null;
        this.token = null;
        localStorage.removeItem('iptv_token');
        window.location.hash = '#/login';
    }
};
