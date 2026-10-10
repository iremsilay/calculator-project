// main package configures and starts the calculator HTTP server.
package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/iremsilay/calculator-project/backend/api"
)

func main() {
	apiHandler := api.NewHandler()
	app := http.NewServeMux()

	// Docker is served under /api. The Vite development proxy removes
	// /api before forwarding, so local development also needs direct routes.
	app.Handle("/api/", http.StripPrefix("/api", apiHandler))
	app.Handle("/health", apiHandler)
	app.Handle("/calculate", apiHandler)

	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "frontend/dist"
	}
	staticFiles := http.FileServer(http.Dir(staticDir))

	app.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			if _, err := os.Stat(filepath.Join(staticDir, "index.html")); err != nil {
				// Locally, Vite serves the frontend on port 5173.
				apiHandler.ServeHTTP(w, r)
				return
			}
		}
		staticFiles.ServeHTTP(w, r)
	}))

	server := &http.Server{
		Addr:         ":8080",
		Handler:      app,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Println("Calculator app is running on http://localhost:8080")
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
