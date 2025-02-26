# Use the following commands to build and push
# docker build -t bheemboy/web_56cards:latest -t bheemboy/web_56cards:2025.02.25 .
# docker push --all-tags bheemboy/web_56cards
FROM bheemboy/api_56cards:latest

RUN apt-get update; apt-get install -y nginx

COPY nginx/default.conf /etc/nginx/nginx.conf
COPY wwwroot /usr/share/nginx/html

EXPOSE 80

# Start both nginx and the .NET application
COPY start.sh healthcheck.sh /
RUN chmod +x /start.sh /healthcheck.sh

CMD ["/start.sh"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD /healthcheck.sh
