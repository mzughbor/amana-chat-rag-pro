# Use Node.js 20 alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy Prisma schema first (needed for postinstall script)
COPY prisma ./prisma/

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose port from environment variable or default to 3000
EXPOSE ${PORT:-3000}

# Start the application
CMD ["npm", "start"]