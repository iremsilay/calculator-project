import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import { ApiError, calculate, checkHealth } from './api';

type Mode = 'simple' | 'developer';
type Theme = 'light' | 'dark';
type HistoryItem = {
  id: number;
  expression: string;
  result: string;
  status: number;
  duration: number;
  request: { expression: string };
  response: unknown;
};

export default function App() {
  const [mode, setMode] = useState<Mode>('simple');
  const [theme, setTheme] = useState<Theme>(() =>
    localStorage.getItem('calcrest-theme') === 'dark' ? 'dark' : 'light',
  );
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lastRequest, setLastRequest] = useState<HistoryItem | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('calcrest-theme', theme);
  }, [theme]);

  useEffect(() => {
    const controller = new AbortController();
    void checkHealth(controller.signal).then(setApiOnline);
    return () => controller.abort();
  }, []);

  async function submitCalculation(event?: FormEvent) {
    event?.preventDefault();
    setError('');
    setResult(null);

    const value = expression.trim();
    if (!value) {
      setError('Enter a mathematical expression first.');
      return;
    }

    const payload = { expression: value };
    const started = performance.now();
    setLoading(true);
    try {
      const data = await calculate(payload);
      const duration = performance.now() - started;
      const item: HistoryItem = {
        id: Date.now(),
        expression: value,
        result: String(data.result),
        status: 200,
        duration,
        request: payload,
        response: data,
      };
      setResult(data.result);
      setHistory((items) => [item, ...items].slice(0, 8));
      setLastRequest(item);
      setApiOnline(true);
    } catch (caught) {
      const duration = performance.now() - started;
      const message = caught instanceof Error ? caught.message : 'Could not reach the calculator API.';
      const item: HistoryItem = {
        id: Date.now(),
        expression: value,
        result: 'Error',
        status: caught instanceof ApiError ? caught.status : 0,
        duration,
        request: payload,
        response: { error: message },
      };
      setError(message);
      setHistory((items) => [item, ...items].slice(0, 8));
      setLastRequest(item);
      setApiOnline(caught instanceof ApiError);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setExpression('');
    setResult(null);
    setError('');
    setLastRequest(null);
  }

  function pressKey(key: string) {
    setError('');
    setResult(null);
    if (key === 'AC') {
      setExpression('');
      return;
    }
    if (key === 'CE') {
      setExpression((current) => current.slice(0, -1));
      return;
    }
    if (key === '√') {
      setExpression((current) => current.trim() ? `sqrt(${current})` : 'sqrt(');
      return;
    }
    if (key === '±') {
      setExpression((current) => current.startsWith('-(') && current.endsWith(')')
        ? current.slice(2, -1)
        : current ? `-(${current})` : '-');
      return;
    }
    const token = key === '×' ? '*' : key === '÷' ? '/' : key === '−' ? '-' : key === 'xʸ' ? '^' : key;
    setExpression((current) => current + token);
  }

  function handleExpressionKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void submitCalculation();
    } else if (event.key === 'Escape') {
      reset();
    }
  }

  const requestPreview = lastRequest?.request ?? { expression };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="CalcREST home">
          <span className="brand-mark" aria-hidden="true">∑</span>
          <span>calc<span className="brand-accent">rest</span></span>
        </a>
        <div className="topbar-actions">
          <div className={`service-state ${apiOnline === false ? 'offline' : ''}`} aria-live="polite">
            <span className="status-dot" />
            <span>{apiOnline === null ? 'Checking API' : apiOnline ? 'API connected' : 'API unavailable'}</span>
          </div>
          <div className="mode-switch" role="group" aria-label="Application mode">
            <button className={mode === 'simple' ? 'selected' : ''} onClick={() => setMode('simple')} type="button">Simple</button>
            <button className={mode === 'developer' ? 'selected' : ''} onClick={() => setMode('developer')} type="button">Developer</button>
          </div>
          <button
            className="theme-button"
            type="button"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
          >
            <span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
            <span className="theme-label">{theme === 'light' ? 'Dark' : 'Light'}</span>
          </button>
        </div>
      </header>

      <main id="top" className={`main-content ${mode === 'developer' ? 'developer-view' : ''}`}>
        {mode === 'developer' && <section className="intro">
          <div className="eyebrow"><span className="eyebrow-line" /> CALCREST-80 · POCKET MATH</div>
          <h1>See what happens behind the answer.</h1>
          <p>Inspect the expression sent to your Go API and the response it returns.</p>
        </section>}

        <section className="workspace" aria-label="Calculator workspace">
          <div className="calculator-card">
            <div className="card-heading">
              <h2>{mode === 'simple' ? 'Calculator' : 'Expression workbench'}</h2>
              {mode === 'developer' && <span className="endpoint-chip"><span className="method">POST</span> /calculate</span>}
            </div>

            <form onSubmit={submitCalculation}>
              <div className="expression-field">
                <label className="visually-hidden" htmlFor="math-expression">Mathematical expression</label>
                <textarea
                  id="math-expression"
                  value={expression}
                  onChange={(event) => {
                    setExpression(event.target.value);
                    setResult(null);
                    setError('');
                  }}
                  onKeyDown={handleExpressionKeyDown}
                  placeholder="0"
                  rows={2}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                />
                <output className="screen-result" aria-label="Calculation result" aria-live="polite">{loading ? '…' : result ?? ''}</output>
              </div>

              <div className="keypad" role="group" aria-label="Calculator keypad">
                {['AC', 'CE', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '√', '0', '.', 'xʸ', '±', '(', ')', '='].map((key) => (
                  <button
                    className={`key ${['AC', 'CE'].includes(key) ? 'key-clear' : ['÷', '×', '−', '+', 'xʸ', '%', '√'].includes(key) ? 'key-operator' : key === '=' ? 'key-equals' : ''}`}
                    type={key === '=' ? 'submit' : 'button'}
                    key={key}
                    aria-label={key === '−' ? 'Minus' : key === '×' ? 'Multiply' : key === '÷' ? 'Divide' : key === 'xʸ' ? 'Exponent' : key === '√' ? 'Square root' : key}
                    onClick={() => key !== '=' && pressKey(key)}
                  >{key}</button>
                ))}
              </div>

              {error && <div className="error-message" role="alert"><span aria-hidden="true">!</span>{error}</div>}

              {mode === 'developer' && <div className="form-actions">
                <button className="calculate-button" type="submit" disabled={loading}>
                  <span aria-hidden="true">{loading ? '◌' : '↗'}</span>
                  {loading ? 'Sending…' : 'Send POST'}
                </button>
                <button className="reset-button" type="button" onClick={reset}>Reset</button>
              </div>}
            </form>
          </div>

          {/* ■ SIMPLE MODE COPY: edit the compact usage tips and history labels here. */}
          {mode === 'simple' && <aside className="simple-sidebar" aria-label="Calculator help and history">
            <section className="side-card how-to-card">
              <h2>How to use</h2>
              <ul>
                <li>Type or tap the keys.</li>
                <li><code>√</code> after a value · <code>xʸ</code> for powers</li>
                <li><code>%</code> divides the value by 100.</li>
                <li><kbd>Enter</kbd> calculates · <kbd>Esc</kbd> clears.</li>
              </ul>
            </section>
            <section className="side-card history-card" aria-label="Calculation history">
              <div className="side-card-heading"><h2>History</h2><button className="text-button" type="button" onClick={() => setHistory([])}>Clear</button></div>
              {history.length === 0 ? <p className="empty-history">—</p> : <ul className="history-list">
                {history.slice(0, 6).map((item) => <li key={item.id}>
                  <span className={`history-dot ${item.status === 200 ? '' : 'failure'}`} />
                  <span className="history-expression">{item.expression}</span>
                  <strong className={item.status === 200 ? 'history-result' : 'history-error'}>{item.result}</strong>
                </li>)}
              </ul>}
            </section>
          </aside>}

          {mode === 'developer' && (
            <aside className="inspector" aria-label="HTTP request inspector">
              <div className="inspector-card">
                <div className="inspector-heading"><div><span className="section-kicker">LIVE INSPECTOR</span><h2>Request</h2></div><span className="request-method">POST</span></div>
                <div className="code-route"><span>POST</span><code>/calculate</code><span className="code-muted">application/json</span></div>
                <pre className="code-block"><code>{JSON.stringify(requestPreview, null, 2)}</code></pre>
              </div>

              <div className="inspector-card">
                <div className="inspector-heading"><div><span className="section-kicker">SERVER RESPONSE</span><h2>Response</h2></div>
                  {lastRequest && <span className={`response-status ${lastRequest.status === 200 ? 'success' : 'failure'}`}>{lastRequest.status === 0 ? 'Network error' : `${lastRequest.status} ${lastRequest.status === 200 ? 'OK' : 'Error'}`}</span>}
                </div>
                <div className="empty-response" hidden={Boolean(lastRequest)}>
                  Submit an expression to inspect the response payload.
                </div>
                {lastRequest && <pre className="code-block response-code"><code>{JSON.stringify(lastRequest.response, null, 2)}</code></pre>}
                {lastRequest && <div className="response-foot"><span>Round trip</span><strong>{lastRequest.duration.toFixed(1)} ms</strong></div>}
              </div>

              <div className="inspector-card history-card">
                <div className="inspector-heading"><div><span className="section-kicker">LOCAL SESSION</span><h2>Request log</h2></div><button className="text-button" type="button" onClick={() => setHistory([])}>Clear</button></div>
                {history.length === 0 ? <p className="empty-response">Your recent requests will appear here.</p> : (
                  <ul className="history-list">
                    {history.map((item) => <li key={item.id}>
                      <span className={`history-dot ${item.status === 200 ? '' : 'failure'}`} />
                      <span className="history-expression">{item.expression}</span>
                      <strong className={item.status === 200 ? 'history-result' : 'history-error'}>{item.result}</strong>
                      <span className="history-time">{item.duration.toFixed(1)}ms</span>
                    </li>)}
                  </ul>
                )}
                <p className="log-note">Logs are stored in this page session only.</p>
              </div>
            </aside>
          )}
        </section>

      </main>

      {mode === 'developer' && <footer className="footer"><span>CALCREST <i>•</i> EXPRESSIONS WITH NATURAL PRECEDENCE</span><span><span className={`footer-dot ${apiOnline === false ? 'offline' : ''}`} /> Go backend · localhost:8080</span></footer>}
    </div>
  );
}
