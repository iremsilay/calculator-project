# CalcREST Frontend

React + TypeScript frontend for the Go calculator REST API.

## Run locally

1. Start the Go backend in one terminal from the `backend` directory:

   ```bash
   go run .
   ```

2. In another terminal, enter this `frontend` directory and install the JavaScript dependencies:

   ```bash
   npm install
   npm run dev
   ```

3. Open the local URL printed by Vite (normally `http://localhost:5173`).

Vite proxies `/api/health` and `/api/calculate` to `http://localhost:8080/health` and `http://localhost:8080/calculate`. This avoids browser CORS configuration during local development. To use a different API base URL, set `VITE_API_BASE_URL` in a `.env` file (for example `VITE_API_BASE_URL=https://api.example.com`).

## Features

- Enter expressions with any number of values by typing or using the on-screen keypad.
- Supports `+`, `-`, `*`, `/`, exponentiation (`^`), square root (`sqrt(...)`), and postfix percentages (`10%` means `0.1`).
- Standard precedence: parentheses first, then exponentiation, then multiplication/division, then addition/subtraction.
- Developer mode with the actual request payload, server response, status, round-trip time, and recent in-page request log.
- Light and dark themes; the selected theme is saved in browser local storage.
- Responsive layout and input validation.

## Test and build

```bash
npm test
npm run build
```

The frontend tests cover expression request payloads, backend error display, and developer-mode visibility.

## API request format

The frontend sends the full expression to `POST /calculate`:

```json
{
  "expression": "5 + 4 - (8 - 9) * 3"
}
```

The backend returns the numeric result:

```json
{
  "result": 12
}
```

Supported operations are `+`, `-`, `*`, `/`, `^`, `sqrt(...)`, and postfix `%` (a value followed by `%` is divided by 100). Use parentheses to group expressions. Division by zero, square roots of negative values, malformed expressions, and unsupported characters return a JSON error with HTTP 400.
