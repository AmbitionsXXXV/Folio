export function RoutePageSkeleton() {
  return (
    <div className="container mx-auto max-w-5xl animate-pulse px-4 py-8">
      <div className="mb-8 h-8 w-48 rounded bg-surface-secondary" />
      <div className="space-y-4">
        <div className="h-32 rounded-lg bg-surface-secondary" />
        <div className="h-32 rounded-lg bg-surface-secondary" />
      </div>
    </div>
  )
}
