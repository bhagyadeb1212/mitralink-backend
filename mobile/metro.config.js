const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// Force Metro to store cache inside the project folder
// This avoids the 'EACCES: permission denied' error on system /var/folders
config.cacheStores = [
    new FileStore({
        root: path.join(__dirname, 'metro-cache'),
    }),
];

module.exports = config;
