// The main package configures and starts the calculator HTTP server.
package main

import (
	"log"
	"net/http"

	"github.com/iremsilay/calculator-project/backend/api"
)

func main() {
	server := &http.Server{
		Addr:    ":8080",
		Handler: api.NewHandler(),
	}

	log.Println("Backend server is running on http://localhost:8080")
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
