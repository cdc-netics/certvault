FROM node:22-alpine AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate && pnpm install --frozen-lockfile

COPY . .
RUN corepack prepare pnpm@11.3.0 --activate && pnpm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/certif-app/browser /usr/share/nginx/html

EXPOSE 80
