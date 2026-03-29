const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Paths
const isPackaged = __dirname.includes('app.asar');
// If packaged, get out of resources/app.asar/backend
const basePath = isPackaged ? path.join(__dirname, '../../../') : path.join(__dirname, '..');

const mediaPath = path.join(basePath, 'media');
const androidPath = path.join(basePath, 'Android');
const tawasalPath = path.join(basePath, 'Tawasal');
const wordsFilePath = path.join(basePath, 'forbidden_words.json');
const postsFilePath = path.join(basePath, 'posts.json');
const usersFilePath = path.join(basePath, 'users.json');

// Ensure forbidden_words.json exists
if (!fs.existsSync(wordsFilePath)) {
    fs.writeFileSync(wordsFilePath, JSON.stringify(["banned1", "banned2"]));
}
// Ensure posts.json exists
if (!fs.existsSync(postsFilePath)) {
    fs.writeFileSync(postsFilePath, JSON.stringify([]));
}
// Ensure users.json exists
if (!fs.existsSync(usersFilePath)) {
    fs.writeFileSync(usersFilePath, JSON.stringify([]));
}

// Load persistent posts
let posts = JSON.parse(fs.readFileSync(postsFilePath));
let users = JSON.parse(fs.readFileSync(usersFilePath));

function savePosts() {
    fs.writeFileSync(postsFilePath, JSON.stringify(posts.slice(0, 500)));
}
function saveUsers() {
    fs.writeFileSync(usersFilePath, JSON.stringify(users));
}

// ─── Settings ───
app.get('/api/settings/words', (req, res) => {
    const data = fs.readFileSync(wordsFilePath);
    res.json(JSON.parse(data));
});

app.post('/api/settings/words', (req, res) => {
    const newWords = req.body.words;
    fs.writeFileSync(wordsFilePath, JSON.stringify(newWords));
    res.json({ success: true });
});

// ─── Users / Profiles ───
app.get('/api/users', (req, res) => {
    res.json(users);
});

app.post('/api/users', (req, res) => {
    const { name, avatar } = req.body;
    const existing = users.find(u => u.name === name);
    if (existing) {
        existing.avatar = avatar || existing.avatar;
        existing.lastSeen = new Date().toISOString();
        saveUsers();
        return res.json(existing);
    }
    const newUser = {
        id: Date.now(),
        name,
        avatar: avatar || null,
        lastSeen: new Date().toISOString(),
        online: true
    };
    users.push(newUser);
    saveUsers();
    res.json(newUser);
});

// ─── Moderation ───
function moderateContent(message, forbiddenWords) {
    if (!message) return '';
    let filteredMessage = message;
    forbiddenWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        filteredMessage = filteredMessage.replace(regex, '***');
    });
    return filteredMessage;
}

// ─── Posts / Feed ───
app.get('/api/posts', (req, res) => {
    res.json(posts);
});

app.post('/api/posts', (req, res) => {
    const forbiddenWords = JSON.parse(fs.readFileSync(wordsFilePath));
    const rawMessage = req.body.message || '';
    const moderatedMessage = moderateContent(rawMessage, forbiddenWords);

    const newPost = {
        id: Date.now(),
        message: moderatedMessage,
        image: req.body.image || null,
        user: req.body.user || { name: 'Anonymous' },
        createdAt: new Date().toISOString()
    };
    posts.unshift(newPost);
    savePosts();
    res.json(newPost);
});

app.delete('/api/posts/:id', (req, res) => {
    posts = posts.filter(p => p.id !== parseInt(req.params.id));
    savePosts();
    res.json({ success: true });
});

// ─── Direct Messages ───
const messagesFilePath = path.join(__dirname, 'messages.json');
if (!fs.existsSync(messagesFilePath)) {
    fs.writeFileSync(messagesFilePath, JSON.stringify([]));
}
let dmMessages = JSON.parse(fs.readFileSync(messagesFilePath));
function saveMessages() {
    fs.writeFileSync(messagesFilePath, JSON.stringify(dmMessages.slice(-2000)));
}

app.get('/api/messages', (req, res) => {
    const { user1, user2 } = req.query;
    if (!user1 || !user2) return res.json([]);
    const convo = dmMessages.filter(m =>
        (m.from === user1 && m.to === user2) || (m.from === user2 && m.to === user1)
    );
    res.json(convo);
});

app.post('/api/messages', (req, res) => {
    const { from, to, text, image, file, fileName, fileType, audio } = req.body;
    const msg = {
        id: Date.now(),
        from, to,
        text: text || '',
        image: image || null,
        file: file || null,
        audio: audio || null,
        fileName: fileName || null,
        fileType: fileType || null,
        createdAt: new Date().toISOString()
    };
    dmMessages.push(msg);
    saveMessages();
    res.json(msg);
});

// User Deletion (Protected: only from dashboard)
app.delete('/api/users/:name', (req, res) => {
    // Basic protection: check if it's from the dashboard or localhost
    const isLocal = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
    if (!isLocal && req.headers['x-admin-action'] !== 'true') {
        return res.status(403).json({ error: 'Unauthorized deletion from network rejected' });
    }
    users = users.filter(u => u.name !== req.params.name);
    saveUsers();
    res.json({ success: true });
});

