# Full-Stack Calculator

A calculator application with a React and TypeScript frontend and a Go REST API backend.

## Run with Docker

Build the production image from the repository root:

```bash
docker build -t full-stack-calculator .
```

Run the app and map its port to your computer:

```bash
docker run --rm -p 8080:8080 full-stack-calculator
```

Open `http://localhost:8080`. The Go server delivers the built React app and exposes the API under `/api` (for example, `GET /api/health` and `POST /api/calculate`). The multi-stage build uses Node.js and Go only while building; the final `scratch` image contains the compiled Go executable and static frontend files.

If host port `8080` is already in use, choose another available host port:

```bash
docker run --rm -p 8081:8080 full-stack-calculator
```

Then open `http://localhost:8081`. In `-p HOST_PORT:CONTAINER_PORT`, the left port is on your computer and the right port is inside the container. The application continues listening on container port `8080`.

## Run locally

Start the backend in one terminal:

```bash
cd backend
go run .
```

In another terminal, install frontend dependencies and start Vite:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). Vite proxies `/api` requests to the Go backend on port `8080`.

### If a local development port is already in use

The Go backend currently listens on port `8080`. If that port is occupied, change the backend address in `backend/main.go` from `:8080` to an available port, for example `:8081`. Also update the Vite proxy target in `frontend/vite.config.ts` from `http://localhost:8080` to `http://localhost:8081`; both changes are needed so the frontend can reach the backend. Restart both processes after changing the ports.

Vite normally uses port `5173`. If it is occupied, start Vite with another port, for example:

```bash
npm run dev -- --port 5174
```

Open the URL printed by Vite. The frontend and backend use separate ports during local development: the browser connects to Vite, and Vite forwards API requests to the Go backend.

## Test

```bash
cd backend && go test ./...
cd frontend && npm test
```

To generate test coverage reports:

```bash
cd backend && go test -cover ./...
cd frontend && npm run test:coverage
```

The Go command prints package coverage in the terminal. Vitest prints a frontend coverage summary and writes detailed coverage files under `frontend/coverage/`.