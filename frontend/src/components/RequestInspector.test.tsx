import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RequestInspector from './RequestInspector';
import type { HistoryItem } from './types';

function makeHistoryItem(overrides: Partial<HistoryItem> = {}): HistoryItem {
  return {
    id: 1,
    expression: '2 + 2',
    result: '4',
    status: 200,
    duration: 12.34,
    request: { expression: '2 + 2' },
    response: { result: 4 },
    ...overrides,
  };
}

function mockClipboard(writeText = vi.fn().mockResolvedValue(undefined)) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  return writeText;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'clipboard');
});

describe('RequestInspector', () => {
  it('shows the current expression and an empty response before a request', () => {
    render(<RequestInspector lastRequest={null} expression="3 + 4" />);

    expect(screen.getByText(/"expression": "3 \+ 4"/)).toBeInTheDocument();
    expect(
      screen.getByText('Submit an expression to inspect the response payload.'),
    ).toBeVisible();
    expect(screen.queryByLabelText('HTTP response metadata')).not.toBeInTheDocument();
  });

  it.each([
    { status: 0, label: 'Network Error' },
    { status: 200, label: '200 OK' },
    { status: 400, label: '400 Bad Request' },
    { status: 500, label: '500 Error' },
  ])('renders status $status as $label', ({ status, label }) => {
    render(
      <RequestInspector
        lastRequest={makeHistoryItem({ status })}
        expression="2 + 2"
      />,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText('12.3 ms')).toBeInTheDocument();

    const responseMetadata = screen.getByLabelText('HTTP response metadata');
    expect(
      within(responseMetadata).getByText('application/json'),
    ).toBeInTheDocument();
    if (status === 200) {
      expect(responseMetadata).not.toHaveClass('has-error');
    } else {
      expect(responseMetadata).toHaveClass('has-error');
      expect(screen.getByText(label)).toHaveClass('failure');
    }
  });

  it('copies a cURL command using the trimmed current expression', async () => {
    const user = userEvent.setup();
    const writeText = mockClipboard();
    render(<RequestInspector lastRequest={null} expression="  2 + 2  " />);

    await user.click(screen.getByRole('button', { name: 'Copy as cURL' }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        `curl -X POST http://localhost:8080/calculate -H "Content-Type: application/json" -d '{"expression":"2 + 2"}'`,
      ),
    );
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();
  });

  it('uses the last submitted expression when the current expression is blank and escapes shell quotes', async () => {
    const user = userEvent.setup();
    const writeText = mockClipboard();
    render(
      <RequestInspector
        lastRequest={makeHistoryItem({ expression: "1 + 'x'" })}
        expression="   "
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Copy as cURL' }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        `curl -X POST http://localhost:8080/calculate -H "Content-Type: application/json" -d '{"expression":"1 + '\\''x'\\''"}'`,
      ),
    );
  });

  it('uses an empty expression when there is no current or previous expression', async () => {
    const user = userEvent.setup();
    const writeText = mockClipboard();
    render(<RequestInspector lastRequest={null} expression="   " />);

    await user.click(screen.getByRole('button', { name: 'Copy as cURL' }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        `curl -X POST http://localhost:8080/calculate -H "Content-Type: application/json" -d '{"expression":""}'`,
      ),
    );
  });

  it('clears the previous copied-feedback timer when copying again', async () => {
    const user = userEvent.setup();
    const writeText = mockClipboard();
    render(<RequestInspector lastRequest={null} expression="2 + 2" />);

    await user.click(screen.getByRole('button', { name: 'Copy as cURL' }));
    const copiedButton = await screen.findByRole('button', { name: 'Copied!' });
    await user.click(copiedButton);

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();
  });

  it('resets copied feedback after two seconds', async () => {
    vi.useFakeTimers();
    const writeText = mockClipboard();
    render(<RequestInspector lastRequest={null} expression="2 + 2" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy as cURL' }));
      await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('button', { name: 'Copy as cURL' })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it('does not leave a feedback timer running after unmount', async () => {
    vi.useFakeTimers();
    mockClipboard();
    const { unmount } = render(
      <RequestInspector lastRequest={null} expression="2 + 2" />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy as cURL' }));
      await Promise.resolve();
    });
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the copy button usable when clipboard access fails', async () => {
    const user = userEvent.setup();
    mockClipboard(vi.fn().mockRejectedValue(new Error('clipboard unavailable')));
    render(<RequestInspector lastRequest={null} expression="2 + 2" />);

    await user.click(screen.getByRole('button', { name: 'Copy as cURL' }));

    expect(
      await screen.findByRole('button', { name: 'Copy as cURL' }),
    ).toBeInTheDocument();
  });
});
