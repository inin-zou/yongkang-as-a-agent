package service

// ExternalError preserves the public failure status and message for an upstream operation.
type ExternalError struct {
	StatusCode int
	Message    string
}

func (e *ExternalError) Error() string { return e.Message }
