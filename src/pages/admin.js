import { apiClient } from '../services/api-client.js';

export async function renderAdmin() {
    const container = document.getElementById('app');
    
    // Check if user is admin
    if (!apiClient.store.user || apiClient.store.user.role !== 'admin') {
        window.location.hash = '#/home';
        return;
    }

    container.innerHTML = `
        <div class="netflix-layout" style="display: flex; height: 100vh; overflow: hidden; background: #0a0a0a;">
            <!-- Sidebar -->
            <div style="width: 250px; background: #141414; border-right: 1px solid #333; padding: 20px; display: flex; flex-direction: column;">
                <h1 class="logo" style="margin-bottom: 40px; text-align: center;">WebIPTV <span class="badge" style="background: #E50914;">ADMIN</span></h1>
                
                <div style="display: flex; flex-direction: column; gap: 15px; flex: 1;">
                    <button class="admin-nav-btn active" data-tab="dashboard" style="background: var(--surface-hover); color: white; border: none; padding: 12px 15px; border-radius: 8px; text-align: left; cursor: pointer; font-size: 15px; font-weight: 500; transition: background 0.2s;">📊 Dashboard</button>
                    <button class="admin-nav-btn" data-tab="users" style="background: transparent; color: #aaa; border: none; padding: 12px 15px; border-radius: 8px; text-align: left; cursor: pointer; font-size: 15px; font-weight: 500; transition: background 0.2s;">👥 Kullanıcılar</button>
                    <button class="admin-nav-btn" data-tab="campaigns" style="background: transparent; color: #aaa; border: none; padding: 12px 15px; border-radius: 8px; text-align: left; cursor: pointer; font-size: 15px; font-weight: 500; transition: background 0.2s;">🎁 Kampanyalar</button>
                </div>
                
                <button onclick="window.location.hash='#/home'" style="background: #333; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 500; transition: background 0.2s;" onmouseover="this.style.background='#444'" onmouseout="this.style.background='#333'">❮ Ana Sayfaya Dön</button>
            </div>

            <!-- Main Content -->
            <div style="flex: 1; padding: 40px; overflow-y: auto;" id="admin-content">
                <h2 style="color: white; margin-bottom: 30px; font-size: 24px;">Yükleniyor...</h2>
            </div>
        </div>
    `;

    // Event listeners for tabs
    const buttons = document.querySelectorAll('.admin-nav-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            buttons.forEach(b => { b.style.background = 'transparent'; b.style.color = '#aaa'; b.classList.remove('active'); });
            e.target.style.background = 'var(--surface-hover)';
            e.target.style.color = 'white';
            e.target.classList.add('active');
            
            loadTab(e.target.dataset.tab);
        });
    });

    // Load initial tab
    loadTab('dashboard');
}

