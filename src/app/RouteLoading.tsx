/** Shown while a lazy route chunk loads. Empty on purpose: a skeleton would only flash. */
export function RouteLoading() {
  return <div className="min-h-screen" aria-busy="true" />;
}
