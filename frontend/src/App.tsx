import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { ApiError, calculate, checkHealth } from './api';
import Display from './components/Display';
import HistoryList from './components/HistoryList';
import Keypad from './components/Keypad';
import RequestInspector from './components/RequestInspector';
import type { HistoryItem } from './components/types';

type Mode = 'simple' | 'developer';
type Theme = 'light' | 'dark';

export default function App() {
  const [mode, setMode] = useState<Mode>('simple');
  const [theme, setTheme] = useState<Theme>(() =>
    localStorage.getItem('calcrest-theme') === 'dark' ? 'dark' : 'light',
  );
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lastRequest, setLastRequest] = useState<HistoryItem | null>(null);
  const activeRequestController = useRef<AbortController | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('calcrest-theme', theme);
  }, [theme]);

  useEffect(() => {
    const controller = new AbortController();
    void checkHealth(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => () => activeRequestController.current?.abort(), []);

  async function submitCalculation(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const value = expression.trim();

    if (!value) {
      setError('Enter a mathematical expression first.');
      return;
    }

    activeRequestController.current?.abort();
    const controller = new AbortController();
    activeRequestController.current = controller;

    setError('');
    setResult(null);
    setLoading(true);
    const payload = { expression: value };
    const started = performance.now();

    try {
      const data = await calculate(payload, controller.signal);
      const item: HistoryItem = {
        id: Date.now(),
        expression: value,
        result: String(data.result),
        status: 200,
        duration: performance.now() - started,
        request: payload,
        response: data,
      };

      setResult(data.result);
      setHistory((items) => [item, ...items].slice(0, 8));
      setLastRequest(item);
    } catch (caught) {
      if (
        typeof caught === 'object' &&
        caught !== null &&
        'name' in caught &&
        caught.name === 'AbortError'
      ) {
        return;
      }

      const message = caught instanceof Error
      ? caught.message
        : 'Could not reach the calculator API.';
      const item: HistoryItem = {
        id: Date.now(),
        expression: value,
        result: 'Error',
        status: caught instanceof ApiError ? caught.status : 0,
        duration: performance.now() - started,
        request: payload,
        response: { error: message },
      };

      setError(message);
      setHistory((items) => [item, ...items].slice(0, 8));
      setLastRequest(item);
    } finally {
      // Eski isteğin finally bloğu daha yeni isteğin loading durumunu bozmamalı.
      if (activeRequestController.current === controller) {
        activeRequestController.current = null;
        setLoading(false);
      }
    }
  }

  function reset() {
    activeRequestController.current?.abort();
    activeRequestController.current = null;
    setExpression('');
    setResult(null);
    setError('');
    setLoading(false);
    setLastRequest(null);
  }

  function handlePressKey(key: string) {
    setError('');
    setResult(null);

    if (key === 'AC') {
      setExpression('');
    } else if (key === 'CE') {
      setExpression((current) => current.slice(0, -1));
    } else if (key === '√') {
      setExpression((current) => current.trim() ? `sqrt(${current})` : 'sqrt(');
    } else if (key === '±') {
      setExpression((current) => current.startsWith('-(') && current.endsWith(')')
        ? current.slice(2, -1)
        : current ? `-(${current})` : '-');
    } else {
      const token = key === '×' ? '*' : key === '÷' ? '/' : key === '−' ? '-' : key === 'xʸ' ? '^' : key;
      setExpression((current) => current + token);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitCalculation();
    } else if (event.key === 'Escape') {
      reset();
    }
  }

  function handleExpressionChange(value: string) {
    setExpression(value);
    setResult(null);
    setError('');
  }

  function clearHistory() {
    setHistory([]);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block"><h1>Calcrest</h1></div>
        <div className="toolbar">
          <button type="button" className={mode === 'simple' ? 'active' : ''} onClick={() => setMode('simple')}>
            Simple
          </button>
          <button type="button" className={mode === 'developer' ? 'active' : ''} onClick={() => setMode('developer')}>
            Developer
          </button>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? 'Dark' : 'Light'} mode
          </button>
        </div>
      </header>

      <section className="calculator-panel">
        <form onSubmit={submitCalculation} className="expression-form">
          <Display
            expression={expression}
            result={result}
            loading={loading}
            onExpressionChange={handleExpressionChange}
            onKeyDown={handleKeyDown}
          />
          {error && <p className="error-message" role="alert">{error}</p>}
          <Keypad onPressKey={handlePressKey} />
          {mode === 'developer' && (
            <div className="form-actions">
              <button type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send POST'}</button>
              <button type="button" onClick={reset}>Reset</button>
            </div>
          )}
        </form>

        {mode === 'developer' && (
          <aside className="developer-panel" aria-label="Request inspector and history">
            <RequestInspector lastRequest={lastRequest} expression={expression} />
            <HistoryList items={history} variant="developer" onClear={clearHistory} />
          </aside>
        )}
      </section>

      {mode === 'simple' && (
        <aside className="history-panel" aria-label="Calculation history">
          <HistoryList items={history} variant="simple" onClear={clearHistory} />
        </aside>
      )}
    </main>
  );
}
