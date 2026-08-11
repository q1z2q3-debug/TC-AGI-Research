# ─── 构建阶段 ───
FROM node:20-alpine AS builder
WORKDIR /build

# 只复制清单，利用缓存（保留 dev 依赖以使用 tsc 编译）
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# 复制源码并编译
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# ─── 运行阶段 ───
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV COGNITIVE_PORT=8899
ENV COGNITIVE_HOST=0.0.0.0

# 复制编译产物
COPY --from=builder /build/dist ./dist
# 复制运行时依赖（rxjs/uuid/dotenv 是 server 依赖链所需）
COPY --from=builder /build/node_modules ./node_modules

# 记忆持久化目录
RUN mkdir -p /app/data

EXPOSE 8899
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:8899/health || exit 1

CMD ["node", "dist/server.js"]
