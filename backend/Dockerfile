FROM node:22-alpine AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate && pnpm install --frozen-lockfile

COPY . .
RUN corepack prepare pnpm@11.3.0 --activate && pnpm run build

FROM node:22-alpine AS runtime
WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate && pnpm install --prod --frozen-lockfile

COPY --from=build /app/dist ./dist
COPY resources ./resources

RUN mkdir -p /app/uploads/avatars /app/uploads/certificates

EXPOSE 3000
CMD ["node", "dist/server.js"]
