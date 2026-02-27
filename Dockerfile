# Ultra-simplified Dockerfile for Railway deployment
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Configure npm to skip problematic dependencies
RUN npm config set optional false && \
    npm config set fund false && \
    npm config set audit false

# Install dependencies without optional packages and scripts
RUN npm install --production --ignore-scripts --no-optional --no-audit --no-fund

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4444

# Expose port
EXPOSE 4444

# Start the application
CMD ["npm", "start"]