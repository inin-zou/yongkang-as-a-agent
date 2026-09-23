package repository

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
)

// SupabaseRepository handles dynamic data stored in Supabase/PostgreSQL.
type SupabaseRepository struct {
	db *sql.DB
}

// NewSupabaseRepository connects to Supabase and returns a repository.
func NewSupabaseRepository(databaseURL string) (*SupabaseRepository, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)

	return &SupabaseRepository{db: db}, nil
}

// Close closes the database connection.
func (r *SupabaseRepository) Close() error {
	return r.db.Close()
}
