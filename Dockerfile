# Stage 1: Build
FROM --platform=linux/amd64 node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve
FROM --platform=linux/amd64 nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Update the Nginx config to listen on 8080
RUN sed -i 's/listen\(.*\)80;/listen 8080;/g' /etc/nginx/conf.d/default.conf || true

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]