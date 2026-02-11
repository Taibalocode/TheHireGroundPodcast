# Stage 1: Build the React/Vite app
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine

# VITE specific: Copy from /app/dist (based on your package.json)
COPY --from=0 /app/dist /usr/share/nginx/html

# Force Nginx to use 8080 for Google Cloud Run
RUN sed -i 's/listen\(.*\)80;/listen 8080;/g' /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]