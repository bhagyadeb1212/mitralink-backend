const db = require('./database');

const phoneNumber = process.argv[2];

if (!phoneNumber) {
    console.error('Usage: node promote_admin.js <phone_number>');
    process.exit(1);
}

db.run('UPDATE users SET is_admin = 1 WHERE phone_number = ?', [phoneNumber], (err) => {
    if (err) {
        console.error('Error promoting user:', err.message);
    } else {
        console.log(`Successfully promoted ${phoneNumber} to admin.`);
    }
    process.exit(0);
});
