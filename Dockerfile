FROM oven/bun:1.3.14-slim AS builder
WORKDIR /app
COPY package.json .
RUN bun install
COPY . .
RUN bun run build

FROM oven/bun:1.3.14-distroless AS runner
WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/drizzle drizzle/
COPY package.json .
VOLUME ["/app/finances.db"]
EXPOSE 3000
ENV NODE_ENV=production
CMD ["build/index.js"]
