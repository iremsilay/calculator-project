package main

import "testing"

func TestCalculate(t *testing.T) {
	tests := []struct {
		name        string
		a           float64
		b           float64
		operation   string
		expected    float64
		expectError bool
	}{
		{
			name:      "addition",
			a:         10,
			b:         5,
			operation: "add",
			expected:  15,
		},
		{
			name:      "subtraction",
			a:         10,
			b:         5,
			operation: "subtract",
			expected:  5,
		},
		{
			name:      "multiplication",
			a:         10,
			b:         5,
			operation: "multiply",
			expected:  50,
		},
		{
			name:      "division",
			a:         10,
			b:         5,
			operation: "divide",
			expected:  2,
		},
		{
			name:        "division by zero",
			a:           10,
			b:           0,
			operation:   "divide",
			expectError: true,
		},
		{
			name:        "unsupported operation",
			a:           10,
			b:           5,
			operation:   "power",
			expectError: true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			result, err := calculate(test.a, test.b, test.operation)

			if test.expectError {
				if err == nil {
					t.Fatal("expected an error, got nil")
				}
				return
			}

			if err != nil {
				t.Fatalf("did not expect an error, got: %v", err)
			}

			if result != test.expected {
				t.Errorf("expected %v, got %v", test.expected, result)
			}
		})
	}
}
