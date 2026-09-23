package repository

import (
	"database/sql"
	"strings"
)

// nullStr returns a *string pointer: nil if empty, otherwise a pointer to the value.
func nullStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// toNullString converts an empty string to sql.NullString{Valid: false}.
func toNullString(s string) sql.NullString {
	if strings.TrimSpace(s) == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: s, Valid: true}
}
