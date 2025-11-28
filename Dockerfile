# Use Node.js 18 alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose port from environment variable or default to 3000
EXPOSE ${PORT:-3000}

# Start the application
CMD ["npm", "start"]