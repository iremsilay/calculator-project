// Package calculator safely parses and evaluates arithmetic expressions.
package calculator

import (
	"fmt"
	"math"
	"strconv"
)

// Evaluate calculates an expression containing +, -, *, /, ^, percentages,
// square roots, parentheses, unary signs, decimal numbers, and whitespace.
// A percentage divides a value by 100 (5% and %5 both mean 0.05).
// Exponentiation is right-associative, so 2^3^2 means 2^(3^2).
func Evaluate(expression string) (float64, error) {
	p := parser{input: expression}
	p.skipWhitespace()
	if p.position == len(p.input) {
		return 0, fmt.Errorf("expression cannot be empty")
	}

	result, err := p.parseExpression()
	if err != nil {
		return 0, err
	}
	p.skipWhitespace()
	if p.position != len(p.input) {
		return 0, fmt.Errorf("unexpected character %q at position %d", p.input[p.position], p.position+1)
	}
	if math.IsNaN(result) || math.IsInf(result, 0) {
		return 0, fmt.Errorf("result is outside the supported numeric range")
	}
	return result, nil
}

type parser struct {
	input    string
	position int
}

// Addition and subtraction have the lowest precedence.
func (p *parser) parseExpression() (float64, error) {
	left, err := p.parseTerm()
	if err != nil {
		return 0, err
	}
	for {
		p.skipWhitespace()
		if p.position >= len(p.input) || (p.input[p.position] != '+' && p.input[p.position] != '-') {
			return left, nil
		}
		op := p.input[p.position]
		p.position++
		right, err := p.parseTerm()
		if err != nil {
			return 0, err
		}
		if op == '+' {
			left += right
		} else {
			left -= right
		}
	}
}

// Multiplication and division bind more tightly than addition and subtraction.
func (p *parser) parseTerm() (float64, error) {
	left, err := p.parseUnary()
	if err != nil {
		return 0, err
	}
	for {
		p.skipWhitespace()
		if p.position >= len(p.input) || (p.input[p.position] != '*' && p.input[p.position] != '/') {
			return left, nil
		}
		op := p.input[p.position]
		p.position++
		right, err := p.parseUnary()
		if err != nil {
			return 0, err
		}
		if op == '*' {
			left *= right
			continue
		}
		if right == 0 {
			return 0, fmt.Errorf("cannot divide by zero")
		}
		left /= right
	}
}

// Unary signs have lower precedence than powers: -2^2 is -(2^2).
func (p *parser) parseUnary() (float64, error) {
	p.skipWhitespace()
	// Prefix % is accepted too, which lets the on-screen % key be entered before digits.
	if p.position < len(p.input) && p.input[p.position] == '%' {
		p.position++
		value, err := p.parseUnary()
		if err != nil {
			return 0, err
		}
		return value / 100, nil
	}
	if p.position < len(p.input) && (p.input[p.position] == '+' || p.input[p.position] == '-') {
		op := p.input[p.position]
		p.position++
		value, err := p.parseUnary()
		if err != nil {
			return 0, err
		}
		if op == '-' {
			return -value, nil
		}
		return value, nil
	}
	return p.parsePower()
}

// Powers associate from right to left: 2^3^2 is parsed as 2^(3^2).
func (p *parser) parsePower() (float64, error) {
	left, err := p.parsePrimary()
	if err != nil {
		return 0, err
	}
	p.skipWhitespace()
	if p.position < len(p.input) && p.input[p.position] == '^' {
		p.position++
		right, err := p.parseUnary()
		if err != nil {
			return 0, err
		}
		left = math.Pow(left, right)
	}
	if math.IsNaN(left) || math.IsInf(left, 0) {
		return 0, fmt.Errorf("result is outside the supported numeric range")
	}
	return left, nil
}

func (p *parser) parsePrimary() (float64, error) {
	p.skipWhitespace()
	if p.position >= len(p.input) {
		return 0, fmt.Errorf("expected a number or expression")
	}

	var value float64
	var err error
	switch {
	case p.input[p.position] == '(':
		p.position++
		value, err = p.parseExpression()
		if err != nil {
			return 0, err
		}
		p.skipWhitespace()
		if p.position >= len(p.input) || p.input[p.position] != ')' {
			return 0, fmt.Errorf("expected closing parenthesis")
		}
		p.position++
	case p.hasPrefix("sqrt") || p.hasPrefix("√"):
		value, err = p.parseSquareRoot()
		if err != nil {
			return 0, err
		}
	default:
		value, err = p.parseNumber()
		if err != nil {
			return 0, err
		}
	}

	// A postfix % is applied to the value immediately before it.
	for {
		p.skipWhitespace()
		if p.position >= len(p.input) || p.input[p.position] != '%' {
			return value, nil
		}
		p.position++
		value /= 100
	}
}

// Supports both sqrt(5) and sqrt5. The keypad uses sqrt5 when √ is pressed
// before a value, and wraps an existing expression as sqrt(expression).
func (p *parser) parseSquareRoot() (float64, error) {
	if p.hasPrefix("sqrt") {
		p.position += len("sqrt")
	} else {
		p.position += len("√")
	}
	p.skipWhitespace()

	var value float64
	var err error
	if p.position < len(p.input) && p.input[p.position] == '(' {
		p.position++
		value, err = p.parseExpression()
		if err != nil {
			return 0, err
		}
		p.skipWhitespace()
		if p.position >= len(p.input) || p.input[p.position] != ')' {
			return 0, fmt.Errorf("expected closing parenthesis after sqrt")
		}
		p.position++
	} else {
		value, err = p.parsePrimary()
		if err != nil {
			return 0, err
		}
	}
	if value < 0 {
		return 0, fmt.Errorf("cannot calculate square root of a negative number")
	}
	return math.Sqrt(value), nil
}

func (p *parser) parseNumber() (float64, error) {
	start := p.position
	digitCount := 0
	for p.position < len(p.input) && isDigit(p.input[p.position]) {
		p.position++
		digitCount++
	}
	if p.position < len(p.input) && p.input[p.position] == '.' {
		p.position++
		for p.position < len(p.input) && isDigit(p.input[p.position]) {
			p.position++
			digitCount++
		}
	}
	if digitCount == 0 {
		return 0, fmt.Errorf("expected a number at position %d", start+1)
	}
	value, err := strconv.ParseFloat(p.input[start:p.position], 64)
	if err != nil || math.IsNaN(value) || math.IsInf(value, 0) {
		return 0, fmt.Errorf("invalid or out-of-range number at position %d", start+1)
	}
	return value, nil
}

func (p *parser) hasPrefix(value string) bool {
	return len(p.input)-p.position >= len(value) && p.input[p.position:p.position+len(value)] == value
}

func (p *parser) skipWhitespace() {
	for p.position < len(p.input) {
		switch p.input[p.position] {
		case ' ', '\t', '\n', '\r':
			p.position++
		default:
			return
		}
	}
}

func isDigit(character byte) bool {
	return character >= '0' && character <= '9'
}
