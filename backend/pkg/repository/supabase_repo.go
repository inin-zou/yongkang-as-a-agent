package repository

import (
	"database/sql"
	"fmt"
	"strings"

	_ "github.com/lib/pq"
)

// SupabaseRepository handles dynamic data stored in Supabase/PostgreSQL.
type SupabaseRepository struct {
	db *sql.DB
}

// NewSupabaseRepository connects to Supabase and returns a repository.
func NewSupabaseRepository(databaseURL string) (*SupabaseRepository, error) {
	db, err := sql.Open("postgres", withBinaryParameters(databaseURL))
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

// withBinaryParameters makes lib/pq send each parameterized query as one
// Parse/Bind/Execute batch. Supabase's pooler (port 6543) runs in transaction
// mode and can move a connection between lib/pq's default prepare and execute
// round trips, failing concurrent queries with "unnamed prepared statement
// does not exist". Side effect: []byte arguments are sent in binary format, so
// JSON for jsonb columns must be passed as a string.
func withBinaryParameters(dsn string) string {
	if strings.Contains(dsn, "binary_parameters=") {
		return dsn
	}
	if !strings.Contains(dsn, "://") {
		return dsn + " binary_parameters=yes" // key=value DSN
	}
	if strings.Contains(dsn, "?") {
		return dsn + "&binary_parameters=yes"
	}
	return dsn + "?binary_parameters=yes"
}
