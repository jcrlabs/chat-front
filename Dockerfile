FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_STUN_URL
ARG VITE_TURN_URL
ARG VITE_TURN_USERNAME
ARG VITE_TURN_CREDENTIAL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
