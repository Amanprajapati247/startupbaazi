# Stage 1: Build client and server
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN cd server && npm install
RUN cd client && npm install
RUN npm install

# Copy source code
COPY . .

# Build Client
RUN cd client && npm run build

# Generate Prisma Client & Build Server
RUN cd server && npx prisma generate && npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

COPY package.json ./
COPY server/package*.json ./server/
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 5000

CMD ["sh", "-c", "cd server && npx prisma db push && npm start"]
