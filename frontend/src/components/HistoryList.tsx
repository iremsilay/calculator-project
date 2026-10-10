import { memo } from 'react';
import type { HistoryItem } from './types';

type HistoryListProps = {
  items: HistoryItem[];
  variant: 'simple' | 'developer';
  onClear: () => void;
};

function HistoryList({ items, variant, onClear }: HistoryListProps) {
  const isSimple = variant === 'simple';
  const visibleItems = isSimple ? items.slice(0, 6) : items;

  return (
    <section
      className={isSimple ? 'side-card history-card' : 'inspector-card history-card'}
      aria-label={isSimple ? 'Calculation history' : undefined}
    >
      <div className={isSimple ? 'side-card-heading' : 'inspector-heading'}>
        {isSimple ? <h2>History</h2> : <div><span className="section-kicker">LOCAL SESSION</span><h2>Request log</h2></div>}
        <button className="text-button" type="button" onClick={onClear}>Clear</button>
      </div>
      {items.length === 0 ? (
        isSimple
          ? <p className="empty-history">—</p>
          : <p className="empty-response">Your recent requests will appear here.</p>
      ) : (
        <ul className="history-list">
          {visibleItems.map((item) => (
            <li key={item.id}>
              <span className={`history-dot ${item.status === 200 ? '' : 'failure'}`} />
              <span className="history-expression">{item.expression}</span>
              <strong className={item.status === 200 ? 'history-result' : 'history-error'}>{item.result}</strong>
              {!isSimple && <span className="history-time">{item.duration.toFixed(1)}ms</span>}
            </li>
          ))}
        </ul>
      )}
      {!isSimple && <p className="log-note">Logs are stored in this page session only.</p>}
    </section>
  );
}

export default memo(HistoryList);