async function loadTab(tab) {
    const content = document.getElementById('admin-content');
    content.innerHTML = '<div style="text-align: center; margin-top: 50px;"><div style="width: 40px; height: 40px; border: 4px solid #333; border-top-color: var(--accent-color); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div></div>';

    try {
        if (tab === 'dashboard') {
            const stats = await apiClient.request('/admin/stats');
            content.innerHTML = `
                <h2 style="color: white; margin-bottom: 30px; font-size: 28px; font-weight: 800;">Genel Bakış</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
                    <div style="background: #1a1a1a; padding: 25px; border-radius: 12px; border: 1px solid #333; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                            <h3 style="color: #aaa; margin: 0; font-size: 15px; font-weight: 500;">Toplam Kullanıcı</h3>
                            <span style="background: rgba(33, 150, 243, 0.2); color: #2196F3; padding: 5px; border-radius: 6px;"><i class="material-icons" style="font-size: 20px;">people</i></span>
                        </div>
                        <p style="color: white; font-size: 36px; font-weight: 800; margin: 0;">${stats.usersCount}</p>
                    </div>
                    
                    <div style="background: #1a1a1a; padding: 25px; border-radius: 12px; border: 1px solid #333; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                            <h3 style="color: #aaa; margin: 0; font-size: 15px; font-weight: 500;">Aktif (Son 7 Gün)</h3>
                            <span style="background: rgba(76, 175, 80, 0.2); color: #4CAF50; padding: 5px; border-radius: 6px;"><i class="material-icons" style="font-size: 20px;">trending_up</i></span>
                        </div>
                        <p style="color: #4CAF50; font-size: 36px; font-weight: 800; margin: 0;">${stats.recentLogins}</p>
                    </div>
                    
                    <div style="background: #1a1a1a; padding: 25px; border-radius: 12px; border: 1px solid #333; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                            <h3 style="color: #aaa; margin: 0; font-size: 15px; font-weight: 500;">Toplam Kanal</h3>
                            <span style="background: rgba(229, 9, 20, 0.2); color: #E50914; padding: 5px; border-radius: 6px;"><i class="material-icons" style="font-size: 20px;">live_tv</i></span>
                        </div>
                        <p style="color: white; font-size: 36px; font-weight: 800; margin: 0;">${stats.channelsCount.toLocaleString()}</p>
                    </div>
                    
                    <div style="background: #1a1a1a; padding: 25px; border-radius: 12px; border: 1px solid #333; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                            <h3 style="color: #aaa; margin: 0; font-size: 15px; font-weight: 500;">Aktif Kampanya</h3>
                            <span style="background: rgba(255, 193, 7, 0.2); color: #FFC107; padding: 5px; border-radius: 6px;"><i class="material-icons" style="font-size: 20px;">card_giftcard</i></span>
                        </div>
                        <p style="color: white; font-size: 36px; font-weight: 800; margin: 0;">${stats.campaignsCount}</p>
                    </div>
                </div>
            `;
        } 
        else if (tab === 'users') {
            const users = await apiClient.request('/admin/users');
            let rows = '';
            users.forEach(u => {
                const date = new Date(u.created_at).toLocaleDateString();
                const lastLogin = u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Hiç girmedi';
                const statusBadge = u.is_active 
                    ? '<span style="background: rgba(76, 175, 80, 0.2); color: #4CAF50; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">Aktif</span>'
                    : '<span style="background: rgba(244, 67, 54, 0.2); color: #F44336; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">Banlı</span>';
                const roleBadge = u.role === 'admin'
                    ? '<span style="background: rgba(255, 193, 7, 0.2); color: #FFC107; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">Admin</span>'
                    : '<span style="background: rgba(33, 150, 243, 0.2); color: #2196F3; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">User</span>';

                rows += `
                    <tr style="border-bottom: 1px solid #2a2a2a; transition: background 0.2s;" onmouseover="this.style.background='#1f1f1f'" onmouseout="this.style.background='transparent'">
                        <td style="padding: 16px 15px; color: #888;">#${u.id}</td>
                        <td style="padding: 16px 15px; font-weight: 600; color: white;">${u.username}</td>
                        <td style="padding: 16px 15px; color: #aaa;">${u.email}</td>
                        <td style="padding: 16px 15px;">${roleBadge}</td>
                        <td style="padding: 16px 15px;">${statusBadge}</td>
                        <td style="padding: 16px 15px; color: #aaa; font-size: 13px;">${date}</td>
                        <td style="padding: 16px 15px; display: flex; gap: 8px;">
                            <button onclick="window.editUser(${u.id}, '${u.username}', '${u.email}', '${u.role}', ${u.is_active})" style="background: rgba(33, 150, 243, 0.1); color: #2196F3; border: 1px solid #2196F3; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; transition: all 0.2s;" onmouseover="this.style.background='#2196F3'; this.style.color='white'" onmouseout="this.style.background='rgba(33, 150, 243, 0.1)'; this.style.color='#2196F3'">
                                Düzenle
                            </button>
                            <button onclick="window.toggleUserStatus(${u.id}, ${u.is_active ? 0 : 1})" style="background: ${u.is_active ? 'rgba(244, 67, 54, 0.1)' : 'rgba(76, 175, 80, 0.1)'}; color: ${u.is_active ? '#F44336' : '#4CAF50'}; border: 1px solid ${u.is_active ? '#F44336' : '#4CAF50'}; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; transition: all 0.2s;" onmouseover="this.style.background='${u.is_active ? '#F44336' : '#4CAF50'}'; this.style.color='white'" onmouseout="this.style.background='${u.is_active ? 'rgba(244, 67, 54, 0.1)' : 'rgba(76, 175, 80, 0.1)'}'; this.style.color='${u.is_active ? '#F44336' : '#4CAF50'}'">
                                ${u.is_active ? 'Banla' : 'Ban Kaldır'}
                            </button>
                        </td>
                    </tr>
                `;
            });

            content.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                    <h2 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">Kullanıcı Yönetimi</h2>
                </div>
                <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead style="background: #222; border-bottom: 1px solid #333;">
                            <tr>
                                <th style="padding: 16px 15px; color: #aaa; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">ID</th>
                                <th style="padding: 16px 15px; color: #aaa; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Kullanıcı Adı</th>
                                <th style="padding: 16px 15px; color: #aaa; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">E-posta</th>
                                <th style="padding: 16px 15px; color: #aaa; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Yetki</th>
                                <th style="padding: 16px 15px; color: #aaa; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Durum</th>
                                <th style="padding: 16px 15px; color: #aaa; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Kayıt Tarihi</th>
                                <th style="padding: 16px 15px; color: #aaa; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">İşlem</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
        }
        else if (tab === 'campaigns') {
            content.innerHTML = `
                <h2 style="color: white; margin-bottom: 30px; font-size: 28px; font-weight: 800;">Kampanyalar</h2>
                <div style="background: #1a1a1a; border: 1px dashed #444; padding: 60px 40px; border-radius: 12px; text-align: center;">
                    <i class="material-icons" style="font-size: 48px; color: #666; margin-bottom: 15px;">construction</i>
                    <h3 style="color: #ddd; margin: 0 0 10px 0; font-size: 20px;">Yapım Aşamasında</h3>
                    <p style="color: #888; margin: 0; font-size: 15px;">Kampanya modülü henüz aktif değil. (Abonelik sistemi ile birlikte açılacak)</p>
                </div>
            `;
        }
    } catch(err) {
        content.innerHTML = `
            <div style="background: rgba(244, 67, 54, 0.1); border: 1px solid #F44336; padding: 20px; border-radius: 8px; color: #F44336;">
                <strong>Hata:</strong> ${err.message}
            </div>
        `;
    }
}

