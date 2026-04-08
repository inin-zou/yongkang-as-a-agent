package backend

import "embed"

//go:embed data/*.json
var DataFS embed.FS
