# multi-stage: build + runtime
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
ENV VITACORE_DB_PATH=/data/vitacore.sqlite
VOLUME /data
ENTRYPOINT ["node", "dist/index.js"]
