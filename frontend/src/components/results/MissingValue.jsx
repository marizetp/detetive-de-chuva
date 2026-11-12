/** Valor em falta: escrito por extenso, nunca como 0 nem como um símbolo ambíguo. */
export default function MissingValue({ className = '' }) {
  return <span className={`font-sans text-base text-charcoal/75 italic ${className}`}>Sem dado</span>;
}