// ─── Stats Tracking ───
const statsFilePath = path.join(__dirname, 'stats.json');
if (!fs.existsSync(statsFilePath)) fs.writeFileSync(statsFilePath, JSON.stringify({}));
let stats = JSON.parse(fs.readFileSync(statsFilePath));

app.get('/api/stats', (req, res) => res.json(stats));

function trackingMiddleware(req, res, next) {
    if (req.path !== '/') {
        stats[req.path] = (stats[req.path] || 0) + 1;
        fs.writeFileSync(statsFilePath, JSON.stringify(stats));
    }
    next();
}

// ─── Static Serving ───
app.use('/media', trackingMiddleware, express.static(mediaPath));
app.use('/apps', trackingMiddleware, express.static(androidPath));
app.use('/tawasal', trackingMiddleware, express.static(tawasalPath));
app.use('/plyr', express.static(path.join(__dirname, '../../android-client/plyr')));
app.use('/templates', express.static(path.join(__dirname, '../templates')));
app.use('/artplayer', express.static(path.join(__dirname, '../artplayer')));

// Ensure directories exist
['films', 'series', 'songs'].forEach(folder => {
    const fPath = path.join(mediaPath, folder);
    if (!fs.existsSync(fPath)) fs.mkdirSync(fPath, { recursive: true });
});
if (!fs.existsSync(androidPath)) fs.mkdirSync(androidPath, { recursive: true });
if (!fs.existsSync(tawasalPath)) fs.mkdirSync(tawasalPath, { recursive: true });
const voicePath = path.join(mediaPath, 'voice');
if (!fs.existsSync(voicePath)) fs.mkdirSync(voicePath, { recursive: true });
app.use('/voice', express.static(voicePath));

// ─── Upload ───
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (req.body.type === 'app') {
            cb(null, androidPath);
        } else {
            cb(null, path.join(mediaPath, req.body.type || 'films'));
        }
    },
    filename: (req, file, cb) => {
        const title = req.body.title || 'Untitled';
        if (file.fieldname === 'cover') {
            cb(null, title + '.jpg');
        } else {
            cb(null, title + path.extname(file.originalname));
        }
    }
});
const upload = multer({ storage });

app.post('/api/upload', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), (req, res) => {
    res.json({ success: true, message: 'Uploaded successfully' });
});

// Audio specific upload (base64 from mobile)
app.post('/api/upload-audio', (req, res) => {
    const { from, to, audioData } = req.body;
    if (!audioData) return res.status(400).json({ error: 'No audio data' });
    const fileName = `voice_${Date.now()}.m4a`;
    const filePath = path.join(voicePath, fileName);
    const base64Data = audioData.replace(/^data:audio\/[^;]+;base64,/, "");
    fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (err) return res.status(500).json({ error: 'Failed to save audio' });
        res.json({ success: true, url: `/voice/${fileName}` });
    });
});

// ─── Media API ───
app.get('/api/media', (req, res) => {
    const mediaResult = { films: [], series: [], songs: [] };
    ['films', 'songs'].forEach(folder => {
        const folderPath = path.join(mediaPath, folder);
        if (fs.existsSync(folderPath)) {
            try { mediaResult[folder] = fs.readdirSync(folderPath); } catch (err) { }
        }
    });
    const seriesPath = path.join(mediaPath, 'series');
    if (fs.existsSync(seriesPath)) {
        try {
            const shows = fs.readdirSync(seriesPath, { withFileTypes: true });
            shows.forEach(show => {
                if (show.isDirectory()) {
                    const episodes = fs.readdirSync(path.join(seriesPath, show.name)).filter(f => /\.(mp4|mkv|avi|webm|mov)$/i.test(f));
                    if (episodes.length > 0) mediaResult.series.push({ showName: show.name, episodes });
                }
            });
        } catch (err) { }
    }
    res.json(mediaResult);
});
// ─── Apps API ───
app.get('/api/apps', (req, res) => {
    console.log(`[API] GET /api/apps - Scanning folder: ${androidPath}`);
    if (fs.existsSync(androidPath)) {
        try {
            // Optimized scanner with 3-level depth limit to prevent hangs
            const scan = (dir, depth = 0) => {
                if (depth > 3) return [];
                let results = [];
                try {
                    const list = fs.readdirSync(dir);
                    for (const file of list) {
                        try {
                            const fullPath = path.join(dir, file);
                            const stat = fs.statSync(fullPath);
                            if (stat.isDirectory()) {
                                results = results.concat(scan(fullPath, depth + 1));
                            } else if (file.endsWith('.apk')) {
                                results.push({
                                    name: path.relative(androidPath, fullPath).replace(/\\/g, '/'),
                                    size: stat.size
                                });
                            }
                        } catch (e) { }
                    }
                } catch (e) { }
                return results;
            };

            const apps = scan(androidPath);
            // Add a test app to the games folder so it's visible by default
            apps.push({ name: 'games/Connection_Test.apk', size: 1024 * 1024 * 5 });
            return res.json(apps);
        } catch (err) {
            console.error('Error reading Android folder:', err);
        }
    }
    res.json([]);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server listening on port ${PORT} (0.0.0.0)`);
});
