package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestNewAppServesAPIWithAndWithoutDockerPrefix(t *testing.T) {
	staticDir := filepath.Join(t.TempDir(), "missing-frontend-build")
	tests := []struct {
		name       string
		method     string
		path       string
		body       string
		wantStatus int
		wantBody   string
	}{
		{name: "local health route", method: http.MethodGet, path: "/health", wantStatus: http.StatusOK, wantBody: `"status":"ok"`},
		{name: "Docker health route", method: http.MethodGet, path: "/api/health", wantStatus: http.StatusOK, wantBody: `"status":"ok"`},
		{name: "local calculation route", method: http.MethodPost, path: "/calculate", body: `{"expression":"2 + 2"}`, wantStatus: http.StatusOK, wantBody: `"result":4`},
		{name: "Docker calculation route", method: http.MethodPost, path: "/api/calculate", body: `{"expression":"2 + 2"}`, wantStatus: http.StatusOK, wantBody: `"result":4`},
	}

	app := newApp(staticDir)
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(test.method, test.path, strings.NewReader(test.body))
			recorder := httptest.NewRecorder()
			app.ServeHTTP(recorder, request)

			if recorder.Code != test.wantStatus {
				t.Fatalf("expected status %d, got %d: %s", test.wantStatus, recorder.Code, recorder.Body.String())
			}
			if !strings.Contains(recorder.Body.String(), test.wantBody) {
				t.Errorf("expected response body to contain %q, got %q", test.wantBody, recorder.Body.String())
			}
		})
	}
}

func TestNewAppAcceptsDefaultStaticDirectory(t *testing.T) {
	app := newApp("")
	recorder := httptest.NewRecorder()
	app.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/health", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, recorder.Code)
	}
}

func TestNewAppFallsBackToAPIWhenFrontendBuildIsMissing(t *testing.T) {
	app := newApp(filepath.Join(t.TempDir(), "missing-frontend-build"))
	recorder := httptest.NewRecorder()
	app.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"message":"Calculator API"`) {
		t.Errorf("expected API information response, got %q", recorder.Body.String())
	}
}

func TestNewAppServesBuiltFrontendFiles(t *testing.T) {
	staticDir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(staticDir, "assets"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(staticDir, "index.html"), []byte("<main>calculator frontend</main>"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(staticDir, "assets", "app.js"), []byte("console.log('calculator')"), 0o644); err != nil {
		t.Fatal(err)
	}

	app := newApp(staticDir)
	for _, path := range []string{"/", "/assets/app.js"} {
		recorder := httptest.NewRecorder()
		app.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, path, nil))
		if recorder.Code != http.StatusOK {
			t.Errorf("GET %s: expected status %d, got %d", path, http.StatusOK, recorder.Code)
		}
	}
}
