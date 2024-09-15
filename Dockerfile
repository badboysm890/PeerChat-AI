# Stage 1: Build the backend and include frontend
FROM node:16-alpine AS build

# Set working directory
WORKDIR /app

# Copy backend package.json and package-lock.json
COPY backend/package*.json ./backend/

# Install backend dependencies
RUN cd backend && npm install

# Copy backend source code
COPY backend/ ./backend/

# Copy frontend files into /app/frontend
COPY frontend/ ./frontend/

# Expose backend port
EXPOSE 3000

# Stage 2: Set up Nginx to serve frontend and run backend
FROM nginx:alpine

# Install Node.js and npm in the Nginx image
RUN apk add --no-cache nodejs npm

# Copy the frontend files from the build stage to Nginx's default directory
COPY --from=build /app/frontend /usr/share/nginx/html

# Copy the Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the backend code from the build stage
COPY --from=build /app/backend /usr/src/app/backend

# Set up the working directory for the backend
WORKDIR /usr/src/app/backend

# Install PM2 to manage the Node.js process
RUN npm install -g pm2

# Expose ports for both backend and frontend
EXPOSE 80 3000

# Start both the backend server with PM2 and the Nginx server
CMD ["sh", "-c", "pm2 start server.js --name backend && nginx -g 'daemon off;'"]