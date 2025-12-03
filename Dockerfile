# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first (leverages Docker layer cache)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM nginx:1.26-alpine AS production
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets and config
RUN rm -rf ./* /etc/nginx/conf.d/default.conf

# Copy built app and nginx config
COPY --from=build /app/build ./
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
