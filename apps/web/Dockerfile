FROM node:20-bookworm-slim
WORKDIR /repo
COPY package.json yarn.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN yarn install --frozen-lockfile --network-timeout 600000
COPY apps/web apps/web
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn workspace @therabridge/web build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["yarn", "workspace", "@therabridge/web", "start"]
