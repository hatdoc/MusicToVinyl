const express = require('express');
const path = require('path');
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

// Admin Dashboard Route
app.get('/admin', (req, res) => {
    // In a real app, you would query the database here:
    // SELECT genre, COUNT(*) as count FROM conversions GROUP BY genre ORDER BY count DESC;
    
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
        <title>VinylSoul Admin</title>
        <style>
            body { background: #121212; color: #e0e0e0; font-family: monospace; padding: 40px; }
            table { width: 100%; max-width: 600px; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 10px; border: 1px solid #FFBF00; color: #FFBF00; }
            h1 { color: #FFBF00; }
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
        <a href="/" style="color: #FFBF00;">Back to App</a>
    </body>
    </html>
    `;
    res.send(html);
});

// Start Server
app.listen(PORT, () => {
    console.log(`VinylSoul Server running on http://localhost:${PORT}`);
});
