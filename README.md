# Full-Stack Calculator

A full-stack calculator built with a React and TypeScript frontend and a Go REST API backend. It evaluates complete arithmetic expressions in one request, including parentheses, operator precedence, percentages, square roots, and exponentiation.

## Features

- Enter expressions by typing or using the on-screen keypad.
- Supports addition (`+`), subtraction (`-`), multiplication (`*`), division (`/`), exponentiation (`^`), square roots, and percentages.
- Supports decimal numbers, whitespace, and nested parentheses.
- Uses a Go REST API to evaluate expressions.
- Includes a developer mode with request and response details, HTTP status, round-trip duration, recent request history, and a cURL command.
- Includes one-click evaluation scenarios for common results and edge cases.
- Provides light and dark themes and a responsive interface.
- Validates expressions and displays calculation and API errors.

## Architecture

The React frontend sends the complete expression as JSON to the Go backend. The backend parses and evaluates it, then returns either a numeric result or a JSON error.

```text
User
  │
  ▼
React + TypeScript frontend
  │  POST /calculate
  │  { "expression": "..." }
  ▼
Go REST API
  │
  ├── validates the request
  ├── parses and evaluates the expression
  └── returns a JSON result or error
```

During local development, Vite proxies API requests to the Go server. In the Docker image, the Go server serves both the built frontend and the API.

## Design Decisions & Assumptions

### One endpoint for complete expressions

The backend uses one `POST /calculate` endpoint for expressions instead of separate endpoints such as `/add`, `/subtract`, or `/multiply`. The frontend sends the full expression in one request:

```json
{
  "expression": "5 + 4 - (8 - 9) * 3"
}
```

Sending the complete expression lets the backend apply parentheses and operator precedence consistently. Splitting a chained calculation across multiple HTTP requests would add network round trips and require the client to manage intermediate results and calculation state. With one request, the backend evaluates the expression as a whole and determines the calculation order.

### Recursive descent parser

The backend uses a recursive descent parser written in Go. It does not pass user input to `eval` or use a third-party expression-evaluation library. The parser explicitly recognizes the supported syntax and returns controlled errors for invalid expressions, division by zero, negative square roots, and results outside the supported numeric range.

The parser follows this precedence hierarchy:

```text
Expression ::= Term { ("+" | "-") Term }
Term       ::= Unary { ("*" | "/") Unary }
Unary      ::= ("+" | "-" | "%") Unary | Power
Power      ::= Primary [ "^" Unary ]
Primary    ::= Number [ "%" ]
             | "(" Expression ")" [ "%" ]
             | SquareRoot [ "%" ]
SquareRoot ::= ("sqrt" | "√")
               [ "(" Expression ")" | Primary ]
```

Multiplication and division bind more tightly than addition and subtraction. Exponentiation associates from right to left, so `2^3^2` is evaluated as `2^(3^2)`. The parser also supports unary signs, parentheses, square roots, and prefix or postfix percentages.

The parser evaluates values as it parses them; it does not build and retain a separate Abstract Syntax Tree (AST).

### Developer mode and observability

Developer mode makes the frontend-to-backend interaction visible in the UI:

- **Live HTTP inspector:** Displays the JSON request and response, HTTP status (such as `200 OK` or `400 Bad Request`), content type, method, and browser-measured round-trip duration.
- **Copy as cURL:** Copies a ready-to-run cURL command for the current expression.
- **Evaluation Scenarios / Edge Cases:** Provides one-click presets for precedence and parentheses, right-associative powers, percentages, division by zero, negative square roots, overflow handling, and unsupported code-like input.

To try them, switch to **Developer** mode and select a button under **Evaluation Scenarios / Edge Cases**. The selected expression is submitted to the API so the response can be inspected. Invalid expressions are returned as JSON errors with `400 Bad Request`.

The displayed duration measures the request’s round trip from the browser. It does not measure backend processing time alone.

## Setup & How to Run

### Run with Docker

Build the production image from the repository root:

```bash
docker build -t full-stack-calculator .
```

Start the application:

```bash
docker run --rm -p 8080:8080 full-stack-calculator
```

