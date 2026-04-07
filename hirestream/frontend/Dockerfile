# Stage 1: Build React app
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy project files
COPY . .

# Pass the API URL as a build argument
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# Stage 2: Serve with Nginx for production-ready deployment
FROM nginx:alpine

# Copy built files from previous stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Add the nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for traffic
EXPOSE 80

# Healthy check for the web server
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
