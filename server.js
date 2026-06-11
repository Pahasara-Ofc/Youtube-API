const express = require('express');
const axios = require('axios');
const ytSearch = require('yt-search');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 🌐 Enable CORS (වෙනත් තැන්වල ඉඳන් API එකට කනෙක්ට් වෙන්න දෙන අවසරය)
app.use(cors());

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
                    // කෙලින්ම අපේ server.js එකේම තියෙන API එකට රික්වෙස්ට් එක යැවීම
                    const response = await fetch('/api/ytmp3?url=' + encodeURIComponent(input));
                    const resData = await response.json();

                    loader.style.display = 'none';

                    if (resData.status && resData.download_url) {
                        document.getElementById('resThumb').src = resData.thumbnail;
                        document.getElementById('resTitle').innerText = resData.title;
                        document.getElementById('resInfo').innerText = 'Duration: ' + resData.duration + ' | Creator: ' + resData.creator;
                        document.getElementById('resBtn').href = resData.download_url;
                        
                        resultBox.style.display = 'block';
                    } else {
                        alert('Error: ' + (resData.error || 'ලින්ක් එක ඇදගන්න බැරිවුණා මචං.'));
                    }
                } catch (error) {
                    loader.style.display = 'none';
                    alert('සර්වර් එකේ දෝෂයක් ආවා! නැවත උත්සාහ කරන්න.');
                    console.error(error);
                }
            }
        </script>

        </body>
        </html>
    `);
});

// =========================================================================
// ⚡ 2. Y2MATE SCRAPER API ENDPOINT (බැක්එන්ඩ් වැඩ කෑල්ල)
// =========================================================================
app.get('/api/ytmp3', async (req, res) => {
    try {
        const input = req.query.url;

        if (!input) {
            return res.status(400).json({ status: false, error: "Please provide a YouTube URL or Search query!" });
        }

        let videoUrl = input;
        let title = "YouTube Audio";
        let duration = "Unknown";
        let thumbnail = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7";

        // 🔍 Input එක ලින්ක් එකක් නෙවෙයි නම් → YouTube එකේ සර්ච් කරනවා
        if (!input.includes('youtube.com') && !input.includes('youtu.be')) {
            const searchResults = await ytSearch(input);
            if (!searchResults.videos.length) {
                return res.status(404).json({ status: false, error: 'No video found for that search term.' });
            }
            const topResult = searchResults.videos[0];
            videoUrl = topResult.url;
            title = topResult.title;
            duration = topResult.duration.toString();
            thumbnail = topResult.thumbnail;
        } else {
            // ලින්ක් එකක් ආවොත්, ඒකෙත් නම සහ Thumbnail එක ගන්න සර්ච් එකක් දානවා
            const searchResults = await ytSearch(videoUrl);
            if (searchResults.videos.length) {
                title = searchResults.videos[0].title;
                duration = searchResults.videos[0].duration.toString();
                thumbnail = searchResults.videos[0].thumbnail;
            }
        }

        const startTime = Date.now();

        // 🔥 Step 1: Converter Key එක සයිට් එකෙන් හොරකම් කිරීම (Scraping)
        const sanityRes = await axios.get('https://cnv.cx/v2/sanity/key', {
            headers: {
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
                'accept': '*/*',
                'origin': 'https://frame.y2meta-uk.com',
                'referer': 'https://frame.y2meta-uk.com/'
            }
        });

        const key = sanityRes.data?.key;
        if (!key) throw new Error('Could not retrieve converter key from y2mate source.');

        // 🔥 Step 2: Key එකත් එක්ක ලින්ක් එක යවා MP3 Converter Job එකක් සබ්මිට් කිරීම
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
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
                'content-type': 'application/x-www-form-urlencoded',
                'origin': 'https://frame.y2meta-uk.com',
                'referer': 'https://frame.y2meta-uk.com/'
            }
        });

        const result = convertRes.data;
        const latency = Date.now() - startTime;

        // 📝 Frontend එකට හෝ වට්සැප් බොට්ට පාවිච්චි කරන්න ලස්සනට දෙන JSON Response එක
        return res.status(200).json({
            status: true,
            creator: "DanuZz & Pathum",
            latency_ms: latency,
            title: title,
            duration: duration,
            thumbnail: thumbnail,
            download_url: result.url || result.downloadUrl || result.file || null,
            filename: `${title}.mp3`
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: false,
            error: "Y2Mate conversion failed.",
            details: err.message
        });
    }
});

// =========================================================================
// 🚀 3. සර්වර් එක ස්ටාර්ට් කිරීම / Export
// =========================================================================
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 API with UI is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
