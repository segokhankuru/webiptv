# WebIPTV — Sistem Analizi

> Bu doküman projenin mimari yapısını, veri akışını ve dosya haritasını içerir.  
> Her değişiklikte güncellenmelidir.  
> **Son güncelleme:** 2026-05-26

---

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Vanilla JS (SPA), Vite, HLS.js |
| Backend | Node.js, Express |
| Veritabanı | Supabase PostgreSQL (sunucu), IndexedDB (client — kanallar) |
| Deploy | Vercel (serverless) |
| Auth | JWT (Bearer token) |

---

## Dizin Yapısı

```
iptv/
├── index.html                 # SPA giriş noktası
├── vite.config.js             # Vite yapılandırması
├── package.json
├── vercel.json                # Vercel routing kuralları
├── .env                       # DATABASE_URL, JWT_SECRET
│
├── src/                       # === CLIENT (Frontend) ===
│   ├── main.js                # Uygulama bootstrap, router init
│   ├── router.js              # Hash-based SPA router (#/home, #/player/123 vb.)
│   ├── store.js               # Global state (user, token, activeSource)
│   ├── services/
│   │   ├── api-client.js      # Sunucu API wrapper (fetch tabanlı)
│   │   └── channel-db.js      # [YENİ] IndexedDB wrapper — kanal CRUD
│   ├── pages/
│   │   ├── login.js           # Giriş sayfası
│   │   ├── register.js        # Kayıt sayfası
│   │   ├── profiles.js        # Profil seçim & yönetim (Netflix tarzı)
│   │   ├── home.js            # Ana sayfa — kategori slider'ları
│   │   ├── category.js        # Kategori detay — infinite scroll
│   │   ├── search.js          # Kanal arama overlay
│   │   ├── player.js          # Video oynatıcı (HLS.js, custom controls)
│   │   ├── favorites.js       # Favori kanallar
│   │   ├── profile.js         # Kullanıcı profili / ayarlar
│   │   ├── setup.js           # İlk kurulum
│   │   └── admin.js           # Admin paneli
│   ├── workers/
│   │   └── parse-worker.js    # M3U parser (Web Worker — arka plan thread)
│   └── styles/
│       └── (CSS dosyaları)
│
├── server/                    # === BACKEND (Express API) ===
│   ├── index.js               # Express sunucu bootstrap
│   ├── db.js                  # PostgreSQL bağlantı pool + migration'lar
│   ├── read-users.js          # (Yardımcı script)
│   ├── middleware/
│   │   └── auth.js            # JWT verifyToken middleware
│   └── routes/
│       ├── auth.js            # POST /login, /register, GET /me
│       ├── channels.js        # Kanal sync (sadeleştirilmiş — sadece count güncelleme)
│       ├── user.js            # Favoriler, izleme geçmişi, sources CRUD, tema, abonelik
│       ├── admin.js           # Admin işlemleri
│       └── proxy.js           # M3U proxy (CORS bypass)
│
├── api/                       # === VERCEL SERVERLESS ===
│   ├── index.js               # Catch-all API handler
│   └── [...all].js            # Dynamic route handler
│
└── data/                      # (Statik veri dosyaları)
```

---

## Veritabanı Şeması

### Sunucu (Supabase PostgreSQL)

```
users
├── id SERIAL PK
├── username VARCHAR(255) UNIQUE
├── email VARCHAR(255) UNIQUE
├── password_hash VARCHAR(255)
├── display_name, avatar, role, theme
├── subscription_type, subscription_expires_at
├── is_active, created_at, last_login_at

iptv_sources (Profiller — sunucuda saklanır)
├── id SERIAL PK
├── user_id FK → users.id (CASCADE)
├── name VARCHAR(255)
├── server_url, username, password
├── m3u_url VARCHAR(2048)
├── channel_count INTEGER
├── last_synced_at, created_at

favorites (Favoriler — sunucuda saklanır)
├── id SERIAL PK
├── user_id FK → users.id (CASCADE)
├── channel_id, channel_name, channel_logo, stream_url
├── added_at

watch_history (İzleme geçmişi — sunucuda saklanır)
├── id SERIAL PK
├── user_id FK → users.id (CASCADE)
├── channel_id, channel_name, channel_category, stream_url
├── started_at, ended_at, duration_seconds, resume_position
├── device_type, resolution_watched

campaigns, campaign_usages, subscription_transactions, ad_impressions
└── (Kampanya, abonelik ve reklam takibi tabloları)
```

### Client (IndexedDB)

```
Database: "webiptv-channels"
  ObjectStore: "channels"
    keyPath: "id" (auto-increment)
    Fields: sourceId, name, category, logo, streamUrl, resolution, country
    Indexes:
      - "sourceId"           → Profilin tüm kanallarını bul
      - "sourceCategory"     → [sourceId, category] compound — kategori listeleme
      - "sourceName"         → [sourceId, name] compound — arama
```

