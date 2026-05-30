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
        'NL': 'Hollandaca', 'RU': 'Rusça'
    };
    return map[prefix] || prefix;
}

function parseM3u(text) {
    const channels = [];
    // Split on any line ending (
, 
, or )
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
                let category = 'Genel';
                let name = fullName;

                const catMatch = fullName.match(/^([A-Z]{2,3}):\s*(.+)/);
                if (catMatch) {
                    category = mapCategoryPrefix(catMatch[1]);
                    name = catMatch[2].trim();
                }

                const groupMatch = currentInfo.match(/group-title="([^"]+)"/);
                if (groupMatch) category = groupMatch[1];

                const logoMatch = currentInfo.match(/tvg-logo="([^"]+)"/);

                channels.push({
                    name: name || 'Bilinmeyen',
                    category,
                    logo: logoMatch ? logoMatch[1] : null,
                    streamUrl: tLine,
                    resolution: extractResolution(name),
                    country: catMatch ? catMatch[1] : null
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
