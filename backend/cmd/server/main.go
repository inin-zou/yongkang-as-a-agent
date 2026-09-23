package main

import (
	"log"
	"net/http"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/app"
)

func main() {
	cfg := app.LoadConfig(app.Local)
	router, closeApp := app.New(cfg)
	defer closeApp()

	log.Printf("Server starting on port %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, router); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
