const express = require('express');
const ytDlp = require('yt-dlp-exec');
const app = express();
const PORT = process.env.PORT || 3000;

// =========================================================================
// 🌐 1. WELCOME PAGE (මුල් පිටුවට එන අයට පේන ලස්සන UI එක)
// =========================================================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>𝐐𝐔𝐄𝐄𝐍 𝐍𝐄𝐋𝐔𝐌𝐈 𝐌🇩 - YT MP3 API</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f0c1b; color: #fff; text-align: center; padding: 50px; }
                .container { max-width: 600px; margin: auto; background: #1a1625; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); border: 1px solid #ff007f; }
                h1 { color: #ff007f; margin-bottom: 10px; font-size: 28px; }
                p { color: #b3b3b3; font-size: 16px; }
                .code-box { background: #0a0813; padding: 15px; border-radius: 8px; font-family: monospace; color: #00ffcc; word-break: break-all; font-size: 14px; border: 1px solid #333; margin-top: 20px; }
                .footer { margin-top: 30px; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎵 PRIVATE YT-MP3 API ONLINE</h1>
                <p>ඔන්න මචං API එක වර්සෙල් එකේ සාර්ථකව වැඩ! 🚀</p>
                <div class="code-box">
                    💡 Usage:<br>
                    your-vercel-url.app/api/ytmp3?url=YOUR_YOUTUBE_URL
                </div>
                <div class="footer">© Powered by Queen Nelumi MD 🍭</div>
            </div>
        </body>
        </html>
    `);
});

// =========================================================================
// ⚡ 2. YT-MP3 DOWNLOADER ENDPOINT (සිරාම වැඩ කෑල්ල)
// =========================================================================
app.get('/api/ytmp3', async (req, res) => {
    try {
        const videoUrl = req.query.url;

        // ❌ යූසර් ලින්ක් එකක් දීලා නැත්නම් හෝ හිස් නම්
        if (!videoUrl) {
            return res.status(400).json({
                status: false,
                creator: "Pathum Rajapaksha",
                error: "Please provide a valid YouTube URL in the query parameter!"
            });
        }

        const startTime = Date.now();

        // 🔥 yt-dlp එකෙන් YouTube එකෙන් විස්තර විතරක් ලබා ගැනීම (No Local Downloading)
        const output = await ytDlp(videoUrl, {
            dumpSingleJson: true,
            noWarnings: true,
            preferFreeFormats: true,
            youtubeSkipDashManifest: true,
        });

        // 🎵 තියෙන Format වලින් Audio (vcodec === 'none') විතරක් ෆිල්ටර් කර හොඳම එක ගැනීම
        const audioFormats = output.formats.filter(f => f.vcodec === 'none' && f.acodec !== 'none');
        const bestAudio = audioFormats[audioFormats.length - 1]; 

        // ❌ Audio Format එකක් සෙට් වුනේ නැත්නම්
        if (!bestAudio || !bestAudio.url) {
            throw new Error("Could not find a valid direct audio stream download URL.");
        }

        const latency = Date.now() - startTime;

        // 📝 උඹ ඉල්ලපු විදිහටම ලස්සනට සකස් කරපු JSON Response එක
        res.json({
            status: true,
            creator: "Pathum Rajapaksha",
            latency_ms: latency,
            data: {
                title: output.title || "Unknown Title",
                thumbnail: output.thumbnail || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7",
                duration: output.duration_string || "00:00",
                views: output.view_count || 0,
                download_url: bestAudio.url, // මේක තමයි සිරාම Direct MP3/Audio ලින්ක් එක
                filename: `${output.title || 'audio'}.mp3`
            }
        });

    } catch (error) {
        console.error("API Error: ", error.message);
        res.status(500).json({
            status: false,
            creator: "Pathum Rajapaksha",
            error: "Failed to process YouTube Video. Active link එකක්දැයි පරීක්ෂා කරන්න.",
            details: error.message
        });
    }
});

// =========================================================================
// 🚀 3. EXPORT / LISTEN (Vercel Serverless සපෝට් එක සඳහා)
// =========================================================================
// Local පරිගණකයේ Run කරද්දී පාවිච්චි වෙන්න (Vercel එකට මේක ඕන වෙන්නේ නැත)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 API is running locally on http://localhost:${PORT}`);
    });
}

// Vercel එක කියවන්න මේක අනිවාර්යයෙන්ම ඕනේ මචං!
module.exports = app;
