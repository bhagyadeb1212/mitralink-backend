const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./database');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const Groq = require('groq-sdk');
const EdgeTTS = require('edge-tts-universal').EdgeTTS;

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 🔍 DEBUG: Log all incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}`);
    next();
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_dev_key';
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tts = new EdgeTTS();

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---

app.post('/auth/login', async (req, res) => {
  let { phone_number } = req.body;
  if (phone_number) phone_number = phone_number.replace(/\s+/g, '').replace(/-/g, '').trim();
  if (!phone_number) return res.status(400).json({ error: 'Phone number required' });
  handleUserLogin(phone_number, `login_${Date.now()}`, res);
});

app.post('/auth/test-login', async (req, res) => {
  let { phone_number } = req.body;
  if (phone_number) phone_number = phone_number.replace(/\s+/g, '').replace(/-/g, '').trim();
  if (!phone_number) return res.status(400).json({ error: 'Phone number required' });
  console.log(`[TEST MODE] Direct login for: ${phone_number}`);
  handleUserLogin(phone_number, `test_${Date.now()}`, res);
});

app.post('/auth/verify-firebase', async (req, res) => {
  const { phone_number, uid } = req.body;
  handleUserLogin(phone_number, uid, res);
});

function handleUserLogin(phone_number, externalId, res) {
  db.get('SELECT id, phone_number, username, is_admin FROM users WHERE phone_number = ?', [phone_number], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    if (row) {
      const token = jwt.sign({ userId: row.id, phone_number }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ success: true, token, user: row, isNewUser: !row.username });
    } else {
      db.run('INSERT INTO users (phone_number, created_at) VALUES (?, CURRENT_TIMESTAMP)', [phone_number], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to create user' });
        const newUserId = this.lastID;
        const token = jwt.sign({ userId: newUserId, phone_number }, JWT_SECRET, { expiresIn: '7d' });
        return res.status(201).json({ success: true, token, user: { id: newUserId, phone_number }, isNewUser: true });
      });
    }
  });
}

// --- USER ROUTES ---

app.get('/users/me', authenticateToken, (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.user.userId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'User not found' });
    res.json(row);
  });
});

app.post('/users/update-profile', authenticateToken, (req, res) => {
  const { username } = req.body;
  db.run('UPDATE users SET username = ? WHERE id = ?', [username, req.user.userId], (err) => {
    if (err) return res.status(500).json({ error: 'Update failed' });
    res.json({ success: true });
  });
});

app.get('/users/search', authenticateToken, (req, res) => {
  const { phone } = req.query;
  db.all('SELECT id, username, phone_number, default_avatar FROM users WHERE phone_number LIKE ?', [`%${phone}%`], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Search failed' });
    res.json(rows);
  });
});

app.post('/users/location', authenticateToken, (req, res) => {
  const { latitude, longitude } = req.body;
  db.run('UPDATE users SET latitude = ?, longitude = ? WHERE id = ?', [latitude, longitude, req.user.userId], (err) => {
    res.json({ success: !err });
  });
});

// --- CONTACT ROUTES ---

app.get('/contacts', authenticateToken, (req, res) => {
  const query = `
    SELECT u.id, u.username, u.phone_number, u.default_avatar, c.is_blocked, c.is_muted
    FROM contacts c
    JOIN users u ON c.contact_id = u.id
    WHERE c.user_id = ?
  `;
  db.all(query, [req.user.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch contacts' });
    res.json(rows);
  });
});

app.post('/contacts/add', authenticateToken, (req, res) => {
  const { contact_id } = req.body;
  db.run('INSERT OR IGNORE INTO contacts (user_id, contact_id) VALUES (?, ?)', [req.user.userId, contact_id], (err) => {
    if (err) return res.status(500).json({ error: 'Failed to add contact' });
    res.json({ success: true });
  });
});

app.post('/contacts/block', authenticateToken, (req, res) => {
  const { contact_id } = req.body;
  db.run('UPDATE contacts SET is_blocked = 1 WHERE user_id = ? AND contact_id = ?', [req.user.userId, contact_id], (err) => {
    res.json({ success: !err });
  });
});

// --- MESSAGE ROUTES ---

app.get('/messages/:id', authenticateToken, (req, res) => {
  const targetId = req.params.id;
  let query, params;

  if (targetId.startsWith('group_')) {
    const groupId = targetId.split('_')[1];
    query = 'SELECT * FROM messages WHERE group_id = ? ORDER BY timestamp ASC';
    params = [groupId];
  } else {
    query = 'SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY timestamp ASC';
    params = [req.user.userId, targetId, targetId, req.user.userId];
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch messages' });
    res.json(rows);
  });
});

// --- GROUP ROUTES ---

app.get('/groups', authenticateToken, (req, res) => {
  const query = `
    SELECT g.* FROM groups g
    JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.user_id = ?
  `;
  db.all(query, [req.user.userId], (err, rows) => {
    res.json(rows || []);
  });
});

app.post('/groups/create', authenticateToken, (req, res) => {
  const { name, memberIds } = req.body;
  db.run('INSERT INTO groups (name, created_by) VALUES (?, ?)', [name, req.user.userId], function(err) {
    if (err) return res.status(500).json({ error: 'Failed' });
    const groupId = this.lastID;
    const allMembers = [...new Set([...memberIds, req.user.userId])];
    allMembers.forEach(uid => {
      db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [groupId, uid]);
    });
    res.json({ id: groupId, name });
  });
});

// --- SOCIAL CONTENT (REELS & STATUS) ---

app.get('/reels/feed', authenticateToken, (req, res) => {
  db.all('SELECT r.*, u.username, u.default_avatar FROM reels r JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC LIMIT 50', (err, rows) => {
    res.json(rows || []);
  });
});

app.post('/reels/upload', authenticateToken, (req, res) => {
  const { content_url, type, caption } = req.body;
  db.run('INSERT INTO reels (user_id, content_url, type, caption) VALUES (?, ?, ?, ?)', [req.user.userId, content_url, type, caption], (err) => {
    res.json({ success: !err });
  });
});

app.post('/reels/like', authenticateToken, (req, res) => {
  const { reel_id, reaction_type } = req.body;
  db.run('INSERT INTO reel_likes (user_id, reel_id, reaction_type) VALUES (?, ?, ?)', [req.user.userId, reel_id, reaction_type || 'like'], (err) => {
    res.json({ success: !err });
  });
});

app.get('/statuses', authenticateToken, (req, res) => {
  db.all('SELECT s.*, u.username, u.default_avatar FROM statuses s JOIN users u ON s.user_id = u.id WHERE expires_at > CURRENT_TIMESTAMP OR expires_at IS NULL', (err, rows) => {
    res.json(rows || []);
  });
});

app.post('/statuses', authenticateToken, (req, res) => {
  const { content, type } = req.body;
  db.run('INSERT INTO statuses (user_id, content, type) VALUES (?, ?, ?)', [req.user.userId, content, type || 'image'], (err) => {
    res.json({ success: !err });
  });
});

app.post('/coins/claim-ad', authenticateToken, (req, res) => {
  db.run('UPDATE users SET coin_balance = coin_balance + 10 WHERE id = ?', [req.user.userId], (err) => {
    res.json({ success: !err });
  });
});

// --- SOCKET.IO LOGIC ---

io.on('connection', (socket) => {
  const token = socket.handshake.auth.token;
  if (!token) return socket.disconnect();

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return socket.disconnect();
    const userId = decoded.userId;
    socket.join(`user_${userId}`);
    console.log(`User ${userId} connected`);

    socket.on('send_message', async (data) => {
      const { receiverId, groupId, content, type } = data;
      
      const msg = {
        sender_id: userId,
        receiver_id: receiverId,
        group_id: groupId,
        content,
        type,
        timestamp: new Date().toISOString()
      };

      // Save to database
      db.run('INSERT INTO messages (sender_id, receiver_id, group_id, content, type) VALUES (?, ?, ?, ?, ?)', 
        [userId, receiverId, groupId, content, type]);

      // Broadcast
      if (groupId) {
        io.to(`group_${groupId}`).emit('receive_message', msg);
      } else {
        io.to(`user_${receiverId}`).emit('receive_message', msg);
        socket.emit('message_sent', msg);

        // --- AI ASSISTANT INTERCEPT (Groq) ---
        db.get("SELECT id FROM users WHERE phone_number = 'Groq'", (err, aiUser) => {
          if (aiUser && receiverId == aiUser.id) {
            (async () => {
              try {
                console.log(`--- AI BRAIN ACTIVE ---`);
                const completion = await groq.chat.completions.create({
                  messages: [{ role: "user", content: content }],
                  model: "llama-3.3-70b-versatile",
                });
                const aiReply = completion.choices[0].message.content;

                const aiMsg = {
                  sender_id: aiUser.id,
                  receiver_id: userId,
                  content: aiReply,
                  type: 'text',
                  timestamp: new Date().toISOString()
                };
                db.run('INSERT INTO messages (sender_id, receiver_id, content, type) VALUES (?, ?, ?, ?)', [aiUser.id, userId, aiReply, 'text']);
                io.to(`user_${userId}`).emit('receive_message', aiMsg);
              } catch (aiErr) {
                console.error('AI Error:', aiErr);
              }
            })();
          }
        });
      }
    });

    // --- CALL SIGNALING ---
    socket.on('call_user', (data) => {
      io.to(`user_${data.userToCall}`).emit('call_user', { ...data, from: userId, callId: Date.now() });
      socket.emit('call_initiated', { callId: Date.now() });
    });

    socket.on('answer_call', (data) => {
      io.to(`user_${data.to}`).emit('call_accepted', data.signal);
    });

    socket.on('reject_call', (data) => {
      io.to(`user_${data.to}`).emit('call_rejected');
    });

    socket.on('end_call', (data) => {
      io.to(`user_${data.to}`).emit('end_call');
    });

    socket.on('switch_call_type', (data) => {
      io.to(`user_${data.to}`).emit('switch_call_type', { callType: data.callType });
    });

    socket.on('request_switch_call_type', (data) => {
      io.to(`user_${data.to}`).emit('request_switch_call_type', { callType: data.callType });
    });

    socket.on('accept_switch_call_type', (data) => {
      io.to(`user_${data.to}`).emit('accept_switch_call_type', { callType: data.callType });
    });

    socket.on('decline_switch_call_type', (data) => {
      io.to(`user_${data.to}`).emit('decline_switch_call_type');
    });

    socket.on('call_mute', (data) => {
      io.to(`user_${data.to}`).emit('call_mute', { isMuted: data.isMuted });
    });

    socket.on('camera_pause', (data) => {
      io.to(`user_${data.to}`).emit('camera_pause', { isPaused: data.isPaused });
    });

    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
    });
  });
});

// --- ADDITIONAL SOCIAL & ADMIN ROUTES ---

app.get('/reels/follow-status/:userId', authenticateToken, (req, res) => {
  db.get('SELECT * FROM reel_follows WHERE follower_id = ? AND following_id = ?', [req.user.userId, req.params.userId], (err, row) => {
    res.json({ isFollowing: !!row });
  });
});

app.post('/reels/follow', authenticateToken, (req, res) => {
  const { following_id } = req.body;
  db.run('INSERT OR IGNORE INTO reel_follows (follower_id, following_id) VALUES (?, ?)', [req.user.userId, following_id], (err) => {
    res.json({ success: !err });
  });
});

app.get('/reels/suggestions', authenticateToken, (req, res) => {
  db.all('SELECT id, username, default_avatar FROM users WHERE id != ? LIMIT 10', [req.user.userId], (err, rows) => {
    res.json({ creators: rows || [], reels: [] });
  });
});

app.get('/reels/notifications', authenticateToken, (req, res) => {
  db.all('SELECT * FROM reel_notifications WHERE receiver_id = ? ORDER BY timestamp DESC', [req.user.userId], (err, rows) => {
    res.json(rows || []);
  });
});

app.post('/reels/notifications/read', authenticateToken, (req, res) => {
  db.run('UPDATE reel_notifications SET is_read = 1 WHERE receiver_id = ?', [req.user.userId], (err) => {
    res.json({ success: !err });
  });
});

app.delete('/reels/notifications/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM reel_notifications WHERE id = ? AND receiver_id = ?', [req.params.id, req.user.userId], (err) => {
    res.json({ success: !err });
  });
});

app.delete('/reels/notifications', authenticateToken, (req, res) => {
  db.run('DELETE FROM reel_notifications WHERE receiver_id = ?', [req.user.userId], (err) => {
    res.json({ success: !err });
  });
});

app.post('/reels/profile', authenticateToken, (req, res) => {
  const { name, bio, avatar_url } = req.body;
  db.run('INSERT OR REPLACE INTO reel_profiles (user_id, name, bio, avatar_url) VALUES (?, ?, ?, ?)', [req.user.userId, name, bio, avatar_url], (err) => {
    res.json({ success: !err });
  });
});

app.get('/reels/profile', authenticateToken, (req, res) => {
  db.get('SELECT * FROM reel_profiles WHERE user_id = ?', [req.user.userId], (err, row) => {
    res.json(row || {});
  });
});

// --- ADMIN ROUTES ---

app.get('/admin/creators', authenticateToken, (req, res) => {
  db.all('SELECT id, username, phone_number, is_admin FROM users', (err, rows) => {
    res.json(rows || []);
  });
});

app.post('/admin/creators/toggle-admin', authenticateToken, (req, res) => {
  const { user_id } = req.body;
  db.run('UPDATE users SET is_admin = 1 - is_admin WHERE id = ?', [user_id], (err) => {
    res.json({ success: !err });
  });
});

app.get('/admin/reels', authenticateToken, (req, res) => {
  db.all('SELECT * FROM reels', (err, rows) => {
    res.json(rows || []);
  });
});

app.delete('/admin/reels/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM reels WHERE id = ?', [req.params.id], (err) => {
    res.json({ success: !err });
  });
});

app.get('/admin/stats', authenticateToken, (req, res) => {
  db.get('SELECT (SELECT COUNT(*) FROM users) as totalUsers, (SELECT COUNT(*) FROM reels) as totalReels, (SELECT COUNT(*) FROM groups) as totalGroups', (err, row) => {
    res.json(row || { totalUsers: 0, totalReels: 0, totalGroups: 0 });
  });
});

app.get('/admin/users/search', authenticateToken, (req, res) => {
  const { phone } = req.query;
  db.all('SELECT * FROM users WHERE phone_number LIKE ?', [`%${phone}%`], (err, rows) => {
    res.json(rows || []);
  });
});

app.get('/admin/messages/:userId', authenticateToken, (req, res) => {
  db.all('SELECT * FROM messages WHERE sender_id = ? OR receiver_id = ?', [req.params.userId, req.params.userId], (err, rows) => {
    res.json(rows || []);
  });
});

// START SERVER
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

