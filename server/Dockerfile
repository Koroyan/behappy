# BeHappy API + real-time server. Build from the repository root:
#   docker build -f server/Dockerfile -t behappy-api .
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --omit=optional && npm cache clean --force
COPY server/ ./
# Runs as the unprivileged "node" user; nothing is written inside the image.
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:8787/api/health || exit 1
CMD ["node", "index.mjs"]
