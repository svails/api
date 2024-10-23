FROM oven/bun:slim AS base

# Build project
FROM base AS build

WORKDIR /app

ENV NODE_ENV=production

# Install packages
COPY package.json bun.lockb ./
RUN bun install

# Copy over source code
COPY src ./src
COPY tsconfig.json ./tsconfig.json

# Compile binary
RUN bun build \
    --compile \
    --minify \
    --target bun \
    --outfile server \
    ./src/index.tsx

# Copy over artifacts
FROM base

WORKDIR /app

ENV NODE_ENV=production

COPY migrations ./migrations
COPY --from=build /app/server ./server
COPY --from=build /app/node_modules/@libsql/linux-x64-gnu ./node_modules/@libsql/linux-x64-gnu

# Start the server
EXPOSE 3000
CMD ["./server"]
