FROM golang:1.25-alpine AS build

WORKDIR /src
COPY backend/go.mod ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/swarf-api ./cmd/api

FROM alpine:3.22
RUN addgroup -S swarf && adduser -S swarf -G swarf
WORKDIR /app
COPY --from=build /out/swarf-api /swarf-api
COPY --chown=swarf:swarf . ./
ENV SWARF_PUBLIC_ROOT=/app
EXPOSE 8080
USER swarf
CMD ["/swarf-api"]
