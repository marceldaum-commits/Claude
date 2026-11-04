# Arena-Dienst (Node.js). Braucht Zugriff auf den Docker-Socket des Servers, um Lab-Container zu starten.
FROM node:22-bookworm-slim
WORKDIR /arena
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY server.js waechter.js ./
COPY public ./public
ENV HOST=0.0.0.0 PORT=8090 NODE_ENV=production
EXPOSE 8090
CMD ["node", "server.js"]
