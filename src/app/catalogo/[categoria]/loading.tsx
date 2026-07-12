export default function Loading() {
  return (
    <div className="min-h-[60vh] bg-crema/30 px-6 md:px-14 pt-14 md:pt-20 pb-14">
      <div className="h-4 w-40 bg-verde-noche/10 rounded animate-pulse mb-6" />
      <div className="h-9 w-48 bg-verde-noche/10 rounded animate-pulse mb-3" />
      <div className="h-4 w-32 bg-verde-noche/10 rounded animate-pulse mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-md overflow-hidden shadow-sm">
            <div className="h-40 bg-crema animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-3 w-20 bg-verde-noche/10 rounded animate-pulse" />
              <div className="h-4 w-32 bg-verde-noche/10 rounded animate-pulse" />
              <div className="h-4 w-16 bg-verde-oscuro/10 rounded animate-pulse" />
              <div className="h-8 w-full bg-verde-oscuro/10 rounded animate-pulse mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
