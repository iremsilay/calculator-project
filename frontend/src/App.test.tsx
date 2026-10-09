import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
}) as Response;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('calculator frontend', () => {
  it('sends an expression to the API and displays its result', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).endsWith('/health')) {
        return jsonResponse({ status: 'ok' });
      }
      return jsonResponse({ result: 12 });
    });

    render(<App />);
    await user.type(screen.getByLabelText('Mathematical expression'), '5 + 4 - (8 - 9) * 3');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(screen.getByLabelText('Calculation result')).toHaveTextContent('12'));
    const calculationCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith('/calculate'));
    expect(calculationCall).toBeDefined();
    expect(JSON.parse(String(calculationCall?.[1]?.body))).toEqual({ expression: '5 + 4 - (8 - 9) * 3' });
  });

  it('shows the backend error when division by zero is rejected', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).endsWith('/health')) {
        return jsonResponse({ status: 'ok' });
      }
      return jsonResponse({ error: 'cannot divide by zero' }, 400);
    });

    render(<App />);
    const expression = screen.getByLabelText('Mathematical expression');
    await user.clear(expression);
    await user.type(expression, '10 / 0');
    await user.click(screen.getByRole('button', { name: '=' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('cannot divide by zero');
  });

  it('switches into developer mode and reveals the request inspector', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ status: 'ok' }),
    );

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Developer' }));

    expect(screen.getByRole('complementary', { name: 'HTTP request inspector' })).toBeInTheDocument();
    expect(screen.getAllByText('/calculate').length).toBeGreaterThan(0);
  });

  it('adds keypad presses to the expression and submits with the equals key', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).endsWith('/health')) return jsonResponse({ status: 'ok' });
      return jsonResponse({ result: 8 });
    });

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'AC' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Exponent' }));
    await user.click(screen.getByRole('button', { name: '3' }));
    await user.click(screen.getByRole('button', { name: '=' }));

    await waitFor(() => expect(screen.getByLabelText('Calculation result')).toHaveTextContent('8'));
    const calculationCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith('/calculate'));
    expect(JSON.parse(String(calculationCall?.[1]?.body))).toEqual({ expression: '2^3' });
  });
});
