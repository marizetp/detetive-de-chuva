/** Marca: lupa com uma gota de chuva. Decorativa; o nome aparece sempre ao lado. */
export default function BrandMark({ className = 'size-8' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="13.5" cy="13.5" r="10" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M21 21l7.5 7.5" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path
        d="M13.5 7.2c-2.6 3.3-4.3 5.7-4.3 7.6a4.3 4.3 0 0 0 8.6 0c0-1.9-1.7-4.3-4.3-7.6z"
        fill="var(--color-accent)"
      />
    </svg>
  );
}
