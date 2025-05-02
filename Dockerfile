# Use the following commands to build and push
# docker build -t bheemboy/web_56cards:latest -t bheemboy/web_56cards:$(Get-Date -Format "yyyy.MM.dd") .
# docker push --all-tags bheemboy/web_56cards

# Stage 1 ##############################################################################
FROM node:bookworm-slim AS build

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all project files
COPY . .

# Build the app for production
RUN npm run build

# Stage 2 ##############################################################################
FROM nginx:alpine-slim

# Copy the built app to Nginx serve directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
