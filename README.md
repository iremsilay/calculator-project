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
- Switch between light and dark themes using the theme button. The selected theme is saved in browser local storage.
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

Before running the Docker commands, make sure Docker Desktop is installed, open and fully started. Docker Desktop must be running because it provides the Docker engine used to build and run the application.

You can check that Docker is ready by running:

```bash
docker info


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

### selected prompts and engineering decisions

the examples below are consolidated from prompts used during development. they highlight key design decisions and verification steps

#### 1. backend structure and design alternatives

**intent, outcome & verification**

intent: separate calculation logic, http handling and server startup to make the backend easier to test and maintain.

outcome: the backend was organized into separate packages for calculation, api handling and server startup.

verification: package-level tests were run from the backend module with go test ./....

**prompt (tr):**  
bu projedeki backend’i incele. hesaplama mantığını ayrı bir calculator paketine, http isteklerini api paketine ve sunucu başlangıcını main.go dosyasına yerleştirelim. bu yapının neden uygun olduğunu ve alternatif yaklaşımların hangi durumlarda tercih edilebileceğini açıkla. hesaplama fonksiyonları ve testleri ayrı dosyalarda olsun.

**prompt (en):**  
review the backend in this project. place the calculation logic in a separate calculator package, http request handling in an api package, and server startup in main.go. explain why this structure is suitable and when alternative approaches might be preferable. keep the calculation functions and their tests in separate files.

#### 2. expression parser design

**intent, outcome & verification**

intent: support calculator expressions with explicit parsing rules instead of evaluating user input as code.

outcome: the backend uses expression parsing to handle calculations.

verification: parser behavior was checked with tests for valid expressions and edge cases.

**prompt (tr):**  
hesap makinesi ifadelerini hazır bir eval veya parser kütüphanesi kullanmadan çözümlemek için recursive descent parser yaklaşımını değerlendir. sayıların, operatörlerin ve parantezlerin nasıl ayrıştırılacağını operatör önceliğini ve üs alma davranışını açıkla. tasarımı küçük, test edilebilir parçalara ayır.

**prompt (en):**  
evaluate the recursive descent parser approach for parsing calculator expressions without using a ready-made eval function or parser library. explain how numbers, operators, and parentheses are parsed, including operator precedence and exponentiation behavior. divide the design into small, testable parts.

#### 3. api contract and error behavior

**intent, outcome & verification**

intent: make the frontend and backend agree on request formats, successful responses, and errors.

outcome: the react frontend sends calculation requests to the go api and displays returned results or errors.

verification: backend tests cover api behavior, including invalid requests and calculation edge cases.

**prompt (tr):**  
POST /calculate için frontend ve backend’in kullanacağı json sözleşmesini netleştir. geçerli isteklerde sonucu döndür; bozuk json, desteklenmeyen işlem, yanlış http yöntemi ve sıfıra bölme durumlarında uygun hata yanıtları üret. GET /health endpoint’ini de koru. bu davranışları doğrulayacak api testlerini öner.

**prompt (en):**  
define the json contract that the frontend and backend will use for POST /calculate. return the result for valid requests, and appropriate error responses for malformed json, unsupported operations, incorrect http methods, and division by zero. keep the GET /health endpoint. suggest api tests to verify this behavior.

#### 4. backend edge-case testing

**intent, outcome & verification**

intent: verify error paths and run tests from the correct go module.

outcome: backend tests were run from the backend module directory.

verification: the output of go test ./... was reviewed package by package, including packages without test files.

**prompt (tr):**  
yanlış http yöntemi, bozuk json, eksik alanlar, desteklenmeyen işlem ve sıfıra bölme durumlarını test et. backend/ kendi go.mod dosyasına sahipse testleri doğru modül dizininden çalıştır; depo kökünde go test ./... çalıştırmanın neden farklı sonuç verebileceğini açıkla. [no test files] mesajının hata olup olmadığını da belirt.

**prompt (en):**  
test incorrect http methods, malformed json, missing fields, unsupported operations, and division by zero. if backend/ has its own go.mod file, run the tests from that module directory and explain why running go test ./... from the repository root may produce a different result. also explain whether the [no test files] message indicates an error.

#### 5. frontend design direction

**intent, outcome & verification**

intent: use the visual reference for guidance while keeping the implementation aligned with the project requirements and api.

outcome: the frontend was implemented for the project’s backend contract, with a calculator-focused view and developer-facing information.

verification: frontend behavior was checked using the project’s vitest setup.

**prompt (tr):**  
stitch tasarımını doğrudan kopyalama; renk paleti, yerleşim ve boyutlar için yalnızca referans olarak kullan. react ve typescript ile projedeki backend sözleşmesine uyan bir arayüz oluştur. temel hesap makinesi işlemleri kolayca kullanılabilsin; developer modunda http istekleri ve işlem geçmişi incelenebilsin. açık ve koyu tema seçeneklerini de düşün.

**prompt (en):**  
do not copy the stitch design directly; use it only as a reference for the color palette, layout, and dimensions. build an interface with react and typescript that follows this project’s backend contract. make the basic calculator operations easy to use, and allow users to inspect http requests and calculation history in developer mode. include light and dark theme options.

#### 6. keyboard and keypad behavior

**intent, outcome & verification**

intent: make the calculator usable through both the physical keyboard and on-screen controls.

outcome: calculator input behavior was connected to the app’s calculation flow.

verification: frontend tests were used to check the components and app behavior after the changes.

**prompt (tr):**  
tuş takımı ve klavye girişlerini birlikte destekle. ac, ce, √, ±, sayılar, ondalık nokta ve işlem operatörlerinin davranışını kontrol et. enter hesaplama isteğini başlatsın. her tuşun mevcut ifade ve sonuç durumuyla nasıl etkileşeceğini belirle ve bu davranışları test et.

**prompt (en):**  
support both keypad and keyboard input. check the behavior of ac, ce, √, ±, numbers, the decimal point, and operation keys. enter should submit the calculation request. define how each key interacts with the current expression and result, then test that behavior.

#### 7. frontend component boundaries

**intent, outcome & verification**

intent: reduce the responsibilities of app.tsx and make the interface easier to maintain.

outcome: the frontend was split into reusable components, with shared history types and explicit props.

verification: component and app tests were used to check the refactoring.

**prompt (tr):**  
app.tsx dosyasını tek sorumluluk prensibine göre düzenle. keypad, display, request inspector ve history list bölümlerini ayrı bileşenlere taşı. ortak history tipini uygun bir dosyada tanımla, import yollarını ve her bileşenin prop adlarıyla türlerini kontrol et. mevcut css sınıflarını ve html yapısını koruyarak testleri çalıştır.

**prompt (en):**  
refactor app.tsx according to the single responsibility principle. move the keypad, display, request inspector, and history list into separate components. define the shared history type in an appropriate file, and check the import paths and each component’s prop names and types. preserve the existing css classes and html structure, then run the tests.

#### 8. request cancellation and stale responses

**intent, outcome & verification**

intent: prevent an older, slower request from overwriting the result of a newer calculation.

outcome: request cancellation was connected to the frontend calculation flow.

verification: the vitest suite was used to check that request and interface behavior remained intact.

**prompt (tr):**  
yeni bir hesaplama isteği başladığında önceki bekleyen isteği abortcontroller ile iptal et. iptal edilen isteği kullanıcıya hata olarak gösterme. api.ts içindeki isteğe bağlı abortsignal desteğini app katmanına bağla ve eski yanıtların yeni sonucu ezmesini önle.

**prompt (en):**  
when a new calculation request starts, cancel the previous pending request with abortcontroller. do not show a user-facing error for a cancelled request. connect the optional abortsignal support in api.ts to the app layer and prevent an older response from replacing a newer result.

#### 9. developer tools and edge-case presets

**intent, outcome & verification**

intent: help reviewers inspect requests and exercise important error cases quickly.

outcome: the developer interface includes request and response details and tools for inspecting calculations.

verification: request inspector tests cover successful and failed requests, clipboard behavior, and response display.

**prompt (tr):**  
developer paneline mevcut hesaplama isteğini gösteren bir request inspector ekle. copy as curl düğmesi isteği panoya kopyalasın ve kısa süreli başarı bildirimi göstersin. ayrıca division by zero, domain error, precedence, right associativity, overflow ve geçersiz ifade gibi test senaryolarını tek tıklamayla yükleyen preset’ler ekle. stiller mevcut retro lcd temasına uysun.

**prompt (en):**  
add a request inspector to the developer panel that shows the current calculation request. the copy as curl button should copy the request to the clipboard and show temporary success feedback. also add presets that load test cases such as division by zero, domain errors, precedence, right associativity, overflow, and invalid expressions with one click. make the styles fit the existing retro lcd theme.

#### 10. cors, request ids, and server timeouts

**intent, outcome & verification**

intent: improve api behavior for browser requests and configure timeouts for the go http server.

outcome: cors handling and server timeout configuration were included in the backend hardening work.

verification: backend tests were run with go test ./....

**prompt (tr):**  
handler.go içine cors başlıkları ekle ve options preflight isteklerine yanıt ver. izin verilen yöntemleri ve başlıkları açıkça tanımla. istemciden x-request-id gelirse yanıta yansıt; gelmezse bir id üret. main.go içindeki http server’a read, write ve idle timeout değerleri ekle. mevcut go testlerinin çalışmaya devam ettiğini doğrula.

**prompt (en):**  
add cors headers in handler.go and respond to options preflight requests. define the allowed methods and headers explicitly. if the client sends x-request-id, include it in the response; otherwise, generate an id. add read, write, and idle timeout values to the http server in main.go. verify that the existing go tests continue to pass.

#### 11. docker deployment

**intent, outcome & verification**

intent: provide a reproducible way to build and run the frontend and backend together.

outcome: the project includes docker setup instructions alongside local development instructions.

verification: container build and run commands are documented in the readme.

**prompt (tr):**  
projenin kök dizinine multistage bir dockerfile ekle. bir aşamada frontend’i derle, başka bir aşamada go backend’ini derle ve son imajda gereken çıktıları birleştir. .dockerignore içine build sırasında gereksiz dosyaları ve yerel bağımlılık dizinlerini ekleme. docker ile çalıştırma adımlarını readme’de açıkla.

**prompt (en):**  
add a multi-stage dockerfile to the project root. build the frontend in one stage, build the go backend in another, and combine the required outputs in the final image. add files and local dependency directories that are not needed during the build to .dockerignore. document how to run the project with docker in the readme.

#### 12. frontend coverage and request inspector tests

**intent, outcome & verification**

intent: identify untested frontend paths and cover important request inspector states.

outcome: frontend test and coverage commands are documented. request inspector tests cover its main response and interaction states.

verification: exact coverage percentages are taken from the latest npm run test:coverage output.

**prompt (tr):**  
frontend’de npm run test:coverage çalıştırıldığında coverage sağlayıcısı eksikse bunu belirle. vitest coverage altyapısını yapılandır ve requestinspector için başarılı yanıt, http hatası, network error, curl kopyalama, clipboard hatası ve zamanlayıcı davranışlarını kapsayan testler hazırla. başarısız beklentilerde boş yanıtın görünürlüğünü ve birden fazla application/json metni bulunduğunda doğru alanın seçilmesini de kontrol et.

**prompt (en):**  
if the coverage provider is missing when running npm run test:coverage in the frontend, identify it. configure vitest coverage and prepare requestinspector tests for successful responses, http errors, network errors, copying curl commands, clipboard errors, and timer behavior. when fixing failed expectations, also check the visibility of empty responses and ensure the correct field is selected when application/json appears more than once.

#### 13. readme, git review, and commit scope

**intent, outcome & verification**

intent: keep project documentation complete and avoid committing generated or unrelated files.

outcome: the readme documents setup, tests, coverage, and port conflict handling. generated repomix output was kept out of the commit.

verification: git status was used to review which files belonged in each commit.

**prompt (tr):**  
readme’de docker ile çalıştırma, yerel geliştirme, test ve coverage adımlarını bir araya getir. frontend veya backend portu kullanımda olduğunda alternatif port örnekleri ver; backend portu değişirse vite proxy hedefinin de güncellenmesi gerektiğini belirt. git status çıktısını inceleyip yalnızca ilgili dosyaları commit’e al; repomix-output.xml dosyasını commit dışında tut.

**prompt (en):**  
combine the docker, local development, test, and coverage instructions in the readme. give examples for choosing alternative ports when the frontend or backend port is already in use; mention that the vite proxy target must also be updated if the backend port changes. review the git status output and commit only the relevant files; keep repomix-output.xml out of the commit.