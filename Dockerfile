# Image de production du frontend MIMOSY : application Vue compilée, servie par
# nginx, qui est aussi le point d'entrée unique de la plateforme (voir
# docker/nginx.conf et back_Mimosy/docker-compose.prod.yml).
#
# En développement, ce fichier n'est pas utilisé : Vite tourne sur la machine
# (rechargement instantané).

# ── Étape 1 : compilation (Node n'est pas dans l'image finale) ──────────────
FROM node:24-alpine AS compilation
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Adresse publique de MIMOSY, intégrée au code compilé (API et WebSocket).
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# ── Étape 2 : serveur nginx léger, avec seulement le résultat compilé ────────
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=compilation /app/dist /usr/share/nginx/html
EXPOSE 80
