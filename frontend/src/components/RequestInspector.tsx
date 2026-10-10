import { memo } from 'react';
import type { HistoryItem } from './types';

type RequestInspectorProps = {
  lastRequest: HistoryItem | null;
  expression: string;
};

function RequestInspector({ lastRequest, expression }: RequestInspectorProps) {
  const requestPreview = lastRequest?.request ?? { expression };
  return (
    <>
      <div className="inspector-card">
        <div className="inspector-heading">
          <div><span className="section-kicker">LIVE INSPECTOR</span><h2>Request</h2></div>
          <span className="request-method">POST</span>
        </div>
        <div className="code-route"><span>POST</span><code>/calculate</code><span className="code-muted">application/json</span></div>
        <pre className="code-block"><code>{JSON.stringify(requestPreview, null, 2)}</code></pre>
      </div>

      <div className="inspector-card">
        <div className="inspector-heading">
          <div><span className="section-kicker">SERVER RESPONSE</span><h2>Response</h2></div>
          {lastRequest && <span className={`response-status ${lastRequest.status === 200 ? 'success' : 'failure'}`}>
            {lastRequest.status === 0 ? 'Network error' : `${lastRequest.status} ${lastRequest.status === 200 ? 'OK' : 'Error'}`}
          </span>}
        </div>
        <div className="empty-response" hidden={Boolean(lastRequest)}>
          Submit an expression to inspect the response payload.
        </div>
        {lastRequest && <pre className="code-block response-code"><code>{JSON.stringify(lastRequest.response, null, 2)}</code></pre>}
        {lastRequest && <div className="response-foot"><span>Round trip</span><strong>{lastRequest.duration.toFixed(1)} ms</strong></div>}
      </div>
    </>
  );
}

export default memo(RequestInspector);
