import { memo } from 'react';

const keys = [
  'AC', 'CE', '%', '÷',
  '7', '8', '9', '×',
  '4', '5', '6', '−',
  '1', '2', '3', '+',
  '√', '0', '.', 'xʸ',
  '±', '(', ')', '=',
];

const operatorKeys = ['÷', '×', '−', '+', 'xʸ', '%', '√'];

type KeypadProps = {
  onPressKey: (key: string) => void;
};

function Keypad({ onPressKey }: KeypadProps) {
  return (
    <div className="keypad" role="group" aria-label="Calculator keypad">
      {keys.map((key) => (
        <button
          className={`key ${
            ['AC', 'CE'].includes(key)
              ? 'key-clear'
              : operatorKeys.includes(key)
                ? 'key-operator'
                : key === '='
                  ? 'key-equals'
                  : ''
          }`}
          type={key === '=' ? 'submit' : 'button'}
          key={key}
          aria-label={
            key === '−' ? 'Minus'
              : key === '×' ? 'Multiply'
                : key === '÷' ? 'Divide'
                  : key === 'xʸ' ? 'Exponent'
                    : key === '√' ? 'Square root'
                      : key
          }
          onClick={() => key !== '=' && onPressKey(key)}
        >
          {key}
        </button>
      ))}
    </div>
  );
}

export default memo(Keypad);
