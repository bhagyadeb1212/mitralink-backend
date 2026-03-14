const cors = require('cors');
app.use(cors({origin: ['http://localhost:5173', 'http://192.168.1.XX:8081'], // Replace XX with your IP
    credentials: true 
}));