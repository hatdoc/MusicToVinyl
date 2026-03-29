const express = require('express');
const path = require('path');
const ytSearch = require('yt-search');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Mock Database (In-memory for this demo)
const conversions = [
    { genre: 'Jazz', count: 45 },
    { genre: 'Lo-Fi', count: 120 },
    { genre: 'Classical', count: 30 },
    { genre: 'Rock', count: 15 },
    { genre: 'Pop', count: 60 }
];

// Routes for AdSense Compliance
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public/about.html')));
app.get('/privacy', (req, res) => res.sendFile(path.join(__dirname, 'public/privacy.html')));
app.get('/terms', (req, res) => res.sendFile(path.join(__dirname, 'public/terms.html')));
app.get('/journal', (req, res) => res.sendFile(path.join(__dirname, 'public/journal.html')));

// Simple In-Memory Rate Limiter for public endpoints
const searchRateLimits = new Map();
const searchRateLimiter = (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const record = searchRateLimits.get(ip) || { count: 0, resetTime: now + 60000 };
    if (now > record.resetTime) { record.count = 0; record.resetTime = now + 60000; }
    record.count++;
    searchRateLimits.set(ip, record);
    if (record.count > 30) return res.status(429).json({ error: "Too many requests." });
    next();
};

// YouTube Search Proxy API
app.get('/api/search', searchRateLimiter, async (req, res) => {
    try {
        const query = req.query.q;
        if (!query || typeof query !== 'string' || query.length > 200) {
            return res.status(400).json({ error: "Invalid query parameter" });
        }
        const r = await ytSearch(query);
        const videos = r.videos.slice(0, 5).map(v => ({
            id: v.videoId,
            title: v.title,
            thumbnail: v.thumbnail,
            author: v.author.name
        }));
        res.json(videos);
    } catch (err) {
        console.error("Search API Error:", err);
        res.status(500).json({ error: "Failed to fetch search results from YouTube." });
    }
});

// Admin Dashboard Route
const escapeHTML = (str) => String(str).replace(/[&<>'"]/g, tag => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[tag]));

const basicAuth = (req, res, next) => {
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
    if (login === 'admin' && password === 'supersecret123') return next();
    res.set('WWW-Authenticate', 'Basic realm="VinylAdmin"');
    res.status(401).send('Authentication required.');
};

app.get('/admin', basicAuth, (req, res) => {
    let rows = conversions.map(c => `
        <tr>
            <td style="padding: 10px; border: 1px solid #444;">${escapeHTML(c.genre)}</td>
            <td style="padding: 10px; border: 1px solid #444;">${escapeHTML(c.count)}</td>
        </tr>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Vinyl Analog Admin</title>
        <style>
            body { background: #0a0a0a; color: #e0e0e0; font-family: monospace; padding: 40px; }
            table { width: 100%; max-width: 600px; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 10px; border: 1px solid #C5A059; color: #C5A059; }
            h1 { color: #C5A059; }
        </style>
    </head>
    <body>
        <h1>Conversion Analytics</h1>
        <p>Most converted genres (Data Asset)</p>
        <table>
            <thead>
                <tr>
                    <th>Genre</th>
                    <th>Conversions</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
        <p style="margin-top: 20px; color: #888;">Data ready for export.</p>
        <a href="/" style="color: #C5A059;">Back to App</a>
    </body>
    </html>
    `;
    res.send(html);
});

// Start Server
app.listen(PORT, () => {
    console.log(`Vinyl Analog Server running on http://localhost:${PORT}`);
});
