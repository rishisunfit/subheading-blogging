import { Shimmer, ShimmerText } from "./Shimmer";

export function DashboardShimmer() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Shimmer */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex-1">
            <ShimmerText width="w-48" height="h-10" className="mb-2" />
            <ShimmerText width="w-64" height="h-4" />
          </div>
          <Shimmer className="w-32 h-12 rounded-lg" />
        </div>

        {/* Stats Shimmer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
            >
              <ShimmerText width="w-16" height="h-8" className="mb-2" />
              <ShimmerText width="w-24" height="h-4" />
            </div>
          ))}
        </div>

        {/* Posts List Shimmer */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <ShimmerText width="w-48" height="h-7" />
                    <Shimmer className="w-20 h-6 rounded-full" />
                  </div>
                  <div className="flex items-center gap-4 mb-3">
                    <ShimmerText width="w-24" height="h-4" />
                    <ShimmerText width="w-20" height="h-4" />
                  </div>
                  <ShimmerText width="w-full" height="h-4" className="mb-1" />
                  <ShimmerText width="w-3/4" height="h-4" />
                </div>
                <div className="flex gap-2 ml-4">
                  <Shimmer className="w-10 h-10 rounded-lg" />
                  <Shimmer className="w-10 h-10 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
