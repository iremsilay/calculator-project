package api

import (
	"encoding/json"
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
