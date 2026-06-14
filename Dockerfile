# syntax=docker/dockerfile:1

# Local-only image. Production is deployed to Vercel — this is just a
# convenient way to run the service on your machine with one command.
#
# Debian (glibc) base: sharp's prebuilt libvips binaries and the ffmpeg-static
# binary both target glibc/linux-x64, so they work out of the box here.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
# Installs platform-correct native deps (sharp + ffmpeg-static) for the container.
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
EXPOSE 3000
CMD ["npm", "run", "start"]
