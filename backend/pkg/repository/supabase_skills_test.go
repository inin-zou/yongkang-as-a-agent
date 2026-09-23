package repository

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"io"
	"reflect"
	"strings"
	"testing"
)

// This driver checks transaction boundaries and supplied values without connecting
// to PostgreSQL or executing SQL against any database.
type skillSQLStep struct {
	kind, contains string
	args           []driver.Value
	columns        []string
	rows           [][]driver.Value
	err            error
}
type skillSQLDriver struct {
	t     *testing.T
	steps []skillSQLStep
}

func (d *skillSQLDriver) Open(string) (driver.Conn, error)             { return d, nil }
func (d *skillSQLDriver) Connect(context.Context) (driver.Conn, error) { return d, nil }
func (d *skillSQLDriver) Driver() driver.Driver                        { return d }
func (d *skillSQLDriver) Close() error                                 { return nil }
func (d *skillSQLDriver) Prepare(string) (driver.Stmt, error) {
	return nil, errors.New("unexpected prepare")
}
func (d *skillSQLDriver) next(kind, query string, args []driver.NamedValue) skillSQLStep {
	d.t.Helper()
	if len(d.steps) == 0 {
		d.t.Fatalf("unexpected %s: %s", kind, query)
	}
	s := d.steps[0]
	d.steps = d.steps[1:]
	if s.kind != kind || !strings.Contains(query, s.contains) {
		d.t.Fatalf("got %s %q; want %s containing %q", kind, query, s.kind, s.contains)
	}
	if s.args != nil {
		values := make([]driver.Value, len(args))
		for i, a := range args {
			values[i] = a.Value
		}
		if !reflect.DeepEqual(values, s.args) {
			d.t.Fatalf("arguments = %#v, want %#v", values, s.args)
		}
	}
	return s
}
func (d *skillSQLDriver) Begin() (driver.Tx, error) { s := d.next("begin", "", nil); return d, s.err }
func (d *skillSQLDriver) Commit() error             { return d.next("commit", "", nil).err }
func (d *skillSQLDriver) Rollback() error           { return d.next("rollback", "", nil).err }
func (d *skillSQLDriver) ExecContext(_ context.Context, q string, a []driver.NamedValue) (driver.Result, error) {
	s := d.next("exec", q, a)
	return driver.RowsAffected(1), s.err
}
func (d *skillSQLDriver) QueryContext(_ context.Context, q string, a []driver.NamedValue) (driver.Rows, error) {
	s := d.next("query", q, a)
	return &skillSQLRows{columns: s.columns, rows: s.rows}, s.err
}

type skillSQLRows struct {
	columns []string
	rows    [][]driver.Value
}

