const express = require('express');
const axios = require('axios');
const ytSearch = require('yt-search');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// වීඩියෝ ID එක URL එකෙන් වෙන් කරගන්නා ශ්‍රිතය (Helper function)
function getYouTubeID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// =========================================================================
// ⚡ 2. CUSTOM JSON FORMATTED API ENDPOINT
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

        // 🔍 සර්ච් කෑල්ල
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
            // ලින්ක් එකක් ආවොත් ඒකෙන් ID එක ගන්නවා
            videoId = getYouTubeID(videoUrl) || "unknown";
            const searchResults = await ytSearch(videoUrl);
            if (searchResults.videos.length) {
                title = searchResults.videos[0].title;
                durationSeconds = searchResults.videos[0].seconds;
            }
        }

        // ⚡ Step 1: Get temporary key from y2mate source
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

        // ⚡ Step 2: Submit conversion job
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

        // 📝 උඹ ඉල්ලපු විදිහටම 100%ක් සමාන JSON Format එක මෙතනින් හැදෙනවා මචං
        return res.status(200).json({
            status: true,
            author: "Mr Thinuzz",
            timestamp: new Date().toISOString(), // 2026-06-11T18:58:51.579Z වගේ ඔටෝ හැදෙනවා
            data: {
                title: title,
                thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, // HQ YouTube Thumbnail
                duration: durationSeconds, // තත්පර ගණන (Integer)
                quality_found: "128kbps",
                links: {
                    video: finalDownloadUrl // උඹේ MP3/Audio ලින්ක් එක
                },
                filename: `${title.replace(/[^a-zA-Z0-9 ]/g, "")}.mp3`, // කැත අකුරු අයින් කරපු ෆයිල් නම
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

// Local run එකට (Vercel එකට මේක බලපාන්නේ නෑ)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`🚀 API on http://localhost:${PORT}`));
}

module.exports = app;
