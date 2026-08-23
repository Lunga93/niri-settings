// Package protocol defines the JSON wire format shared by every command and
// the helpers used to answer requests. It is the only place that knows about
// the Request/Response envelope; domain packages expose Handler functions and
// never touch os.Stdout directly.
package protocol

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
)

// AppError is the structured error type returned to the frontend.
type AppError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details,omitempty"`
}

// Response wraps a successful payload or an error.
type Response struct {
	OK    bool      `json:"ok"`
	Data  any       `json:"data,omitempty"`
	Error *AppError `json:"error,omitempty"`
}

// Request represents an incoming command from the frontend.
type Request struct {
	Command string         `json:"command"`
	Args    map[string]any `json:"args"`
}

// Handler executes a single command. Args is never nil when invoked.
type Handler func(args map[string]any)

// Out is the destination for all responses. A variable (not a constant
// os.Stdout) so tests can capture output if needed.
var Out io.Writer = os.Stdout

// WriteResponse encodes a successful response.
func WriteResponse(data any) {
	if err := json.NewEncoder(Out).Encode(Response{OK: true, Data: data}); err != nil {
		log.Printf("[sidecar:go] failed to encode response: %v\n", err)
	}
}

// WriteError encodes a structured failure and logs it.
func WriteError(code, message string, details any) {
	log.Printf("[sidecar:go] ERROR [%s] %s (details: %v)\n", code, message, details)
	if err := json.NewEncoder(Out).Encode(Response{
		OK:    false,
		Error: &AppError{Code: code, Message: message, Details: details},
	}); err != nil {
		log.Printf("[sidecar:go] failed to encode error response: %v\n", err)
	}
}

// GetStringArg extracts a string argument.
func GetStringArg(args map[string]any, key string) (string, bool) {
	val, ok := args[key]
	if !ok {
		return "", false
	}
	s, ok := val.(string)
	return s, ok
}

// GetIntArg extracts an integer argument, accepting JSON numbers (float64).
func GetIntArg(args map[string]any, key string) (int, bool) {
	val, ok := args[key]
	if !ok {
		return 0, false
	}
	switch v := val.(type) {
	case float64:
		return int(v), true
	case int:
		return v, true
	default:
		return 0, false
	}
}

// InvalidArgs writes the standard INVALID_ARGS error.
func InvalidArgs(message string) {
	WriteError("INVALID_ARGS", message, nil)
}

// HomeDir resolves the user home directory or writes USER_DIR_ERROR /
// HOME_ERROR style failures. Returns "" after writing an error.
func HomeDir(errCode string) string {
	home, err := os.UserHomeDir()
	if err != nil {
		WriteError(errCode, fmt.Sprintf("Could not determine home directory: %v", err), nil)
		return ""
	}
	return home
}

// WithHome wraps a handler function that needs the user's home directory.
// It resolves HOME once, calls fn only if successful, and silently
// returns (after writing an error) if home cannot be determined.
func WithHome(fn func(home string, args map[string]any)) Handler {
	return func(args map[string]any) {
		home := HomeDir("HOME_ERROR")
		if home == "" {
			return
		}
		fn(home, args)
	}
}
