import { SOURCE_META } from './reportStructure.js';

/** "Fonte: Serviço de recomendação · /api/v1/advisory" */
export default function SourceLabel({ source }) {
  const meta = SOURCE_META[source];
  if (!meta) return null;
  return (
    <p className="text-xs leading-relaxed text-charcoal/75">
      Fonte: {meta.service} · <code className="font-mono">{meta.endpoint}</code>
    </p>
  );
}
