export function RoutePageSkeleton() {
  return (
    <div className="container mx-auto max-w-5xl animate-pulse px-4 py-8">
      <div className="mb-8 h-8 w-48 rounded bg-muted" />
      <div className="space-y-4">
        <div className="h-32 rounded-lg bg-muted" />
        <div className="h-32 rounded-lg bg-muted" />
      </div>
    </div>
  )
}
