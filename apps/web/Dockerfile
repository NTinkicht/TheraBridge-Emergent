FROM node:20-bookworm-slim
WORKDIR /repo
COPY package.json yarn.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
# Next's optional `sharp` (LGPL-3.0-or-later libvips) is only used by the
# next/image optimizer, which is disabled (images.unoptimized). Never ship it:
# remove it and the Yarn package cache in the SAME layer as the install, so no
# committed image layer ever contains the binaries; fail the build if any remain.
RUN yarn install --frozen-lockfile --network-timeout 600000 \
 && find /repo -type d \( -path '*/node_modules/sharp' -o -path '*/node_modules/@img' \) -prune -exec rm -rf {} + \
 && yarn cache clean \
 && ! find /repo "$(yarn cache dir)" -type d \( -path '*/node_modules/sharp' -o -path '*/node_modules/@img' \) -print 2>/dev/null | grep -q .
COPY apps/web apps/web
ARG API_UPSTREAM_ORIGIN=http://api:8001
ENV API_UPSTREAM_ORIGIN=${API_UPSTREAM_ORIGIN}
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn workspace @therabridge/web build
RUN mkdir -p /repo/apps/web/.next/cache && chown -R node:node /repo
USER node
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
EXPOSE 3000
CMD ["yarn", "workspace", "@therabridge/web", "start"]
