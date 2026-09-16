# 1. Builder Stage: Dependencies install karne aur build optimize karne ke liye
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# 2. Package files copy karna pehle (Docker layer caching ke liye best practice)
COPY package.json yarn.lock ./

# 3. Dependencies install karna (devDependencies ko skip karke sirf production packages)
RUN yarn install --production=true --frozen-lockfile

# 4. Runtime Stage: Clean aur minimal final production image
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# 5. Non-root user banana (Security Audit requirement: root user se app run nahi karte)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 6. Builder stage se sirf zaroori node_modules uthana (Image size chhota rakhne ke liye)
COPY --from=builder /usr/src/app/node_modules ./node_modules

# 7. Source code aur config files copy karna
COPY src ./src
COPY package.json ecosystem.config.json ./

# 8. File permissions non-root user ko dena
RUN chown -R nodejs:nodejs /usr/src/app
USER 1001

# 9. Port expose karna jo app use karegi
EXPOSE 3000

# 10. Application start command (PM2 ke sath production mode mein run karna)
CMD ["npx", "pm2-runtime", "start", "ecosystem.config.json"]
