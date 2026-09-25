package repository

import "testing"

func TestWithBinaryParameters(t *testing.T) {
	for in, want := range map[string]string{
		"postgresql://u:p@host:6543/postgres?sslmode=require": "postgresql://u:p@host:6543/postgres?sslmode=require&binary_parameters=yes",
		"postgres://u:p@host/db":                              "postgres://u:p@host/db?binary_parameters=yes",
		"host=h dbname=d":                                     "host=h dbname=d binary_parameters=yes",
		"postgres://u:p@host/db?binary_parameters=no":         "postgres://u:p@host/db?binary_parameters=no",
	} {
		if got := withBinaryParameters(in); got != want {
			t.Errorf("withBinaryParameters(%q) = %q, want %q", in, got, want)
		}
	}
}
