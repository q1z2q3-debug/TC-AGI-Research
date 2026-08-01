FROM node:20-alpine AS builder

WORKDIR /app

# 依赖安装层（利用 Docker 缓存）
COPY package.json package-lock.json ./
RUN npm ci

# 源码编译
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# 生产镜像
FROM node:20-alpine

WORKDIR /app

# 仅复制生产所需
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# 运行时数据目录
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "dist/daemon.js"]