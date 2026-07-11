FROM node:20-alpine

WORKDIR /app

COPY frontend/package.json ./
RUN npm install

COPY frontend/ .

EXPOSE 3000
CMD ["sh", "-c", "npx next dev --hostname 0.0.0.0 -p ${PORT:-3000}"]
