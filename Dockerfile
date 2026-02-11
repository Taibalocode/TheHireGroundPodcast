# Use Node.js to build the site
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Use an efficient server to host the static files
FROM nginx:stable-alpine

# 1. Vite projects build into 'dist'. 
# If your project uses 'build', change /dist to /build below.
COPY --from=0 /app/dist /usr/share/nginx/html

# 2. Force Nginx to listen on 8080 instead of the default 80
RUN sed -i 's/listen\(.*\)80;/listen 8080;/g' /etc/nginx/conf.d/default.conf

# 3. Cloud Run requirement: Export the port
EXPOSE 8080

# 4. Ensure Nginx stays running in the foreground
CMD ["nginx", "-g", "daemon off;"]