package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHealthHandler(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/health", nil)

	NewHandler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, recorder.Code)
	}
	var response healthResponse
	if err := json.NewDecoder(recorder.Body).Decode(&response); err != nil {
		t.Fatalf("could not decode response: %v", err)
	}
	if response.Status != "ok" {
		t.Errorf("expected health status %q, got %q", "ok", response.Status)
	}
}

func TestCORSMiddlewareAddsHeaders(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/health", nil)

	NewHandler().ServeHTTP(recorder, request)

	for name, want := range map[string]string{
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	} {
		if got := recorder.Header().Get(name); got != want {
			t.Errorf("expected %s %q, got %q", name, want, got)
		}
	}
}

func TestCORSMiddlewareHandlesPreflight(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodOptions, "/calculate", nil)

	NewHandler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d", http.StatusNoContent, recorder.Code)
	}
	if recorder.Body.Len() != 0 {
		t.Errorf("expected an empty preflight response, got %q", recorder.Body.String())
	}
	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Errorf("expected Access-Control-Allow-Origin %q, got %q", "*", got)
	}
}

func TestCalculateHandlerEvaluatesExpression(t *testing.T) {
	body := `{"expression":"5 + 4 - (8 - 9) * 3"}`
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/calculate", strings.NewReader(body))

	NewHandler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	var response calculateResponse
	if err := json.NewDecoder(recorder.Body).Decode(&response); err != nil {
		t.Fatalf("could not decode response: %v", err)
	}
	if response.Result != 12 {
		t.Errorf("expected result 12, got %v", response.Result)
	}
}

func TestCalculateHandlerRejectsInvalidJSON(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/calculate", strings.NewReader(`{"expression":`))

	NewHandler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, recorder.Code)
	}
}

func TestCalculateHandlerRejectsInvalidExpression(t *testing.T) {
	body := `{"expression":"10 / 0"}`
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/calculate", strings.NewReader(body))

	NewHandler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, recorder.Code)
	}
	var response errorResponse
	if err := json.NewDecoder(recorder.Body).Decode(&response); err != nil {
		t.Fatalf("could not decode error response: %v", err)
	}
	if response.Error != "cannot divide by zero" {
		t.Errorf("expected division-by-zero error, got %q", response.Error)
	}
}


func TestRootHandlerReturnsEndpointInformation(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/", nil)

	NewHandler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, recorder.Code)
	}
	if got := recorder.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("expected JSON content type, got %q", got)
	}
	var response map[string]string
	if err := json.NewDecoder(recorder.Body).Decode(&response); err != nil {
		t.Fatalf("could not decode response: %v", err)
	}
	if response["health"] != "GET /health" || response["calculate"] != "POST /calculate" {
		t.Errorf("unexpected endpoint information: %#v", response)
	}
}

func TestRootHandlerReturnsNotFoundForUnknownPath(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/unknown", nil)
	NewHandler().ServeHTTP(recorder, request)
	if recorder.Code != http.StatusNotFound {
		t.Errorf("expected status %d, got %d", http.StatusNotFound, recorder.Code)
	}
}

func TestHandlersRejectUnsupportedMethods(t *testing.T) {
	tests := []struct {
		name   string
		method string
		path   string
	}{
		{name: "root rejects POST", method: http.MethodPost, path: "/"},
		{name: "health rejects POST", method: http.MethodPost, path: "/health"},
		{name: "calculate rejects GET", method: http.MethodGet, path: "/calculate"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(test.method, test.path, nil)
			NewHandler().ServeHTTP(recorder, request)
			if recorder.Code != http.StatusMethodNotAllowed {
				t.Fatalf("expected status %d, got %d", http.StatusMethodNotAllowed, recorder.Code)
			}
			var response errorResponse
			if err := json.NewDecoder(recorder.Body).Decode(&response); err != nil {
				t.Fatalf("could not decode error response: %v", err)
			}
			if response.Error != "method not allowed" {
				t.Errorf("expected method error, got %q", response.Error)
			}
		})
	}
}

func TestCalculateHandlerRejectsInvalidExpressions(t *testing.T) {
	tests := []struct {
		name       string
		expression string
	}{
		{name: "negative square root", expression: "sqrt(-16)"},
		{name: "numeric overflow", expression: "10^1000"},
		{name: "unsupported code-like syntax", expression: "1 + 2; alert(1)"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			body := `{"expression":"` + test.expression + `"}`
			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodPost, "/calculate", strings.NewReader(body))
			NewHandler().ServeHTTP(recorder, request)

			if recorder.Code != http.StatusBadRequest {
				t.Fatalf("expected status %d, got %d: %s", http.StatusBadRequest, recorder.Code, recorder.Body.String())
			}
			var response errorResponse
			if err := json.NewDecoder(recorder.Body).Decode(&response); err != nil {
				t.Fatalf("could not decode error response: %v", err)
			}
			if response.Error == "" {
				t.Error("expected a non-empty error message")
			}
		})
	}
}

type failingResponseWriter struct {
	header http.Header
	status int
}

func (w *failingResponseWriter) Header() http.Header {
	if w.header == nil {
		w.header = make(http.Header)
	}
	return w.header
}

func (w *failingResponseWriter) WriteHeader(status int) {
	if w.status == 0 {
		w.status = status
	}
}

func (w *failingResponseWriter) Write([]byte) (int, error) {
	return 0, errors.New("simulated response write failure")
}

func TestHandlersReturnInternalServerErrorWhenResponseEncodingFails(t *testing.T) {
	tests := []struct {
		name    string
		handler http.HandlerFunc
		request *http.Request
	}{
		{
			name:    "health response",
			handler: healthHandler,
			request: httptest.NewRequest(http.MethodGet, "/health", nil),
		},
		{
			name:    "calculation response",
			handler: calculateHandler,
			request: httptest.NewRequest(http.MethodPost, "/calculate", strings.NewReader(`{"expression":"2 + 2"}`)),
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			writer := &failingResponseWriter{}
			test.handler(writer, test.request)
			if writer.status != http.StatusInternalServerError {
				t.Errorf("expected status %d, got %d", http.StatusInternalServerError, writer.status)
			}
		})
	}
}
