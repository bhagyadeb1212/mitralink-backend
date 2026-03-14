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

// 📲 SEND OTP (MSG91)
app.post('/auth/send-otp', async (req, res) => {
  const { phone_number } = req.body;
  if (!phone_number) return res.status(400).json({ error: 'Phone number required' });

  // 🛡️ Bypass for specific magic number
  if (phone_number === BYPASS_PHONE) {
    return res.json({ success: true, message: 'OTP sent (Bypass Mode)', bypass: true });
  }

  try {
    const response = await axios.post(`https://api.msg91.com/api/v5/otp?template_id=${MSG91_TEMPLATE_ID}&mobile=${phone_number.replace('+', '')}&authkey=${MSG91_AUTH_KEY}`);
    const data = response.data;
    if (data.type === 'success') {
      res.json({ success: true, message: 'OTP sent via MSG91' });
    } else {
      res.status(500).json({ error: data.message || 'Failed to send OTP' });
    }
  } catch (err) {
    console.error("MSG91 Send Error:", err.response?.data || err.message);
    res.status(500).json({ error: 'Internal server error while sending OTP' });
  }
});

// ✅ VERIFY OTP - Dev Mode: All numbers work with OTP 123456
app.post('/auth/verify-otp', async (req, res) => {
  let { phone_number, otp, uid } = req.body;
  if (phone_number) phone_number = phone_number.replace(/\s+/g, '').replace(/-/g, '').trim();

  if (!phone_number) return res.status(400).json({ error: 'Phone number required' });

  // 🛡️ DEV MODE: Accept ALL numbers with otp 123456 (or bypass numbers)
  if (otp === '123456' || uid) {
    return handleUserLogin(phone_number, uid || `dev_${Date.now()}`, res);
  }

  return res.status(401).json({ error: 'Invalid OTP. Use 123456 for testing.' });
});

// ✅ VERIFY OTPLESS
app.post('/auth/verify-otpless', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'OTPless token required' });

  try {
    // Verify token with OTPless
    const response = await axios.post('https://auth.otpless.app/auth/v1/userinfo', {
      token
    }, {
      headers: {
        'clientId': OTPLESS_APP_ID,
        'clientSecret': OTPLESS_APP_SECRET,
        'Content-Type': 'application/json'
      }
    });

    const userData = response.data;
    const phone_number = userData.phone_number || userData.phoneNumber;
    
    if (!phone_number) {
        return res.status(400).json({ error: 'Could not retrieve phone number from OTPless' });
    }

    // Format phone number to match our DB format (with + prefix)
    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+${phone_number}`;

    return handleUserLogin(formattedPhone, userData.token || userData.uid, res);
  } catch (err) {
    console.error("OTPless Verification Error:", err.response?.data || err.message);
    // FALLBACK for development if App ID is not set
    if (!OTPLESS_APP_ID || !OTPLESS_APP_SECRET) {
        console.warn("OTPless App ID/Secret missing. Falling back to mock verification for dev.");
        // Mock verification for testing if credentials aren't provided yet
        return res.json({ 
            success: true, 
            token: jwt.sign({ userId: 1, phone_number: '+910000000000' }, JWT_SECRET, { expiresIn: '7d' }),
            user: { id: 1, phone_number: '+910000000000', username: 'OtplessUser' } 
        });
    }
    res.status(500).json({ error: 'Failed to verify with OTPless' });
  }
});

// Helper to handle database user creation/login
function handleUserLogin(phone_number, externalId, res) {
  db.get('SELECT id, phone_number, username FROM users WHERE phone_number = ?', [phone_number], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    if (row) {
      const token = jwt.sign({ userId: row.id, phone_number }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ success: true, token, user: row });
    } else {
      db.run('INSERT INTO users (phone_number, created_at) VALUES (?, CURRENT_TIMESTAMP)', [phone_number], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to create user' });
        const newUserId = this.lastID;
        const token = jwt.sign({ userId: newUserId, phone_number }, JWT_SECRET, { expiresIn: '7d' });
        return res.status(201).json({ success: true, token, user: { id: newUserId, phone_number } });
      });
    }
  });
}

// ✅ TEST LOGIN (Bypass OTP)
app.post('/auth/test-login', async (req, res) => {
  let { phone_number } = req.body;
  if (phone_number) phone_number = phone_number.replace(/\s+/g, '').replace(/-/g, '').trim();

  if (!phone_number) return res.status(400).json({ error: 'Phone number required' });

  console.log(`[TEST MODE] Direct login for: ${phone_number}`);
  return handleUserLogin(phone_number, `test_${Date.now()}`, res);
});

// Keeping the old endpoint temporarily for compatibility with old builds
app.post('/auth/verify-firebase', async (req, res) => {
  const { phone_number, uid } = req.body;
  handleUserLogin(phone_number, uid, res);
});

// START SERVER
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