---

## Veri Akış Diyagramı

```
┌─────────────────────────────────────────────────────────────┐
│                     KULLANICI AKIŞI                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Login/Register ──→ Sunucu (JWT token al)                │
│                                                             │
│  2. Profil Listesi ──→ GET /user/sources (sunucudan)        │
│                                                             │
│  3. Profil Seç ──→ IndexedDB'de kanal var mı?               │
│       ├── EVET → Direkt ana sayfaya git                     │
│       └── HAYIR → M3U indir → Worker parse → IndexedDB yaz │
│                   → Sunucuya channel_count bildir            │
│                                                             │
│  4. Ana Sayfa ──→ Kategoriler: IndexedDB                    │
│                   Kanallar: IndexedDB                       │
│                                                             │
│  5. Arama ──→ IndexedDB (client-side full-text)             │
│                                                             │
│  6. Player ──→ Kanal bilgisi: IndexedDB                     │
│                İlgili kanallar: IndexedDB                   │
│                Stream: Doğrudan M3U URL (HLS.js)            │
│                                                             │
│  7. Favoriler ──→ GET/POST/DELETE /user/favorites (sunucu)  │
│                                                             │
│  8. Profil Sil ──→ DELETE /user/sources/:id (sunucu)        │
│                    + IndexedDB'den kanal temizliği           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoint Haritası

| Method | Endpoint | Açıklama | Veri Kaynağı |
|--------|----------|----------|-------------|
| POST | `/api/auth/login` | Kullanıcı giriş | Sunucu |
| POST | `/api/auth/register` | Kullanıcı kayıt | Sunucu |
| GET | `/api/auth/me` | Token doğrulama & kullanıcı bilgisi | Sunucu |
| GET | `/api/user/sources` | Profil listesi (iptv_sources) | Sunucu |
| POST | `/api/user/sources` | Yeni profil ekle | Sunucu |
| DELETE | `/api/user/sources/:id` | Profil sil | Sunucu |
| PATCH | `/api/channels/sync-meta` | Kanal sayısını güncelle | Sunucu |
| GET | `/api/user/favorites` | Favori listesi | Sunucu |
| POST | `/api/user/favorites` | Favoriye ekle | Sunucu |
| DELETE | `/api/user/favorites/:id` | Favoriden çıkar | Sunucu |
| POST | `/api/user/watch` | İzleme başlat | Sunucu |
| PUT | `/api/user/watch/:id` | İzleme güncelle | Sunucu |
| GET | `/api/proxy/m3u?url=...` | M3U proxy (CORS bypass) | Proxy |

> **Not:** `/api/channels/categories`, `/api/channels`, `/api/channels/search`, `/api/channels/:id` endpoint'leri kaldırılmıştır. Bu işlemler artık tamamen IndexedDB üzerinden yapılır.

---

## SPA Routing (Hash-Based)

| Route | Sayfa | Dosya |
|-------|-------|-------|
| `#/login` | Giriş | `pages/login.js` |
| `#/register` | Kayıt | `pages/register.js` |
| `#/profiles` | Profil seçimi | `pages/profiles.js` |
| `#/home` | Ana sayfa | `pages/home.js` |
| `#/category/:name` | Kategori detay | `pages/category.js` |
| `#/search` | Arama overlay | `pages/search.js` |
| `#/player/:id` | Video oynatıcı | `pages/player.js` |
| `#/favorites` | Favoriler | `pages/favorites.js` |
| `#/profile` | Kullanıcı profili | `pages/profile.js` |
| `#/admin` | Admin paneli | `pages/admin.js` |
| `#/setup` | İlk kurulum | `pages/setup.js` |

---

## Güvenlik

- **JWT:** Tüm korumalı endpoint'ler `verifyToken` middleware ile korunur
- **SSL:** `NODE_TLS_REJECT_UNAUTHORIZED = '0'` (Supabase self-signed cert workaround)
- **CORS:** Proxy endpoint ile M3U indirme (CORS bypass)
- **Profil sahiplik kontrolü:** `user_id` ile source/channel erişim kontrolü
- **IndexedDB:** Tarayıcının own-origin policy ile korunur (başka site erişemez)

---

## Performans Notları

- **M3U Parse:** Web Worker ile arka plan thread'de yapılır (UI bloklanmaz)
- **Kanal Depolama:** IndexedDB batch insert — 100K kanal ~1-3 saniye
- **Lazy Load:** Kanal görselleri `loading="lazy"` ile yüklenir
- **Infinite Scroll:** Kategori sayfasında IntersectionObserver ile sayfalama
- **HLS.js:** Adaptive bitrate streaming, max 30s buffer
