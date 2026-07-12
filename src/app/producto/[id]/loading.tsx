export default function Loading() {
  return (
    <div className="min-h-[60vh] bg-crema/30 px-6 md:px-14 pt-14 md:pt-20 pb-14">
      <div className="h-4 w-40 bg-verde-noche/10 rounded animate-pulse mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl">
        <div className="aspect-square bg-crema animate-pulse rounded-lg" />
        <div className="space-y-4 py-2">
          <div className="h-4 w-28 bg-verde-noche/10 rounded animate-pulse" />
          <div className="h-10 w-64 bg-verde-noche/10 rounded animate-pulse" />
          <div className="h-6 w-24 bg-verde/20 rounded animate-pulse" />
          <div className="space-y-2 mt-4">
            <div className="h-4 w-full bg-verde-noche/10 rounded animate-pulse" />
            <div className="h-4 w-full bg-verde-noche/10 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-verde-noche/10 rounded animate-pulse" />
          </div>
          <div className="flex gap-4 mt-6">
            <div className="h-12 w-28 bg-verde-noche/10 rounded animate-pulse" />
            <div className="h-12 w-48 bg-verde/20 rounded animate-pulse" />
          </div>
          <div className="h-4 w-36 bg-verde-noche/10 rounded animate-pulse mt-4" />
        </div>
      </div>
    </div>
  );
}
