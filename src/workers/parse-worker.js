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

function parseM3uChunk(lines) {
    const channels = [];
    let currentInfo = null;
    
    for (const line of lines) {
        const tLine = line.trim();
        if (!tLine) continue;
        
        if (tLine.startsWith('#EXTINF:')) {
            currentInfo = tLine;
        } else if (tLine.startsWith('http')) {
            if (currentInfo) {
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
                        name,
                        category,
                        logo: logoMatch ? logoMatch[1] : null,
                        streamUrl: tLine,
                        resolution: extractResolution(name),
                        country: catMatch ? catMatch[1] : null
                    });
                }
                currentInfo = null;
            }
        }
    }
    return channels;
}

self.onmessage = async (e) => {
    try {
        const { text } = e.data;
        const lines = text.split('\n');
        
        let allChannels = [];
        const chunkSize = 10000;
        
        for (let i = 0; i < lines.length; i += chunkSize) {
            const chunk = parseM3uChunk(lines.slice(i, i + chunkSize));
            allChannels = allChannels.concat(chunk);
            
            self.postMessage({ 
                type: 'progress', 
                percent: Math.min(100, Math.round(((i + chunkSize) / lines.length) * 100)) 
            });
        }
        
        self.postMessage({ type: 'done', channels: allChannels });
    } catch (err) {
        self.postMessage({ type: 'error', message: err.message });
    }
};
