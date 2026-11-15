FROM node:20-slim

# Install yt-dlp and ffmpeg
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install --production

# Copy server code
COPY server/ ./server/

# Create cache and downloads dirs
RUN mkdir -p cache/audio downloads

ENV PORT=3000
EXPOSE 3000

CMD ["npx", "tsx", "server/index.ts"]
