FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy app source
COPY server.js .
COPY database.js .

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]
