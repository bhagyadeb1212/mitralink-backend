const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./database');
const jwt = require('jsonwebtoken');
const axios = require('axios');

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

// 🚀 OTPless Config
const OTPLESS_APP_ID = process.env.OTPLESS_APP_ID;
const OTPLESS_APP_SECRET = process.env.OTPLESS_APP_SECRET;

// 📲 DIRECT LOGIN (No OTP)
app.post('/auth/login', async (req, res) => {
  let { phone_number } = req.body;
  if (phone_number) phone_number = phone_number.replace(/\s+/g, '').replace(/-/g, '').trim();

  if (!phone_number) return res.status(400).json({ error: 'Phone number required' });

  handleUserLogin(phone_number, `login_${Date.now()}`, res);
});

// Helper to handle database user creation/login
function handleUserLogin(phone_number, externalId, res) {
  db.get('SELECT id, phone_number, username FROM users WHERE phone_number = ?', [phone_number], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    if (row) {
      const token = jwt.sign({ userId: row.id, phone_number }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ success: true, token, user: row, isNewUser: !row.username });
    } else {
      db.run('INSERT INTO users (phone_number, created_at) VALUES (?, CURRENT_TIMESTAMP)', [phone_number], function(err) {
        if (err) {
            console.error('INSERT FAILED:', err.message);
            return res.status(500).json({ error: 'Failed to create user', details: err.message });
        }
        const newUserId = this.lastID;
        const token = jwt.sign({ userId: newUserId, phone_number }, JWT_SECRET, { expiresIn: '7d' });
        return res.status(201).json({ success: true, token, user: { id: newUserId, phone_number }, isNewUser: true });
      });
    }
  });
}

// START SERVER
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
