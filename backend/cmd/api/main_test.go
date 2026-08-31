package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadCatalogUsesEmptyStateWhenNoPublicationExists(t *testing.T) {
	catalog, err := loadCatalog(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if catalog.Format != "swarf-public-catalog/v1" || len(catalog.Projects) != 0 {
		t.Fatalf("unexpected empty catalog: %#v", catalog)
	}
}

func TestLoadCatalogReadsPublicGeneratedCatalog(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, "generated"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "generated", "catalog.json"), []byte(`{"format":"swarf-public-catalog/v1","schema_version":"1.0.0","batch_digest":"digest","projects":[{"slug":"sample"}]}`), 0o644); err != nil {
		t.Fatal(err)
	}
	catalog, err := loadCatalog(root)
	if err != nil {
		t.Fatal(err)
	}
	if catalog.BatchDigest != "digest" || len(catalog.Projects) != 1 {
		t.Fatalf("unexpected catalog: %#v", catalog)
	}
}
