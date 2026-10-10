type DeveloperPresetsProps = {
  onSelect: (expression: string) => void;
};

const scenarios = [
  { label: 'Division by Zero', expression: '10 / 0' },
  { label: 'Negative Root', expression: 'sqrt(-16)' },
  { label: 'Precedence & Brackets', expression: '5 + 4 - (8 - 9) * 3' },
  { label: 'Right Associativity', expression: '2^3^2' },
  { label: 'Percentages', expression: '200 * 15%' },
  { label: 'Overflow Guard', expression: '10^1000' },
  { label: 'Code Injection Guard', expression: '1 + 2; alert(1)' },
] as const;

export default function DeveloperPresets({ onSelect }: DeveloperPresetsProps) {
  return (
    <section
      className="inspector-card developer-presets"
      aria-labelledby="presets-heading"
    >
      <div className="inspector-heading">
        <h2 id="presets-heading" className="presets-heading">
          EVALUATION SCENARIOS / EDGE CASES
        </h2>
      </div>

      <div className="preset-grid">
        {scenarios.map(({ label, expression }) => (
          <button
            className="preset-chip"
            type="button"
            key={label}
            onClick={() => onSelect(expression)}
            aria-label={`${label}: ${expression}`}
          >
            <span>{label}</span>
            <code>{expression}</code>
          </button>
        ))}
      </div>
    </section>
  );
}