const express = require('express');
const ytDlp = require('yt-dlp-exec');
const app = express();
const PORT = process.env.PORT || 3000;

// 🌐 API Endpoint එක: http://localhost:3000/api/ytmp3?url=<youtube_link>
app.get('/api/ytmp3', async (req, res) => {
    try {
        const videoUrl = req.query.url;
        if (!videoUrl) {
            return res.status(400).json({
                status: false,
                creator: "NELUMI-MD",
                error: "Please provide a valid YouTube URL!"
            });
        }

        const startTime = Date.now();

        const output = await ytDlp(videoUrl, {
            dumpSingleJson: true,
            noWarnings: true,
            preferFreeFormats: true,
            youtubeSkipDashManifest: true,
        });
        const audioFormats = output.formats.filter(f => f.vcodec === 'none' && f.acodec !== 'none');
        const bestAudio = audioFormats[audioFormats.length - 1]; // Highest Quality One

        const latency = Date.now() - startTime;

        res.json({
            status: true,
            creator: "NELUMI-MD",
            latency_ms: latency,
            data: {
                title: output.title,
                thumbnail: output.thumbnail,
                duration: output.duration_string,
                views: output.view_count,
                download_url: bestAudio.url, 
                filename: `${output.title}.mp3`
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: false,
            creator: "NELUMI-MD",
            error: "Failed to process YouTube Video. Active link එකක්දැයි පරීක්ෂා කරන්න."
        });
    }
});
app.listen(PORT, () => {
    console.log(`🚀 Your Private YT-MP3 API is running on http://localhost:${PORT}`);
});
