const express = require('express');
const axios = require('axios');
const ytSearch = require('yt-search');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// වීඩියෝ ID එක URL එකෙන් වෙන් කරගන්නා ශ්‍රිතය
function getYouTubeID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// =========================================================================
// 🎨 1. HTML FRONTEND (මුල් පිටුවට එන අයට පේන ලස්සන වෙබ් පිටුව)
// =========================================================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>𝐐𝐔𝐄𝐄𝐍 𝐍𝐄𝐋𝐔𝐌𝐈 - YouTube MP3 Downloader</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; background: #0b0813; color: #fff; text-align: center; padding: 20px; }
                .container { max-width: 550px; margin: 50px auto; background: #141124; padding: 30px; border-radius: 15px; box-shadow: 0 5px 25px rgba(0,0,0,0.6); border: 1px solid #ff007f; }
                h1 { color: #ff007f; margin-bottom: 20px; font-size: 26px; text-transform: uppercase; letter-spacing: 1px; }
                input { width: 85%; padding: 12px; border: 2px solid #332d4a; background: #0a0814; border-radius: 8px; color: #fff; font-size: 15px; outline: none; transition: 0.3s; }
                input:focus { border-color: #00ffcc; box-shadow: 0 0 10px rgba(0, 255, 204, 0.3); }
                button { width: 90%; padding: 12px; background: #ff007f; border: none; color: white; font-size: 16px; font-weight: bold; border-radius: 8px; cursor: pointer; margin-top: 15px; transition: 0.3s; }
                button:hover { background: #e0006c; transform: translateY(-2px); }
                .loading { display: none; color: #00ffcc; margin-top: 20px; font-weight: bold; }
                .result-box { display: none; margin-top: 25px; background: #0a0814; padding: 20px; border-radius: 10px; border: 1px solid #332d4a; }
                .thumb { width: 100%; max-width: 250px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
                .title { font-size: 16px; font-weight: bold; margin-bottom: 8px; color: #fff; }
                .info { font-size: 13px; color: #a09cb0; margin-bottom: 15px; }
                .dl-btn { display: inline-block; width: 80%; padding: 10px; background: #00ffcc; color: #0b0813; text-decoration: none; font-weight: bold; border-radius: 6px; transition: 0.3s; }
                .dl-btn:hover { background: #00cc99; box-shadow: 0 4px 12px rgba(0,255,204,0.4); }
            </style>
        </head>
        <body>

        <div class="container">
            <h1>🎵 YouTube to MP3 Downloader</h1>
            <p style="color: #a09cb0; font-size: 14px; margin-bottom: 20px;">Enter YouTube URL or Song Name Below</p>
            
            <input type="text" id="userInput" placeholder="https://youtu.be/... or Song Name">
            <button onclick="startDownload()">Convert to MP3</button>

            <div class="loading" id="loader">⏳ Converting... Please wait a moment...</div>

            <div class="result-box" id="resultBox">
                <img class="thumb" id="resThumb" src="" alt="thumbnail">
                <div class="title" id="resTitle">Song Title</div>
                <div class="info" id="resInfo">Duration: 00:00</div>
                <a class="dl-btn" id="resBtn" href="#" target="_blank">📥 DOWNLOAD MP3</a>
            </div>
        </div>

        <script>
            async function startDownload() {
                const input = document.getElementById('userInput').value.trim();
                const loader = document.getElementById('loader');
                const resultBox = document.getElementById('resultBox');

                if (!input) {
                    alert('කරුණාකර ලින්ක් එකක් හෝ සිංදුවක නමක් ඇතුලත් කරන්න මචං!');
                    return;
                }

                loader.style.display = 'block';
                resultBox.style.display = 'none';

                try {
                    const response = await fetch('/api/ytmp3?url=' + encodeURIComponent(input));
                    const resData = await response.json();

                    loader.style.display = 'none';

                    // අලුත් JSON Format එකට අනුව Frontend එක කියවීම සකස් කර ඇත
                    if (resData.status && resData.data.links.video) {
                        document.getElementById('resThumb').src = resData.data.thumbnail;
                        document.getElementById('resTitle').innerText = resData.data.title;
                        
                        // තත්පර ගණන විනාඩි වලට හැරවීම
                        const mins = Math.floor(resData.data.duration / 60);
                        const secs = resData.data.duration % 60;
                        
                        document.getElementById('resInfo').innerText = 'Duration: ' + mins + 'm ' + secs + 's | Author: ' + resData.author;
                        document.getElementById('resBtn').href = resData.data.links.video;
                        
                        resultBox.style.display = 'block';
                    } else {
                        alert('Error: ලින්ක් එක ඇදගන්න බැරිවුණා මචං.');
                    }
                } catch (error) {
                    loader.style.display = 'none';
                    alert('සර්වර් එකේ දෝෂයක් ආවා!');
                    console.error(error);
                }
            }
        </script>

        </body>
        </html>
    `);
});

// =========================================================================
// ⚡ 2. CUSTOM JSON FORMATTED API ENDPOINT (Mr Thinuzz Format)
// =========================================================================
app.get('/api/ytmp3', async (req, res) => {
    try {
        const input = req.query.url;

        if (!input) {
            return res.status(400).json({ 
                status: false, 
                author: "Mr Thinuzz",
                error: "Please provide a YouTube URL or Search query!" 
            });
        }

        let videoUrl = input;
        let title = "YouTube Audio";
        let durationSeconds = 0;
        let videoId = "";

        if (!input.includes('youtube.com') && !input.includes('youtu.be')) {
            const searchResults = await ytSearch(input);
            if (!searchResults.videos.length) {
                return res.status(404).json({ status: false, author: "Mr Thinuzz", error: 'No video found.' });
            }
            const topResult = searchResults.videos[0];
            videoUrl = topResult.url;
            title = topResult.title;
            durationSeconds = topResult.seconds;
            videoId = topResult.videoId;
        } else {
            videoId = getYouTubeID(videoUrl) || "unknown";
            const searchResults = await ytSearch(videoUrl);
            if (searchResults.videos.length) {
                title = searchResults.videos[0].title;
                durationSeconds = searchResults.videos[0].seconds;
            }
        }

        const startTime = Date.now();

        // Step 1: Get Key
        const sanityRes = await axios.get('https://cnv.cx/v2/sanity/key', {
            headers: {
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
                'accept': '*/*',
                'origin': 'https://frame.y2meta-uk.com',
                'referer': 'https://frame.y2meta-uk.com/'
            }
        });

        const key = sanityRes.data?.key;
        if (!key) throw new Error('Could not retrieve converter key');

        // Step 2: Convert
        const body = new URLSearchParams({
            link: videoUrl,
            format: 'mp3',
            audioBitrate: '128',
            videoQuality: '720',
            filenameStyle: 'pretty',
            vCodec: 'h264'
        }).toString();

        const convertRes = await axios.post('https://cnv.cx/v2/converter', body, {
            headers: {
                'key': key,
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
                'content-type': 'application/x-www-form-urlencoded',
                'origin': 'https://frame.y2meta-uk.com',
                'referer': 'https://frame.y2meta-uk.com/'
            }
        });

        const result = convertRes.data;
        const finalDownloadUrl = result.url || result.downloadUrl || result.file || null;

        return res.status(200).json({
            status: true,
            author: "Mr Thinuzz",
            timestamp: new Date().toISOString(),
            data: {
                title: title,
                thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                duration: durationSeconds,
                quality_found: "128kbps",
                links: {
                    video: finalDownloadUrl
                },
                filename: `${title.replace(/[^a-zA-Z0-9 ]/g, "")}.mp3`,
                original_url: videoUrl,
                video_id: videoId
            }
        });

    } catch (err) {
        return res.status(500).json({ 
            status: false, 
            author: "Mr Thinuzz",
            timestamp: new Date().toISOString(),
            error: err.message 
        });
    }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`🚀 API on http://localhost:${PORT}`));
}

module.exports = app;
