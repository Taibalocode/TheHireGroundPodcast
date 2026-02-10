# Use Node.js to build the site
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Use an efficient server to host the static files
FROM nginx:stable-alpine
COPY --from=0 /app/dist /usr/share/nginx/html
RUN sed -i 's/listen\(.*\)80;/listen 8080;/g' /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]