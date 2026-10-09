package calculator

import (
	"math"
	"testing"
)

// TestManualCalculatorChecks exercises the supported calculator behavior.
// Run it with: go test -v ./calculator
func TestManualCalculatorChecks(t *testing.T) {
	tests := []struct {
		name       string
		expression string
		want       float64
		wantError  bool
	}{
		// Four basic operations
		{name: "addition", expression: "10 + 5", want: 15},
		{name: "subtraction", expression: "10 - 5", want: 5},
		{name: "multiplication", expression: "10 * 5", want: 50},
		{name: "division", expression: "10 / 5", want: 2},
		{name: "negative result", expression: "5 - 10", want: -5},
		{name: "decimal operands", expression: "1.5 * 2", want: 3},

		// Precedence, parentheses, and associativity
		{name: "multiplication before addition", expression: "2 + 3 * 4", want: 14},
		{name: "division before subtraction", expression: "20 - 12 / 3", want: 16},
		{name: "left associative subtraction", expression: "10 - 3 - 2", want: 5},
		{name: "left associative division", expression: "20 / 5 / 2", want: 2},
		{name: "parentheses", expression: "(2 + 3) * 4", want: 20},
		{name: "nested parentheses", expression: "2 * (3 + (4 - 1))", want: 12},
		{name: "requested example", expression: "5 + 4 - (8 - 9) * 3", want: 12},
		{name: "whitespace", expression: "  8\t/ 2 + 1 ", want: 5},
		{name: "unary plus and minus", expression: "-3 + +5", want: 2},

		// Exponentiation
		{name: "power", expression: "2^3", want: 8},
		{name: "power is right associative", expression: "2^3^2", want: 512},
		{name: "power before unary minus", expression: "-2^2", want: -4},
		{name: "parentheses change negative base", expression: "(-2)^2", want: 4},
		{name: "negative exponent", expression: "2^-2", want: 0.25},
		{name: "power inside expression", expression: "2 + 3^2 * 2", want: 20},

		// Square root
		{name: "square root function", expression: "sqrt(5)", want: math.Sqrt(5)},
		{name: "square root compact form", expression: "sqrt5", want: math.Sqrt(5)},
		{name: "square root symbol", expression: "√5", want: math.Sqrt(5)},
		{name: "square root of expression", expression: "sqrt(9 + 16)", want: 5},
		{name: "square root with power", expression: "sqrt((3 + 2)^2)", want: 5},
		{name: "perfect square root", expression: "sqrt(81)", want: 9},

		// Percent: both prefix and postfix forms mean divide by 100
		{name: "postfix percent", expression: "63%", want: 0.63},
		{name: "prefix percent keypad entry", expression: "%63", want: 0.63},
		{name: "percent in multiplication", expression: "200 * 10%", want: 20},
		{name: "percent after parentheses", expression: "(25 + 25)%", want: 0.5},
		{name: "reported style expression", expression: "96 * 3% * 6", want: 17.28},

		// Mixed operations
		{name: "all advanced operations together", expression: "sqrt(81) + 2^3 + 10%", want: 17.1},

		// Inputs that must be rejected
		{name: "empty expression", expression: "   ", wantError: true},
		{name: "division by zero", expression: "10 / 0", wantError: true},
		{name: "negative square root", expression: "sqrt(-1)", wantError: true},
		{name: "missing operand", expression: "2 +", wantError: true},
		{name: "missing divisor", expression: "2 /", wantError: true},
		{name: "unclosed parentheses", expression: "(2 + 3", wantError: true},
		{name: "extra closing parenthesis", expression: "2 + 3)", wantError: true},
		{name: "unclosed sqrt parentheses", expression: "sqrt(5", wantError: true},
		{name: "incomplete power", expression: "2^", wantError: true},
		{name: "double star is not the power key", expression: "2**3", wantError: true},
		{name: "adjacent numbers need an operator", expression: "2 3", wantError: true},
		{name: "percent with no number", expression: "%", wantError: true},
		{name: "invalid character", expression: "2 + x", wantError: true},
		{name: "malicious code is rejected", expression: "1 + 2; alert(1)", wantError: true},
		{name: "overflow is rejected", expression: "10^1000", wantError: true},
		{name: "zero to negative power is rejected", expression: "0^-1", wantError: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := Evaluate(test.expression)
			if test.wantError {
				if err == nil {
					t.Fatalf("Evaluate(%q) = %v, expected an error", test.expression, got)
				}
				t.Logf("expected error: %v", err)
				return
			}
			if err != nil {
				t.Fatalf("Evaluate(%q) returned unexpected error: %v", test.expression, err)
			}
			if math.IsNaN(got) || math.IsInf(got, 0) || math.Abs(got-test.want) > 1e-9 {
				t.Errorf("Evaluate(%q) = %.12g; want %.12g", test.expression, got, test.want)
			}
		})
	}
}
