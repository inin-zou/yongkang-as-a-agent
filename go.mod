module github.com/inin-zou/yongkang-as-a-agent

go 1.23

require (
	github.com/go-chi/chi/v5 v5.2.5
	github.com/inin-zou/yongkang-as-a-agent/backend v0.0.0
)

require github.com/lib/pq v1.12.3 // indirect

replace github.com/inin-zou/yongkang-as-a-agent/backend => ./backend
