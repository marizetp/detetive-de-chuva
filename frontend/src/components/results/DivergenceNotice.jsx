import { formatDivergenceValue } from '../../utils/divergences.js';
import InlineNotice from '../ui/InlineNotice.jsx';

/**
 * Mostra as diferenças entre a recomendação e a avaliação técnica, lado a lado.
 * A plataforma não escolhe entre os valores nem os combina.
 * @param {{ comparison: ReturnType<typeof import('../../utils/divergences.js').compareConsultationResults> }} props
 */
export default function DivergenceNotice({ comparison }) {
  const { divergences, notComparable, hasDivergences } = comparison;
  if (!hasDivergences && notComparable.length === 0) return null;

  return (
    <InlineNotice
      tone="info"
      title={
        hasDivergences
          ? 'A recomendação e a avaliação técnica não coincidem'
          : 'Não foi possível comparar todos os valores'
      }
    >
      {hasDivergences ? (
        <>
          <p>
            Os dois serviços devolveram valores diferentes. Mostramos ambos tal como foram enviados;
            a plataforma não escolhe entre eles.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[20rem] text-left text-sm">
              <caption className="sr-only">Valores divergentes entre as duas fontes</caption>
              <thead>
                <tr className="border-b border-line text-ink-muted">
                  <th scope="col" className="py-1.5 pr-3 font-semibold">Campo</th>
                  <th scope="col" className="py-1.5 pr-3 font-semibold">Recomendação</th>
                  <th scope="col" className="py-1.5 font-semibold">Avaliação técnica</th>
                </tr>
              </thead>
              <tbody>
                {divergences.map((divergence) => (
                  <tr key={divergence.field} className="border-b border-line last:border-0">
                    <th scope="row" className="py-1.5 pr-3 font-normal">{divergence.label}</th>
                    <td className="py-1.5 pr-3 tabular-nums">
                      {formatDivergenceValue(divergence.field, divergence.advisoryValue)}
                    </td>
                    <td className="py-1.5 tabular-nums">
                      {formatDivergenceValue(divergence.field, divergence.evaluateValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {notComparable.length > 0 ? (
        <p className={hasDivergences ? 'mt-3' : ''}>
          Sem valor numa das fontes, por isso não comparados:{' '}
          {notComparable.map((item) => item.label).join(', ')}.
        </p>
      ) : null}
    </InlineNotice>
  );
}
