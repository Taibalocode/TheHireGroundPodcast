# Stage 1: Build the React/Vite app
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine

# Copy the built app
COPY --from=0 /app/dist /usr/share/nginx/html

# Copy custom nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create Nginx PID directory (required for Cloud Run)
RUN mkdir -p /var/run/nginx

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]