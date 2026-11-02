FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
COPY package.json yarn.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN yarn install --frozen-lockfile --network-timeout 600000
COPY apps/api apps/api
RUN yarn workspace @therabridge/api prisma generate && yarn workspace @therabridge/api build
# Prisma migrations and runtime files must remain writable to the unprivileged user.
RUN mkdir -p /repo/.workspace && chown -R node:node /repo
USER node
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 CMD node -e "fetch('http://127.0.0.1:8001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
EXPOSE 8001
CMD ["sh", "-c", "yarn workspace @therabridge/api prisma migrate deploy && node apps/api/dist/main.js"]
