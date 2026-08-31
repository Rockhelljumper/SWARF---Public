package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

type catalog struct {
	Format      string `json:"format"`
	Schema      string `json:"schema_version"`
	BatchDigest any    `json:"batch_digest"`
	Projects    []any  `json:"projects"`
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func loadCatalog(root string) (catalog, error) {
	path := filepath.Join(root, "generated", "catalog.json")
	contents, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return catalog{Format: "swarf-public-catalog/v1", Schema: "1.0.0", BatchDigest: nil, Projects: []any{}}, nil
	}
	if err != nil {
		return catalog{}, err
	}
	var value catalog
	if err := json.Unmarshal(contents, &value); err != nil {
		return catalog{}, err
	}
	if value.Projects == nil {
		value.Projects = []any{}
	}
	return value, nil
}

func main() {
	healthcheck := flag.Bool("healthcheck", false, "check API health and exit")
	flag.Parse()
	if *healthcheck {
		return
	}
	root := os.Getenv("SWARF_PUBLIC_ROOT")
	if root == "" {
		root = "."
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "swarf-public-api"})
	})
	mux.HandleFunc("GET /api/catalog", func(w http.ResponseWriter, r *http.Request) {
		data, err := loadCatalog(root)
		if err != nil {
			log.Printf("catalog load failed: %v", err)
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "catalog_unavailable"})
			return
		}
		writeJSON(w, http.StatusOK, data)
	})
	server := &http.Server{Addr: ":8080", Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	log.Printf("SWARF public API listening on %s", server.Addr)
	log.Fatal(server.ListenAndServe())
}
