package calculator

import (
	"math"
	"testing"
)

func TestEvaluate(t *testing.T) {
	tests := []struct {
		name        string
		expression  string
		expected    float64
		expectError bool
	}{
		{name: "addition", expression: "10 + 5", expected: 15},
		{name: "subtraction", expression: "10 - 5", expected: 5},
		{name: "multiplication", expression: "10 * 5", expected: 50},
		{name: "division", expression: "10 / 5", expected: 2},
		{name: "operator precedence", expression: "2 + 3 * 4", expected: 14},
		{name: "parentheses", expression: "5 + 4 - (8 - 9) * 3", expected: 12},
		{name: "nested parentheses", expression: "2 * (3 + (4 - 1))", expected: 12},
		{name: "unary minus", expression: "-3 + 5", expected: 2},
		{name: "decimal", expression: "1.5 * 2", expected: 3},
		{name: "whitespace", expression: "  8\t/ 2 + 1 ", expected: 5},
		{name: "exponentiation", expression: "2 ^ 3", expected: 8},
		{name: "exponentiation is right associative", expression: "2^3^2", expected: 512},
		{name: "exponent has precedence over unary minus", expression: "-2^2", expected: -4},
		{name: "square root function", expression: "sqrt(5)", expected: math.Sqrt(5)},
		{name: "square root compact notation", expression: "sqrt5", expected: math.Sqrt(5)},
		{name: "square root symbol", expression: "√5", expected: math.Sqrt(5)},
		{name: "square root of expression", expression: "sqrt(9 + 16)", expected: 5},
		{name: "postfix percentage", expression: "63%", expected: 0.63},
		{name: "prefix percentage for keypad entry", expression: "%63", expected: 0.63},
		{name: "percentage in expression", expression: "96 * 3% * 6", expected: 17.28},
		{name: "percentage after parenthesized value", expression: "(25 + 25)%", expected: 0.5},
		{name: "all features together", expression: "sqrt(81) + 2^3 + 10%", expected: 17.1},
		{name: "division by zero", expression: "10 / 0", expectError: true},
		{name: "negative square root", expression: "sqrt(-1)", expectError: true},
		{name: "empty expression", expression: "  ", expectError: true},
		{name: "missing operand", expression: "2 +", expectError: true},
		{name: "unclosed parenthesis", expression: "(2 + 3", expectError: true},
		{name: "unclosed square root", expression: "sqrt(5", expectError: true},
		{name: "extra closing parenthesis", expression: "2 + 3)", expectError: true},
		{name: "unsupported operator", expression: "2 ** 3", expectError: true},
		{name: "invalid character", expression: "2 + x", expectError: true},
		{name: "adjacent numbers", expression: "2 3", expectError: true},
		{name: "code is not evaluated", expression: "1 + 2; alert(1)", expectError: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			result, err := Evaluate(test.expression)
			if test.expectError {
				if err == nil {
					t.Fatalf("expected an error for %q, got result %v", test.expression, result)
				}
				return
			}
			if err != nil {
				t.Fatalf("Evaluate(%q) returned unexpected error: %v", test.expression, err)
			}
			if math.Abs(result-test.expected) > 1e-9 {
				t.Errorf("Evaluate(%q) = %v; want %v", test.expression, result, test.expected)
			}
		})
	}
}
