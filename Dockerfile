# Build stage
FROM node:14 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Production stage
FROM node:14
WORKDIR /app
COPY --from=builder /app .
CMD ["node", "dist/index.js"]