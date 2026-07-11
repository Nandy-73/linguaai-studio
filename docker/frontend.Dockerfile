FROM node:20-alpine

WORKDIR /app

COPY frontend/package.json ./
RUN npm install

COPY frontend/ .

# NEXT_PUBLIC_* values are baked in at build time. Render injects service env
# vars as Docker build args when declared here; local compose leaves them
# empty and the code falls back to same-origin /api/v1 behind nginx.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

RUN npm run build

EXPOSE 3000
# Production server: fits in Render's free 512MB (next dev does not).
# Local docker-compose overrides this with `npm run dev` for hot reload.
CMD ["sh", "-c", "npx next start --hostname 0.0.0.0 -p ${PORT:-3000}"]
