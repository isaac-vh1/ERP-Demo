# clients/Dockerfile  (repeat similarly in manager/Dockerfile)
FROM nginx:1.25-alpine

# Remove default site
RUN rm /etc/nginx/conf.d/default.conf

# Minimal site config suitable for SPAs
COPY <<'NGINX' /etc/nginx/conf.d/site.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Basic gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript application/xml+rss application/xml text/javascript image/svg+xml;
}
NGINX

# Copy the prebuilt React app (CI generates this before Docker build)
COPY build/ /usr/share/nginx/html/

EXPOSE 80
