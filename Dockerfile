# Build the React frontend with Node.js.
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install -g npm@11.6.0
RUN npm install --no-audit --no-fund
COPY frontend/ ./
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# Compile the Go API as a static Linux binary.
FROM golang:1.22-alpine AS backend-build

WORKDIR /app
COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./backend/frontend/dist
WORKDIR /app/backend
RUN mkdir -p /out && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/calculator .

# The final image contains only the executable and built frontend assets.
FROM scratch

WORKDIR /app
COPY --from=backend-build /out/calculator /app/calculator
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

EXPOSE 8080
ENTRYPOINT ["/app/calculator"]
