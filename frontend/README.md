# CalcREST Frontend

React and TypeScript frontend for the Full-Stack Calculator. It provides the calculator interface and sends complete arithmetic expressions to the Go REST API.

## Features

- Enter expressions by typing or using the on-screen keypad.
- Display calculation results and input or API errors.
- Developer mode shows the request payload, server response, HTTP status, content type, and browser-measured round-trip duration.
- Copy the current request as a cURL command.
- View recent calculations in the request history.
- One-click evaluation presets in developer mode for testing division by zero, negative square roots, operator precedence, right associativity, percentages, overflow handling, and unsupported code-like input.
- Uses `AbortController` to cancel an in-flight calculation when a new one starts or the component unmounts, preventing stale responses from replacing newer results.
- Switch between light and dark themes. The selected theme is saved in browser local storage.
- Responsive layout for smaller screens.

## Requirements

- Node.js 18 or newer and npm
- The Go backend running locally for API-backed calculations

## Frontend structure

```text
src/
├── components/
│   ├── DeveloperPresets.tsx   # One-click evaluation scenarios
│   ├── Display.tsx             # Expression input and result display
│   ├── HistoryList.tsx         # Recent calculation history
│   ├── HowToUse.tsx            # User guide and precedence tips
│   ├── Keypad.tsx              # On-screen calculator buttons
│   ├── RequestInspector.tsx    # HTTP request/response inspector and cURL copy
│   └── types.ts                # Shared frontend types
├── api.ts                      # API client and AbortSignal support
├── App.tsx                     # Application state and layout coordination
├── App.test.tsx                # Frontend integration tests
└── test-setup.ts               # Vitest and Testing Library setup
```

## Run locally

Start the Go backend from the repository’s `backend` directory in one terminal:

```bash
cd backend
go run .
```

In a second terminal, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, normally [http://localhost:5173](http://localhost:5173).

## API connection during development

The frontend uses `/api` as its default API base path. Vite forwards API requests to the Go backend at `http://localhost:8080`:

| Frontend request | Backend route |
| --- | --- |
| `/api/health` | `/health` |
| `/api/calculate` | `/calculate` |

The Vite proxy removes the `/api` prefix before forwarding each request. The browser sends requests to the Vite origin, which forwards them to the backend. This avoids separate browser CORS configuration during local development.

To use a different API base URL, set `VITE_API_BASE_URL` in a `.env` file in the `frontend` directory. For example:

```env
VITE_API_BASE_URL=https://api.example.com
```

When the backend port changes during local development, update the proxy target in `vite.config.ts` to match it.

## Test and build

Run the frontend tests:

```bash
npm test
```

The tests cover API request payloads, backend error display, developer-mode visibility, and evaluation preset submission. Dedicated `RequestInspector` tests cover response status rendering, cURL generation, clipboard failures, and timer cleanup.

Generate a frontend test coverage report:

```bash
npm run test:coverage
```

Vitest prints a coverage summary and writes detailed coverage files under `frontend/coverage/`.

Create a production frontend build:

```bash
npm run build
```

The build runs the TypeScript check and creates production assets in `frontend/dist/`.