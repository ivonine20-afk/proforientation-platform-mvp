FROM node:20-alpine AS server-deps
WORKDIR /app/server
COPY server/package.json ./
RUN npm install --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache bash
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server ./server
COPY client/dist ./client/dist
COPY client/public ./client/dist
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
VOLUME ["/app/data", "/app/storage"]
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