Open [http://localhost:8080](http://localhost:8080).

The Dockerfile uses separate build stages for the frontend and backend. Node.js and Go are used to build the application; the final image is based on `scratch` and contains the compiled Go executable and frontend assets. This keeps the runtime image small and excludes shells and package managers from the final image.

If host port `8080` is already in use, map another host port to the container’s port `8080`:

```bash
docker run --rm -p 8081:8080 full-stack-calculator
```

Then open [http://localhost:8081](http://localhost:8081). In `-p HOST_PORT:CONTAINER_PORT`, the first port is on your computer and the second is inside the container. The application continues listening on container port `8080`.

### Run locally for development

Start the backend in one terminal:

```bash
cd backend
go run .
```

In a second terminal, install the frontend dependencies and start Vite:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, normally [http://localhost:5173](http://localhost:5173).

Vite proxies `/api/health` and `/api/calculate` to the Go backend’s `/health` and `/calculate` routes on port `8080`. The browser sends API requests to Vite, which forwards them to Go. This keeps local frontend requests on the Vite origin and avoids separate browser CORS configuration.

The Go backend listens on port `8080` by default. If that port is occupied, update the backend address in `backend/main.go` and the proxy target in `frontend/vite.config.ts` to use the same available port, then restart both processes.

If Vite’s default port `5173` is occupied, start it on another port:

```bash
npm run dev -- --port 5174
```

Open the URL printed by Vite.

## REST API Documentation & Examples

The API routes are available under different URL prefixes depending on how the application is run:

| Environment | Health endpoint | Calculation endpoint |
| --- | --- | --- |
| Local development | `http://localhost:8080/health` | `http://localhost:8080/calculate` |
| Docker | `http://localhost:8080/api/health` | `http://localhost:8080/api/calculate` |

The Docker server also routes requests directly under `/health` and `/calculate` for compatibility. The `/api/...` routes are the documented Docker endpoints.

### `GET /health`

Checks whether the API is responding.

Local development:

```bash
curl http://localhost:8080/health
```

Docker:

```bash
curl http://localhost:8080/api/health
```

Example response (`200 OK`):

```json
{
  "status": "ok"
}
```

### `POST /calculate`

Evaluates the expression in the `expression` field.

Local development:

```bash
curl -X POST http://localhost:8080/calculate \
  -H "Content-Type: application/json" \
  -d '{"expression": "5 + 4 - (8 - 9) * 3"}'
```

Docker:

```bash
curl -X POST http://localhost:8080/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"expression": "5 + 4 - (8 - 9) * 3"}'
```

Example response (`200 OK`):

```json
{
  "result": 12
}
```

Supported syntax includes:

- Basic arithmetic: `+`, `-`, `*`, `/`
- Exponentiation: `^`
- Square roots: `sqrt(16)`, `sqrt16`, or `√16`
- Percentages: `10%` and `%10` both mean `0.1`
- Decimal numbers, whitespace, and parentheses

### Error responses

Invalid JSON or an expression the parser cannot evaluate returns `400 Bad Request` with a JSON error message.

Division by zero:

```bash
curl -X POST http://localhost:8080/calculate \
  -H "Content-Type: application/json" \
  -d '{"expression": "10 / 0"}'
```

Example response:

```json
{
  "error": "cannot divide by zero"
}
```

Square root of a negative number:

```bash
curl -X POST http://localhost:8080/calculate \
  -H "Content-Type: application/json" \
  -d '{"expression": "sqrt(-16)"}'
```

Example response:

```json
{
  "error": "cannot calculate square root of a negative number"
}
```

Malformed syntax or unsupported input, such as a code-injection attempt:

```bash
curl -X POST http://localhost:8080/calculate \
  -H "Content-Type: application/json" \
  -d '{"expression": "1 + 2; alert(1)"}'
```

The parser treats the input as an arithmetic expression, not as executable code. Semicolons and function calls such as `alert(1)` are not part of the supported syntax, so the request is rejected with `400 Bad Request`.

For Docker, replace `/calculate` in these error examples with `/api/calculate`.

## Tests and Coverage

Run the backend tests from the repository root:

```bash
cd backend
go test ./...
```

Run the frontend tests:

```bash
cd frontend
npm test
```

Generate backend coverage output:

```bash
cd backend
go test -cover ./...
```

Generate frontend coverage output:

```bash
cd frontend
npm run test:coverage
```

The Go command prints coverage for each backend package in the terminal. Vitest prints a frontend coverage summary and writes detailed coverage files under `frontend/coverage/`.

### Current Coverage Summary

The following coverage results were collected by running the backend and frontend test suites.

#### Backend Coverage

| Package | Statements |
| --- | ---: |
| `backend` (server entry point) | 75.0% |
| `api` | 100.0% |
| `calculator` | 95.9% |

Backend tests: all 3 packages passed with `go test ./...`.

#### Frontend Coverage

| Frontend module | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| **Overall** | **83.55%** | **83.70%** | **79.54%** | **85.21%** |
| `src/App.tsx` | 77.41% | 66.66% | 66.66% | 77.64% |
| `src/api.ts` | 80.00% | 86.95% | 75.00% | 88.88% |
| `src/components/DeveloperPresets.tsx` | 100% | 100% | 100% | 100% |
| `src/components/Display.tsx` | 100% | 100% | 100% | 100% |
| `src/components/HistoryList.tsx` | 100% | 100% | 100% | 100% |
| `src/components/HowToUse.tsx` | 100% | 100% | 100% | 100% |
| `src/components/Keypad.tsx` | 100% | 100% | 100% | 100% |
| `src/components/RequestInspector.tsx` | 100% | 100% | 100% | 100% |

Frontend tests: 17 tests passed across 2 test files with `npm run test:coverage`.


## AI Assistance

AI tools were used during development to help implement and review parts of the calculator, including the Go expression parser and API, the React frontend, edge-case handling, tests, Docker setup, and documentation.

The work used iterative prompts to request implementation guidance, explanations of design choices, debugging help, and review of edge cases. This summary describes the kinds of prompts used; it is not a verbatim transcript of every prompt.