func (r *skillSQLRows) Columns() []string { return r.columns }
func (r *skillSQLRows) Close() error      { return nil }
func (r *skillSQLRows) Next(dest []driver.Value) error {
	if len(r.rows) == 0 {
		return io.EOF
	}
	copy(dest, r.rows[0])
	r.rows = r.rows[1:]
	return nil
}
func skillTestRepository(t *testing.T, steps []skillSQLStep) *SupabaseRepository {
	t.Helper()
	d := &skillSQLDriver{t: t, steps: steps}
	db := sql.OpenDB(d)
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Error(err)
		}
		if len(d.steps) != 0 {
			t.Errorf("%d SQL steps left", len(d.steps))
		}
	})
	return &SupabaseRepository{db: db}
}
func skillWriteSteps(kind string, order int, remaining, want []string) []skillSQLStep {
	steps := []skillSQLStep{{kind: "begin"}, {kind: "exec", contains: "LOCK TABLE skills IN SHARE ROW EXCLUSIVE MODE"}}
	if kind == "delete" {
		steps = append(steps, skillSQLStep{kind: "exec", contains: "DELETE FROM skills"})
	} else {
		statement := "UPDATE skills"
		if kind == "create" {
			statement = "INSERT INTO skills"
		}
		steps = append(steps, skillSQLStep{kind: "query", contains: statement, columns: []string{"id", "title", "slug", "skills", "battle_tested", "sort_order"}, rows: [][]driver.Value{{"target", "Title", "slug", []byte(`[]`), []byte(`[]`), int64(order)}}})
	}
	rows := [][]driver.Value{}
	for _, id := range remaining {
		rows = append(rows, []driver.Value{id})
	}
	changedID := "target"
	if kind == "delete" {
		changedID = ""
	}
	steps = append(steps, skillSQLStep{kind: "query", contains: "ORDER BY sort_order, created_at, id", args: []driver.Value{changedID}, columns: []string{"id"}, rows: rows})
	for i, id := range want {
		steps = append(steps, skillSQLStep{kind: "exec", contains: "UPDATE skills SET sort_order", args: []driver.Value{id, int64(i)}})
	}
	return append(steps, skillSQLStep{kind: "commit"})
}
func TestSkillWritesKeepSequentialOrdering(t *testing.T) {
	tests := []struct {
		name, kind      string
		order           int
		remaining, want []string
	}{
		{"first skill", "create", 0, nil, []string{"target"}},
		{"delete final skill", "delete", 0, nil, nil},
		{"insert at occupied position", "create", 0, []string{"a", "b"}, []string{"target", "a", "b"}},
		{"move down", "update", 2, []string{"a", "b"}, []string{"a", "b", "target"}},
		{"move up", "update", 0, []string{"a", "b"}, []string{"target", "a", "b"}},
		{"out of range appends", "create", 40, []string{"a", "b"}, []string{"a", "b", "target"}},
		{"negative prepends", "update", -4, []string{"a", "b"}, []string{"target", "a", "b"}},
		{"delete closes gaps", "delete", 0, []string{"a", "b"}, []string{"a", "b"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := skillTestRepository(t, skillWriteSteps(tt.kind, tt.order, tt.remaining, tt.want))
			if tt.kind == "delete" {
				if err := r.DeleteSkill("target"); err != nil {
					t.Fatal(err)
				}
				return
			}
			var actual int
			if tt.kind == "create" {
				skill, err := r.CreateSkill("Title", "slug", []string{}, []string{}, tt.order)
				if err != nil {
					t.Fatal(err)
				}
				actual = skill.SortOrder
			} else {
				skill, err := r.UpdateSkill("target", "Title", "slug", []string{}, []string{}, tt.order)
				if err != nil {
					t.Fatal(err)
				}
				actual = skill.SortOrder
			}
			if actual < 0 || actual >= len(tt.want) || tt.want[actual] != "target" {
				t.Errorf("returned sortOrder %d does not match target position", actual)
			}
		})
	}
}
func TestSkillRenumberFailureRollsBack(t *testing.T) {
	for _, kind := range []string{"create", "update", "delete"} {
		t.Run(kind, func(t *testing.T) {
			want := []string{"target", "a"}
			if kind == "delete" {
				want = []string{"a", "b"}
			}
			steps := skillWriteSteps(kind, 0, []string{"a", "b"}, want)
			steps = steps[:len(steps)-1]
			steps[len(steps)-1].err = fmt.Errorf("write failed")
			steps = append(steps, skillSQLStep{kind: "rollback"})
			r := skillTestRepository(t, steps)
			var err error
			switch kind {
			case "create":
				_, err = r.CreateSkill("Title", "slug", nil, nil, 0)
			case "update":
				_, err = r.UpdateSkill("target", "Title", "slug", nil, nil, 0)
			case "delete":
				err = r.DeleteSkill("target")
			}
			if err == nil || !strings.Contains(err.Error(), "write failed") {
				t.Fatalf("error = %v", err)
			}
		})
	}
}

func TestSkillUpdateMissingIDPreservesError(t *testing.T) {
	r := skillTestRepository(t, []skillSQLStep{
		{kind: "begin"},
		{kind: "exec", contains: "LOCK TABLE skills IN SHARE ROW EXCLUSIVE MODE"},
		{kind: "query", contains: "UPDATE skills", columns: []string{"id", "title", "slug", "skills", "battle_tested", "sort_order"}},
		{kind: "rollback"},
	})
	_, err := r.UpdateSkill("missing", "Title", "slug", nil, nil, 0)
	if err == nil || err.Error() != `skill with id "missing" not found` {
		t.Fatalf("error = %v", err)
	}
}

func TestSkillLockFailureRollsBackBeforeWriting(t *testing.T) {
	r := skillTestRepository(t, []skillSQLStep{
		{kind: "begin"},
		{kind: "exec", contains: "LOCK TABLE skills IN SHARE ROW EXCLUSIVE MODE", err: errors.New("lock failed")},
		{kind: "rollback"},
	})
	if err := r.DeleteSkill("target"); err == nil || !strings.Contains(err.Error(), "lock failed") {
		t.Fatalf("error = %v", err)
	}
}