// Global action handler for user toggle
window.toggleUserStatus = async (id, newStatus) => {
    if (!confirm(newStatus ? 'Bu kullanıcının banını kaldırmak istediğinize emin misiniz?' : 'Bu kullanıcıyı banlamak istediğinize emin misiniz?')) return;
    
    try {
        await apiClient.request(`/admin/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ is_active: newStatus })
        });
        // Reload users tab directly by finding the active button
        const activeBtn = document.querySelector('.admin-nav-btn.active');
        if (activeBtn) loadTab(activeBtn.dataset.tab);
    } catch(e) {
        alert('İşlem başarısız: ' + e.message);
    }
};

window.editUser = (id, username, email, role, isActive) => {
    const modalHTML = `
        <div id="edit-user-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 9999;">
            <div style="background: #1a1a1a; padding: 35px; border-radius: 16px; width: 400px; border: 1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h3 style="color: white; margin-top: 0; font-size: 20px;">Kullanıcıyı Düzenle <span style="color: #666; font-size: 16px;">#${id}</span></h3>
                
                <div style="margin-bottom: 20px; margin-top: 25px;">
                    <label style="color: #aaa; font-size: 13px; font-weight: 500; display: block; margin-bottom: 8px;">Kullanıcı Adı</label>
                    <input type="text" id="edit-username" value="${username}" style="width: 100%; box-sizing: border-box; padding: 12px; background: #222; border: 1px solid #444; color: white; border-radius: 8px; outline: none; transition: border 0.2s;" onfocus="this.style.borderColor='#E50914'" onblur="this.style.borderColor='#444'">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="color: #aaa; font-size: 13px; font-weight: 500; display: block; margin-bottom: 8px;">E-posta Adresi</label>
                    <input type="email" id="edit-email" value="${email}" style="width: 100%; box-sizing: border-box; padding: 12px; background: #222; border: 1px solid #444; color: white; border-radius: 8px; outline: none; transition: border 0.2s;" onfocus="this.style.borderColor='#E50914'" onblur="this.style.borderColor='#444'">
                </div>
                
                <div style="margin-bottom: 25px;">
                    <label style="color: #aaa; font-size: 13px; font-weight: 500; display: block; margin-bottom: 8px;">Kullanıcı Yetkisi</label>
                    <select id="edit-role" style="width: 100%; box-sizing: border-box; padding: 12px; background: #222; border: 1px solid #444; color: white; border-radius: 8px; outline: none; cursor: pointer;">
                        <option value="user" ${role === 'user' ? 'selected' : ''}>Normal Kullanıcı (User)</option>
                        <option value="admin" ${role === 'admin' ? 'selected' : ''}>Yönetici (Admin)</option>
                    </select>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button onclick="document.getElementById('edit-user-modal').remove()" style="padding: 10px 20px; background: transparent; border: 1px solid #555; color: #ccc; border-radius: 8px; cursor: pointer; font-weight: 500; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">İptal</button>
                    <button onclick="window.saveUserEdit(${id}, ${isActive})" style="padding: 10px 20px; background: #E50914; border: none; color: white; border-radius: 8px; cursor: pointer; font-weight: bold; transition: background 0.2s;" onmouseover="this.style.background='#f40612'" onmouseout="this.style.background='#E50914'">Değişiklikleri Kaydet</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.saveUserEdit = async (id, isActive) => {
    const username = document.getElementById('edit-username').value;
    const email = document.getElementById('edit-email').value;
    const role = document.getElementById('edit-role').value;
    
    if (!username || !email) return alert('Kullanıcı adı ve e-posta boş bırakılamaz!');

    try {
        await apiClient.request('/admin/users/' + id, {
            method: 'PUT',
            body: JSON.stringify({ username, email, role, is_active: isActive })
        });
        document.getElementById('edit-user-modal').remove();
        const activeBtn = document.querySelector('.admin-nav-btn.active');
        if (activeBtn) loadTab(activeBtn.dataset.tab);
    } catch(e) {
        alert('Kaydetme hatası: ' + e.message);
    }
};
