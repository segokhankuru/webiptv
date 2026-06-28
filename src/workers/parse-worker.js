function extractResolution(name) {
    if (/4K|2160/i.test(name)) return '4K';
    if (/FHD|1080/i.test(name)) return 'FHD';
    if (/HD\+|HD/i.test(name)) return 'HD';
    return 'SD';
}

function mapCategoryPrefix(prefix) {
    const map = {
        'TR': 'Türk Kanalları', 'EN': 'İngilizce',
        'DE': 'Almanca', 'FR': 'Fransızca',
        'AR': 'Arapça', 'SP': 'İspanyolca',
        'NL': 'Hollandaca', 'RU': 'Rusça',
        'IT': 'İtalyanca', 'PT': 'Portekizce',
        'GR': 'Yunanca', 'PL': 'Lehçe',
        'US': 'Amerikan', 'UK': 'İngiliz',
        'CA': 'Kanada', 'IN': 'Hint',
        'KR': 'Kore', 'JP': 'Japon',
        'CN': 'Çin', 'BR': 'Brezilya',
        'MX': 'Meksika', 'AZ': 'Azerbaycan',
        'KU': 'Kürtçe', 'IR': 'İran',
        'AF': 'Afganistan', 'PK': 'Pakistan',
        'AL': 'Arnavutça', 'BG': 'Bulgarca',
        'RO': 'Romence', 'SE': 'İsveççe',
        'NO': 'Norveççe', 'DK': 'Danca',
        'FI': 'Fince', 'HU': 'Macarca',
        'CZ': 'Çekçe', 'SK': 'Slovakça',
        'HR': 'Hırvatça', 'RS': 'Sırpça',
        'BA': 'Boşnakça', 'MK': 'Makedonca',
        'XXX': '🔞 Yetişkin'
    };
    return map[prefix] || prefix;
}

/**
 * Adult içerik tespit anahtar kelimeleri (küçük harfe dönüştürülmüş kanal adı üzerinde kontrol edilir)
 */
const ADULT_KEYWORDS = [
    'xxx', 'adult', 'porn', '18+', 'erotic', 'sex',
    'brazzers', 'bangbros', 'onlyfans', 'hustler', 'playboy',
    'penthouse', 'gonzo', 'perfectgonzo', 'fakehostel', 'faketaxi',
    'evil angel', 'evilangel', 'nubile', 'tushy', 'hardx',
    'ddfnetwork', 'redlight', 'dorcel', 'vivid', 'private hd',
    'mofos', 'realitykings', 'bangbus', 'julesjourdan', 'trueananal',
    'swallowed', 'blacked', 'vixen', 'deeper', 'legalporno',
    'legal porno', 'piss drinking', 'anal gangbang', 'double anal',
    'pink erotic', 'dusk live', 'passionxxx', 'hot tv live',
    'venus tv', 'barely legal', 'red lips', 'erox hd',
    'filmax adult', 'brutalfisting', 'public agent'
];

/**
 * Kanal adından adult içerik olup olmadığını tespit eder
 */
function isAdultContent(channelName, category) {
    const lower = (channelName || '').toLowerCase();
    const catLower = (category || '').toLowerCase();
    
    // XXX: prefix'i direkt adult
    if (lower.startsWith('xxx:') || lower.startsWith('xxx ')) return true;
    
    // Kategori adı kontrolü
    if (catLower.includes('adult') || catLower.includes('xxx') || catLower.includes('yetişkin') || catLower.includes('18+')) return true;
    
    // Anahtar kelime kontrolü
    for (const keyword of ADULT_KEYWORDS) {
        if (lower.includes(keyword)) return true;
    }
    
    return false;
}

/**
 * URL path'inden içerik türünü belirler (Xtream Codes URL formatı)
 * Xtream format: http://host:port/{live|movie|series}/user/pass/id.ext
 */
function detectTypeFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        // pathParts[0] boş string, pathParts[1] tür
        const type = (pathParts[1] || '').toLowerCase();
        if (type === 'live') return 'live';
        if (type === 'movie') return 'movie';
        if (type === 'series') return 'series';
    } catch (e) {}
    return null;
}

/**
 * Kanal adından dizi pattern'i (SxxExx) tespit eder
 */
function hasSeriesPattern(name) {
    // S01E01, S01 DiziAdi S01E01, vb.
    return /\bS\d{1,2}(?:\s|E\d)/i.test(name);
}

function parseM3u(text) {
    const channels = [];
    // Split on any line ending (CRLF, LF, or CR)
    const lines = text.split(/\r?\n|\r/);
    let currentInfo = null;

    for (let i = 0; i < lines.length; i++) {
        const tLine = lines[i].trim();
        if (!tLine) continue;

        if (tLine.startsWith('#EXTINF:')) {
            currentInfo = tLine;
        } else if (currentInfo && (tLine.startsWith('http') || tLine.startsWith('rtmp') || tLine.startsWith('rtsp') || tLine.startsWith('udp') || tLine.startsWith('rtp'))) {
            const match = currentInfo.match(/#EXTINF:[^,]*,(.+)/);
            if (match) {
                const fullName = match[1].trim();
                let category = null;
                let name = fullName;

                // 1. group-title attribute'u varsa onu kullan
                const groupMatch = currentInfo.match(/group-title="([^"]+)"/);
                if (groupMatch) {
                    category = groupMatch[1];
                }

                // 2. Kanal adı prefix'i varsa (XX: veya XXX:)
                const catMatch = fullName.match(/^([A-Z]{2,3}):\s*(.+)/);
                if (catMatch) {
                    if (!category) {
                        category = mapCategoryPrefix(catMatch[1]);
                    }
                    name = catMatch[2].trim();
                }

                // 3. Hâlâ kategori belirlenemediyse URL path'inden belirle
                if (!category) {
                    const urlType = detectTypeFromUrl(tLine);
                    if (urlType === 'live') {
                        category = 'Canlı TV';
                    } else if (urlType === 'movie') {
                        category = 'Filmler';
                    } else if (urlType === 'series') {
                        category = 'Diziler';
                    }
                }

                // 4. Kanal adından dizi pattern'i tespit
                if (!category && hasSeriesPattern(name)) {
                    category = 'Diziler';
                }

                // 5. Hiçbirine uymadıysa Genel
                if (!category) {
                    category = 'Genel';
                }

                const logoMatch = currentInfo.match(/tvg-logo="([^"]+)"/);

                // Adult içerik tespiti
                const adult = isAdultContent(fullName, category);

                channels.push({
                    name: name || 'Bilinmeyen',
                    category,
                    logo: logoMatch ? logoMatch[1] : null,
                    streamUrl: tLine,
                    resolution: extractResolution(name),
                    country: catMatch ? catMatch[1] : null,
                    isAdult: adult
                });
            }
            currentInfo = null;
        } else if (tLine.startsWith('#')) {
            // Other directives: skip but don't reset currentInfo for non-empty non-EXTINF lines
            // (some M3U files have comments between EXTINF and URL)
        } else {
            // Non-http line that isn't a comment - reset currentInfo
            currentInfo = null;
        }
    }
    return channels;
}

self.onmessage = async (e) => {
    try {
        const { text } = e.data;

        // Progress: parsing started
        self.postMessage({ type: 'progress', percent: 10 });

        const allChannels = parseM3u(text);

        self.postMessage({ type: 'progress', percent: 100 });
        self.postMessage({ type: 'done', channels: allChannels });
    } catch (err) {
        self.postMessage({ type: 'error', message: err.message });
    }
};
