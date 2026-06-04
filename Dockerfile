# ---- build stage: bundle tlock-js for the browser ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# build に必要なのは esbuild/buffer/tlock-js のみ。devDeps(playwright等)は入れない。
RUN npm ci --omit=dev
COPY build.mjs ./
COPY src ./src
COPY public ./public
RUN node build.mjs

# ---- runtime stage: tiny static nginx ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/public /usr/share/nginx/html
EXPOSE 8080
