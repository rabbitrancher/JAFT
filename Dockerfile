FROM node:20-slim AS builder
WORKDIR /app
# install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build
RUN npm prune --omit=dev


FROM gcr.io/distroless/nodejs20-debian12 AS runner
WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/drizzle drizzle/
COPY package.json .
VOLUME ["/app/budget.db"]
EXPOSE 3000
ENV NODE_ENV=production
CMD ["build/index.js"]
