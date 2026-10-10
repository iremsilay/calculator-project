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

Go command prints package coverage in the terminal. Vitest prints a frontend coverage summary and writes detailed coverage files under `frontend/coverage/`.