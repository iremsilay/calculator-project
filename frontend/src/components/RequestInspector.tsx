import { memo, useEffect, useRef, useState } from 'react';
import type { HistoryItem } from './types';

type RequestInspectorProps = {
  lastRequest: HistoryItem | null;
  expression: string;
};

function RequestInspector({ lastRequest, expression }: RequestInspectorProps) {
  const requestPreview = lastRequest?.request ?? { expression };
  const [copied, setCopied] = useState(false);
  const copyFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const responseStatusLabel = !lastRequest
    ? ''
    : lastRequest.status === 0
      ? 'Network Error'
      : lastRequest.status === 200
        ? '200 OK'
        : lastRequest.status === 400
          ? '400 Bad Request'
          : `${lastRequest.status} Error`;

  const responseFailed = Boolean(lastRequest && lastRequest.status !== 200);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimer.current) {
        clearTimeout(copyFeedbackTimer.current);
      }
    };
  }, []);

  async function copyAsCurl() {
    const expressionToCopy = expression.trim() || lastRequest?.expression || '';
    const jsonPayload = JSON.stringify({ expression: expressionToCopy });
    const shellSafePayload = jsonPayload.replace(/'/g, "'\\''");
    const command =
      `curl -X POST http://localhost:8080/calculate ` +
      `-H "Content-Type: application/json" -d '${shellSafePayload}'`;

    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);

      if (copyFeedbackTimer.current) {
        clearTimeout(copyFeedbackTimer.current);
      }

      copyFeedbackTimer.current = setTimeout(() => {
        setCopied(false);
        copyFeedbackTimer.current = null;
      }, 2000);
    } catch {
      // Pano erişimi engellenirse arayüz çalışmaya devam eder.
      setCopied(false);
    }
  }

  return (
    <>
      <div className="inspector-card">
        <div className="inspector-heading">
          <div>
            <span className="section-kicker">LIVE INSPECTOR</span>
            <h2>Request</h2>
          </div>

          <div className="inspector-heading-actions">
            <span className="request-method">POST</span>
            <button
              className="curl-copy-button"
              type="button"
              onClick={copyAsCurl}
            >
              {copied ? 'Copied!' : 'Copy as cURL'}
            </button>
          </div>
        </div>

        <div className="code-route">
          <span>POST</span>
          <code>/calculate</code>
          <span className="code-muted">application/json</span>
        </div>

        <pre className="code-block">
          <code>{JSON.stringify(requestPreview, null, 2)}</code>
        </pre>
      </div>

      <div className="inspector-card">
        <div className="inspector-heading">
          <div>
            <span className="section-kicker">SERVER RESPONSE</span>
            <h2>Response</h2>
          </div>
        </div>

        <div className="empty-response" hidden={Boolean(lastRequest)}>
          Submit an expression to inspect the response payload.
        </div>

        {lastRequest && (
          <>
            <div
              className={`response-meta ${responseFailed ? 'has-error' : ''}`}
              aria-label="HTTP response metadata"
            >
              <div className="response-meta-item">
                <span>Status</span>
                <strong
                  className={`response-status ${
                    responseFailed ? 'failure' : 'success'
                  }`}
                >
                  {responseStatusLabel}
                </strong>
              </div>

              <div className="response-meta-item">
                <span>Content-Type</span>
                <strong>application/json</strong>
              </div>

              <div className="response-meta-item">
                <span>Method</span>
                <strong>POST</strong>
              </div>

              <div className="response-meta-item">
                <span>Round trip</span>
                <strong>{lastRequest.duration.toFixed(1)} ms</strong>
              </div>
            </div>

            <pre
              className={`code-block response-code ${
                responseFailed ? 'failure' : ''
              }`}
            >
              <code>{JSON.stringify(lastRequest.response, null, 2)}</code>
            </pre>
          </>
        )}
      </div>
    </>
  );
}

export default memo(RequestInspector);