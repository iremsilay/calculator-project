import type { ChangeEvent, KeyboardEvent } from 'react';

type DisplayProps = {
  expression: string;
  result: number | null;
  loading: boolean;
  onExpressionChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};

export default function Display({
  expression,
  result,
  loading,
  onExpressionChange,
  onKeyDown,
}: DisplayProps) {
  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onExpressionChange(event.target.value);
  }

  return (
    <div className="expression-field">
      <label className="visually-hidden" htmlFor="math-expression">Mathematical expression</label>
      <textarea
        id="math-expression"
        value={expression}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        placeholder="0"
        rows={2}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
      />
      <output className="screen-result" aria-label="Calculation result" aria-live="polite">
        {loading ? '…' : result ?? ''}
      </output>
    </div>
  );
}
