const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');

    // Create Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT UNIQUE NOT NULL,
      username TEXT,
      default_avatar TEXT,
      coin_balance INTEGER DEFAULT 0,
      is_admin BOOLEAN DEFAULT 0,
      push_token TEXT,
      last_seen INTEGER DEFAULT NULL,
      hide_last_seen BOOLEAN DEFAULT 0,
      latitude REAL DEFAULT NULL,
      longitude REAL DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, () => {
      // Gracefully add new columns to existing tables
      db.run("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", () => { });
      db.run("ALTER TABLE users ADD COLUMN push_token TEXT", () => { });
      db.run("ALTER TABLE users ADD COLUMN default_avatar TEXT", () => { });
      db.run("ALTER TABLE users ADD COLUMN last_seen INTEGER DEFAULT NULL", () => { });
      db.run("ALTER TABLE users ADD COLUMN hide_last_seen BOOLEAN DEFAULT 0", () => { });
      db.run("ALTER TABLE users ADD COLUMN who_can_see_online TEXT DEFAULT 'everyone'", () => { });
      db.run("ALTER TABLE users ADD COLUMN who_can_see_last_seen TEXT DEFAULT 'everyone'", () => { });
      db.run("ALTER TABLE users ADD COLUMN latitude REAL DEFAULT NULL", () => { });
      db.run("ALTER TABLE users ADD COLUMN longitude REAL DEFAULT NULL", () => { });

      // Ensure Groq User Exists
      db.run("INSERT OR IGNORE INTO users (phone_number, username, default_avatar, is_admin) VALUES (?, ?, ?, ?)", [
        'Groq',
        'Groq Assistant',
        'https://ui-avatars.com/api/?name=Groq&background=6366f1&color=fff&size=256',
        1
      ]);
      // Also update existing Gemini user to Groq (for existing databases)
      db.run("UPDATE users SET phone_number = 'Groq', username = 'Groq Assistant', default_avatar = 'https://ui-avatars.com/api/?name=Groq&background=6366f1&color=fff&size=256' WHERE phone_number = 'Gemini'", () => { });
    });

    // Create Contacts/Relationships table
    // specific_avatar: premium feature
    // bypass_privacy_rules: requires OTP/premium to set to true
    db.run(`CREATE TABLE IF NOT EXISTS contacts (
      user_id INTEGER,
      contact_id INTEGER,
      specific_avatar TEXT,
      bypass_privacy_rules BOOLEAN DEFAULT 0,
      premium_expires_at INTEGER DEFAULT NULL,
      is_locked BOOLEAN DEFAULT 0,
      locked_otp TEXT,
      PRIMARY KEY (user_id, contact_id),
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (contact_id) REFERENCES users (id)
    )`, () => {
      db.run("ALTER TABLE contacts ADD COLUMN specific_avatar TEXT", () => { });
      db.run("ALTER TABLE contacts ADD COLUMN bypass_privacy_rules BOOLEAN DEFAULT 0", () => { });
      db.run("ALTER TABLE contacts ADD COLUMN premium_expires_at INTEGER DEFAULT NULL", () => { });
      db.run("ALTER TABLE contacts ADD COLUMN is_locked BOOLEAN DEFAULT 0", () => { });
      db.run("ALTER TABLE contacts ADD COLUMN locked_otp TEXT", () => { });
      db.run("ALTER TABLE contacts ADD COLUMN is_blocked BOOLEAN DEFAULT 0", () => { });
      db.run("ALTER TABLE contacts ADD COLUMN is_muted BOOLEAN DEFAULT 0", () => { });
    });

    // Create Messages table
    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER,
      receiver_id INTEGER,
      content TEXT,
      type TEXT DEFAULT 'text',
      durationList INTEGER DEFAULT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users (id),
      FOREIGN KEY (receiver_id) REFERENCES users (id),
      FOREIGN KEY (group_id) REFERENCES groups (id)
    )`, () => {
      db.run("ALTER TABLE messages ADD COLUMN durationList INTEGER", () => { });
      db.run("ALTER TABLE messages ADD COLUMN group_id INTEGER", () => { });
    });

    db.run(`CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar_url TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS group_members (
      group_id INTEGER,
      user_id INTEGER,
      role TEXT DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (group_id, user_id),
      FOREIGN KEY (group_id) REFERENCES groups (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS statuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'image',
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Create Calls table
    db.run(`CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caller_id INTEGER,
      receiver_id INTEGER,
      type TEXT,
      status TEXT DEFAULT 'pending',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (caller_id) REFERENCES users (id),
      FOREIGN KEY (receiver_id) REFERENCES users (id)
    )`);

    // Create Coin Transactions table
    db.run(`CREATE TABLE IF NOT EXISTS coin_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      amount INTEGER,
      source TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Create OTPs table
    db.run(`CREATE TABLE IF NOT EXISTS otps (
      phone_number TEXT PRIMARY KEY,
      otp TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // --- REELS TABLES ---
    // Create Reels table
    db.run(`CREATE TABLE IF NOT EXISTS reels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      content_url TEXT NOT NULL,
      type TEXT NOT NULL, -- 'video' or 'image'
      caption TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Create Reel Likes table
    db.run(`CREATE TABLE IF NOT EXISTS reel_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      reel_id INTEGER,
      reaction_type TEXT DEFAULT 'like',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (reel_id) REFERENCES reels (id)
    )`);

    // Create Reel Comments table
    db.run(`CREATE TABLE IF NOT EXISTS reel_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      reel_id INTEGER,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (reel_id) REFERENCES reels (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS reel_profiles (
      user_id INTEGER PRIMARY KEY,
      name TEXT,
      bio TEXT,
      avatar_url TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`, () => {
      db.run("ALTER TABLE reel_profiles ADD COLUMN avatar_url TEXT", () => { });
    });

    // Create Reel Follows table
    db.run(`CREATE TABLE IF NOT EXISTS reel_follows (
      follower_id INTEGER,
      following_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (follower_id, following_id),
      FOREIGN KEY (follower_id) REFERENCES users (id),
      FOREIGN KEY (following_id) REFERENCES users (id)
    )`);

    // Create Reel Notifications table
    db.run(`CREATE TABLE IF NOT EXISTS reel_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receiver_id INTEGER,
      sender_id INTEGER,
      type TEXT NOT NULL, -- 'follow', 'like', 'comment', 'share'
      reel_id INTEGER,
      content TEXT,
      is_read BOOLEAN DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (receiver_id) REFERENCES users (id),
      FOREIGN KEY (sender_id) REFERENCES users (id),
      FOREIGN KEY (reel_id) REFERENCES reels (id)
    )`);
  }
});

module.exports = db;
