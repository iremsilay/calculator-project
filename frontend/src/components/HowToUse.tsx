type HowToUseProps = {
  // İşlem önceliği açıklamasını yalnızca Simple modda göstermek için kullanılır.
  showPrecedence: boolean;
};

export default function HowToUse({ showPrecedence }: HowToUseProps) {
  return (
    <section className="side-card how-to-card" aria-labelledby="how-to-heading">
      <h2 id="how-to-heading">How to use?</h2>

      <ul>
        <li>Type an expression or use the keypad. Press <kbd>=</kbd> to calculate.</li>

        {/* AC tüm ifadeyi siler; CE yalnızca son karakteri siler. */}
        <li>
          <kbd>AC</kbd> clears everything; <kbd>CE</kbd> deletes the last
          character.
        </li>

        {/* xʸ tuşu ifadeye ^ ekler; örnek olarak 2 xʸ 3 işlemi 2^3, yani 8 eder. */}
        <li>
          <kbd>xʸ</kbd> raises a number to a power:{' '}
          <code>2 xʸ 3 = 8</code>.
        </li>

        {/* √ mevcut ifadeyi karekök içine alır. Yeni işlemde sayıyı yazıp ) ile kapatın. */}
        <li>
          <kbd>√</kbd> starts a square root. Enter the number, then close it
          with <kbd>)</kbd>.
        </li>

        {/* Sayının sonuna % eklemek, onu 100'e böler: 25% sonucu 0.25'tir. */}
        <li>
          <kbd>%</kbd> converts a value to a percentage:{' '}
          <code>25%</code> = 0.25.
        </li>

        {/* showPrecedence yalnızca Simple modda true gönderildiği için bu açıklama Developer'da görünmez. */}
        {showPrecedence && (
          <li>
            <strong>Order of operations:</strong> parentheses first, then
            powers, then × and ÷, then + and −. For example,{' '}
            <code>2 + 3 × 4</code> = 14. Use parentheses to change the order:{' '}
            <code>(2 + 3) × 4</code> = 20.
          </li>
        )}
      </ul>
    </section>
  );
}