const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
    origin: '*', // This allows your phone to connect during testing
    credentials: true
}));

// ... your routes ...app.listen(4000, '0.0.0.0', () => {
    console.log('Server running on http://192.168.1.33:4000');
});