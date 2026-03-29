/**
 * Tawasl Server — Local WiFi Social Network
 * Node.js v22+ built-in SQLite, Express, WebSocket
 * Run: node server.js
 */

const express   = require('express');
const http      = require('http');
const WebSocket = require('ws');
const path      = require('path');
const crypto    = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

// ─── DB ──────────────────────────────────────────────────────────────────────
const db = new DatabaseSync(path.join(__dirname, 'tawasl.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT    NOT NULL,
    code         TEXT    UNIQUE NOT NULL,
    avatar_color TEXT    NOT NULL,
    is_admin     INTEGER DEFAULT 0,
    created_at   TEXT    DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    content    TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER NOT NULL,
    to_user_id   INTEGER NOT NULL,
    content      TEXT    NOT NULL,
    is_read      INTEGER DEFAULT 0,
    created_at   TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id)   REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_msg ON messages (from_user_id, to_user_id);
`);

const COLORS = ['#5B8AF0','#E05B78','#3DAA79','#E08B3D','#9B5BE0','#3DB8D4','#E0B93D','#E05B5B'];

function generateCode() {
  const chk = db.prepare('SELECT 1 FROM users WHERE code = ?');
  for (let i = 0; i < 200; i++) {
    const c = crypto.randomBytes(3).toString('hex').toUpperCase();
    if (!chk.get(c)) return c;
  }
  throw new Error('Cannot generate code');
}

// ─── WebSocket ────────────────────────────────────────────────────────────────
const wsUserMap = new Map();
const userWsMap = new Map();

function broadcast(data) {
  const m = JSON.stringify(data);
  wss.clients.forEach(c => c.readyState === WebSocket.OPEN && c.send(m));
}

function toUser(uid, data) {
  const s = userWsMap.get(uid);
  if (!s) return;
  const m = JSON.stringify(data);
  s.forEach(ws => ws.readyState === WebSocket.OPEN && ws.send(m));
}

wss.on('connection', ws => {
  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'auth' && msg.userId) {
        const uid = parseInt(msg.userId);
        wsUserMap.set(ws, uid);
        if (!userWsMap.has(uid)) userWsMap.set(uid, new Set());
        userWsMap.get(uid).add(ws);
        broadcast({ type: 'online_users', users: [...new Set(wsUserMap.values())] });
      }
    } catch (_) {}
  });
  ws.on('close', () => {
    const uid = wsUserMap.get(ws);
    if (uid !== undefined) {
      wsUserMap.delete(ws);
      const s = userWsMap.get(uid);
      if (s) { s.delete(ws); if (!s.size) userWsMap.delete(uid); }
      broadcast({ type: 'online_users', users: [...new Set(wsUserMap.values())] });
    }
  });
});

// ─── API ──────────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Register
app.post('/api/register', (req, res) => {
  const name = req.body.username?.trim();
  if (!name || name.length < 2 || name.length > 30)
    return res.status(400).json({ error: 'الاسم يجب أن يكون 2-30 حرف' });
  try {
    const code  = generateCode();
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const r     = db.prepare('INSERT INTO users (username,code,avatar_color) VALUES(?,?,?)').run(name, code, color);
    const user  = db.prepare('SELECT * FROM users WHERE id=?').get(r.lastInsertRowid);
    broadcast({ type: 'new_user', user });
    res.json({ user });
  } catch (e) { res.status(500).json({ error: 'فشل التسجيل' }); }
});

// Login
app.post('/api/login', (req, res) => {
  const code = req.body.code?.trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'الكود مطلوب' });
  const user = db.prepare('SELECT * FROM users WHERE code=?').get(code);
  if (!user) return res.status(404).json({ error: 'الكود غير صحيح' });
  res.json({ user });
});

// All users
app.get('/api/users', (_, res) =>
  res.json(db.prepare('SELECT id,username,avatar_color,is_admin,created_at FROM users ORDER BY username COLLATE NOCASE').all())
);

// Delete user (admin)
app.delete('/api/users/:id', (req, res) => {
  const admin = db.prepare('SELECT * FROM users WHERE code=? AND is_admin=1').get(req.body.adminCode);
  if (!admin) return res.status(403).json({ error: 'غير مصرح' });
  const tid = parseInt(req.params.id);
  if (tid === admin.id) return res.status(400).json({ error: 'لا يمكن حذف حسابك' });
  db.prepare('DELETE FROM users WHERE id=?').run(tid);
  broadcast({ type: 'user_deleted', userId: tid });
  res.json({ success: true });
});

// Promote admin
app.post('/api/admin/promote', (req, res) => {
  if (req.body.secretKey !== (process.env.ADMIN_SECRET || 'TAWASL_SECRET_ADMIN_KEY'))
    return res.status(403).json({ error: 'Invalid key' });
  db.prepare('UPDATE users SET is_admin=1 WHERE id=?').run(req.body.userId);
  res.json({ success: true });
});

// Get posts
app.get('/api/posts', (_, res) =>
  res.json(db.prepare(`
    SELECT p.id,p.content,p.created_at,p.user_id,u.username,u.avatar_color,u.is_admin
    FROM posts p JOIN users u ON p.user_id=u.id ORDER BY p.created_at DESC LIMIT 200
  `).all())
);

// Create post
app.post('/api/posts', (req, res) => {
  const { userId, content, userCode } = req.body;
  if (!content?.trim() || content.length > 1000) return res.status(400).json({ error: 'المحتوى مطلوب (1-1000 حرف)' });
  const user = db.prepare('SELECT * FROM users WHERE id=? AND code=?').get(userId, userCode);
  if (!user) return res.status(403).json({ error: 'غير مصرح' });
  const r    = db.prepare('INSERT INTO posts (user_id,content) VALUES(?,?)').run(userId, content.trim());
  const post = db.prepare('SELECT p.id,p.content,p.created_at,p.user_id,u.username,u.avatar_color,u.is_admin FROM posts p JOIN users u ON p.user_id=u.id WHERE p.id=?').get(r.lastInsertRowid);
  broadcast({ type: 'new_post', post });
  res.json(post);
});

// Delete post
app.delete('/api/posts/:id', (req, res) => {
  const { userId, userCode } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id=? AND code=?').get(userId, userCode);
  if (!user) return res.status(403).json({ error: 'غير مصرح' });
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'غير موجود' });
  if (post.user_id !== user.id && !user.is_admin) return res.status(403).json({ error: 'غير مصرح' });
  db.prepare('DELETE FROM posts WHERE id=?').run(req.params.id);
  broadcast({ type: 'post_deleted', postId: parseInt(req.params.id) });
  res.json({ success: true });
});

// Get messages
app.get('/api/messages/:a/:b', (req, res) => {
  const [a, b] = [parseInt(req.params.a), parseInt(req.params.b)];
  db.prepare('UPDATE messages SET is_read=1 WHERE from_user_id=? AND to_user_id=?').run(b, a);
  res.json(db.prepare(`
    SELECT m.id,m.content,m.created_at,m.is_read,m.from_user_id,m.to_user_id,u.username,u.avatar_color
    FROM messages m JOIN users u ON m.from_user_id=u.id
    WHERE (m.from_user_id=? AND m.to_user_id=?) OR (m.from_user_id=? AND m.to_user_id=?)
    ORDER BY m.created_at ASC LIMIT 500
  `).all(a, b, b, a));
});

// Send message
app.post('/api/messages', (req, res) => {
  const { fromUserId, toUserId, content, userCode } = req.body;
  if (!content?.trim() || content.length > 2000) return res.status(400).json({ error: 'الرسالة مطلوبة' });
  const user = db.prepare('SELECT * FROM users WHERE id=? AND code=?').get(fromUserId, userCode);
  if (!user) return res.status(403).json({ error: 'غير مصرح' });
  const r   = db.prepare('INSERT INTO messages (from_user_id,to_user_id,content) VALUES(?,?,?)').run(fromUserId, toUserId, content.trim());
  const msg = db.prepare('SELECT m.id,m.content,m.created_at,m.is_read,m.from_user_id,m.to_user_id,u.username,u.avatar_color FROM messages m JOIN users u ON m.from_user_id=u.id WHERE m.id=?').get(r.lastInsertRowid);
  toUser(parseInt(toUserId), { type: 'new_message', message: msg });
  res.json(msg);
});

// Delete message
app.delete('/api/messages/:id', (req, res) => {
  const { userId, userCode } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id=? AND code=?').get(userId, userCode);
  if (!user) return res.status(403).json({ error: 'غير مصرح' });
  const msg = db.prepare('SELECT * FROM messages WHERE id=?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'غير موجودة' });
  if (msg.from_user_id !== user.id && !user.is_admin) return res.status(403).json({ error: 'غير مصرح' });
  db.prepare('DELETE FROM messages WHERE id=?').run(req.params.id);
  const mid = parseInt(req.params.id);
  toUser(msg.to_user_id, { type: 'message_deleted', messageId: mid });
  toUser(msg.from_user_id, { type: 'message_deleted', messageId: mid });
  res.json({ success: true });
});

// Unread counts
app.get('/api/messages/unread/:uid', (req, res) =>
  res.json(db.prepare('SELECT from_user_id as userId, COUNT(*) as count FROM messages WHERE to_user_id=? AND is_read=0 GROUP BY from_user_id').all(parseInt(req.params.uid)))
);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const nets = require('os').networkInterfaces();
  const ips  = Object.values(nets).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║       TAWASL — SERVER RUNNING        ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  Local:   http://localhost:${PORT}       ║`);
  ips.forEach(ip => console.log(`║  Network: http://${ip}:${PORT}`));
  console.log('╚══════════════════════════════════════╝\n');
});
