const express = require('express');
const cors = require('cors');
const app = express();

// Use your specific IP and Expo's default port (8081)
app.use(cors({
    origin: [
        'http://localhost:5173', 
        'http://192.168.1.33:8081', // Expo Web/Dev server
        'http://192.168.1.33:19000', // Older Expo port
        'http://192.168.1.33:8082'  // Just in case
    ],
    credentials: true 
}));

// ... rest of your backend code