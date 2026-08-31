FROM node:20-alpine

WORKDIR /app
COPY . .
RUN node src/cli.mjs build

ENV HOST=0.0.0.0
ENV PORT=3102
EXPOSE 3102
USER node
CMD ["node", "src/server.mjs"]
