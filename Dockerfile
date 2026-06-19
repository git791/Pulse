# ==========================================
# Build Stage
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application source
COPY . .

# We do not need VITE_GEMINI_API_KEY injected into Vite because the 
# frontend calls our proxy at /api/extract instead of calling Gemini directly.

# Build the Vite application (outputs to /dist)
RUN npm run build

# ==========================================
# Production Server Stage
# ==========================================
FROM node:20-alpine

WORKDIR /app

# Copy package files for production dependencies
COPY package*.json ./

# Install ONLY production dependencies to keep image size small
RUN npm ci --omit=dev

# Copy the built Vite static assets from the builder stage
COPY --from=builder /app/dist ./dist

# Copy the server file
COPY server.js ./

# Set environment to production
ENV NODE_ENV=production

# Expose the port Cloud Run expects
EXPOSE 8080

# Run the Node server (handles both static files and Gemini API proxy)
CMD ["node", "server.js"]
