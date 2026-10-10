// main package configures and starts the calculator HTTP server.
package main

import (
	"log"
	"net/http"
	"time"

	"github.com/iremsilay/calculator-project/backend/api"
)

func main() {
	server := &http.Server{
		Addr:         ":8080",
		Handler:      api.NewHandler(),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Println("Backend server is running on http://localhost:8080")
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
