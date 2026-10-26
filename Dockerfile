FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY index.html styles.css engine.js app.js server.js ./

EXPOSE 8080
CMD ["node", "server.js"]
