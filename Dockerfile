# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/db/package.json ./packages/db/
COPY apps/dashboard/package.json ./apps/dashboard/
RUN npm ci
COPY . .
RUN npm run build -w @tracerlens/sdk \
 && npm run build -w @tracerlens/dashboard

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup -S tracerlens && adduser -S tracerlens -G tracerlens
COPY --from=builder --chown=tracerlens:tracerlens /app ./
USER tracerlens
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["npm", "run", "start", "-w", "@tracerlens/dashboard"]
