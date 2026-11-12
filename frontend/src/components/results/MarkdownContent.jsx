import Markdown from 'react-markdown';

// Renderização segura de `recomendacao_extensao`:
// - HTML no texto é ignorado (`skipHtml`), nunca injectado;
// - só elementos de texto são permitidos (sem imagens, tabelas ou HTML embebido);
// - ligações passam pelo filtro de URLs do react-markdown (remove `javascript:` e afins).
// O conteúdo não é reescrito: apenas convertido de Markdown para elementos HTML.

const ALLOWED_ELEMENTS = [
  'p',
  'strong',
  'em',
  'del',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'hr',
  'br',
  'blockquote',
  'code',
  'pre',
  'a',
];

/**
 * Os títulos do texto ficam abaixo do título da secção (h3), por isso usam todos <h4>;
 * o nível original só altera o tamanho.
 */
function makeHeading(depth) {
  const size = depth <= 2 ? 'text-xl' : depth === 3 ? 'text-lg' : 'text-base';
  return function MarkdownHeading({ children }) {
    return (
      <h4 className={`mt-9 mb-3 font-display ${size} leading-snug font-semibold text-forest first:mt-0`}>
        {children}
      </h4>
    );
  };
}

const COMPONENTS = {
  h1: makeHeading(1),
  h2: makeHeading(2),
  h3: makeHeading(3),
  h4: makeHeading(4),
  h5: makeHeading(5),
  h6: makeHeading(6),
  p: ({ children }) => <p className="mt-4 leading-relaxed first:mt-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-charcoal">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul className="mt-4 list-disc space-y-2.5 pl-6 marker:text-earth">{children}</ul>,
  ol: ({ children, start }) => (
    <ol start={start} className="mt-4 list-decimal space-y-2.5 pl-6 marker:font-semibold marker:text-earth">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1 leading-relaxed">{children}</li>,
  hr: () => <hr className="my-8 border-charcoal/15" />,
  blockquote: ({ children }) => (
    <blockquote className="mt-4 border-l-2 border-rain pl-4 text-charcoal/85">{children}</blockquote>
  ),
  code: ({ children }) => <code className="rounded bg-sage px-1 font-mono text-sm">{children}</code>,
  pre: ({ children }) => <pre className="mt-4 overflow-x-auto text-sm">{children}</pre>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-forest underline decoration-forest/40 underline-offset-4 hover:decoration-forest"
    >
      {children}
    </a>
  ),
};

export default function MarkdownContent({ text }) {
  return (
    <div className="text-base text-charcoal/90">
      <Markdown allowedElements={ALLOWED_ELEMENTS} unwrapDisallowed skipHtml components={COMPONENTS}>
        {text}
      </Markdown>
    </div>
  );
}
