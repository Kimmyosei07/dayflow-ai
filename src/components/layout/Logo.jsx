/** DAYFLOW AI mark: a flowing line with a sun-dot, drawn inline (no image files). */
export default function Logo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 16c2.5-4.5 5.5-4.5 8-1.5s5 2 6-3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="18.5" cy="6.5" r="2.2" fill="currentColor" />
    </svg>
  );
}
