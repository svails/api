FROM oven/bun:slim

WORKDIR /app

# Install packages
ENV NODE_ENV=production
COPY package.json bun.lockb ./
RUN bun install

# Copy source code
COPY src ./src
COPY migrations ./migrations
COPY tsconfig.json ./tsconfig.json
COPY drizzle.config.ts ./drizzle.config.ts

# Start the server
EXPOSE 3000
CMD ["bun", "src/index.ts"]
