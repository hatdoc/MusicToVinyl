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

// YouTube Search Proxy API
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(400).json({ error: "Missing query parameter" });
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
app.get('/admin', (req, res) => {
    let rows = conversions.map(c => `
        <tr>
            <td style="padding: 10px; border: 1px solid #444;">${c.genre}</td>
            <td style="padding: 10px; border: 1px solid #444;">${c.count}</td>
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
