import { Shimmer, ShimmerText } from "./Shimmer";

export function EditorShimmer() {
  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Top Bar Shimmer - matches Editor top bar */}
      <div className="border-b border-gray-200 bg-white flex-shrink-0">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Back button shimmer */}
              <Shimmer className="w-20 h-10 rounded-lg flex-shrink-0" />
              {/* Title input shimmer - large text input */}
              <ShimmerText width="w-64" height="h-8" className="rounded" />
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Preview button shimmer */}
              <Shimmer className="w-24 h-10 rounded-lg" />
              {/* Save button shimmer */}
              <Shimmer className="w-20 h-10 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar Shimmer - matches EditorToolbar structure */}
      <div className="border-b border-gray-200 bg-white flex-shrink-0">
        <div className="px-6 py-2">
          <div className="flex items-center gap-0.5">
            {/* Undo/Redo */}
            <Shimmer className="w-8 h-8 rounded" />
            <Shimmer className="w-8 h-8 rounded" />
            <div className="w-px h-6 bg-gray-300 mx-0.5" />
            {/* Headings */}
            <Shimmer className="w-8 h-8 rounded" />
            <Shimmer className="w-8 h-8 rounded" />
            <Shimmer className="w-8 h-8 rounded" />
            <div className="w-px h-6 bg-gray-300 mx-0.5" />
            {/* Font Size */}
            <Shimmer className="w-16 h-8 rounded" />
            <div className="w-px h-6 bg-gray-300 mx-0.5" />
            {/* Text formatting */}
            <Shimmer className="w-8 h-8 rounded" />
            <Shimmer className="w-8 h-8 rounded" />
            <Shimmer className="w-8 h-8 rounded" />
            <Shimmer className="w-8 h-8 rounded" />
            <div className="w-px h-6 bg-gray-300 mx-0.5" />
            {/* Lists */}
            <Shimmer className="w-8 h-8 rounded" />
            <Shimmer className="w-8 h-8 rounded" />
            <Shimmer className="w-8 h-8 rounded" />
            <div className="w-px h-6 bg-gray-300 mx-0.5" />
            {/* Alignment */}
            <Shimmer className="w-8 h-8 rounded" />
            <Shimmer className="w-8 h-8 rounded" />
            <Shimmer className="w-8 h-8 rounded" />
            <Shimmer className="w-8 h-8 rounded" />
            <div className="w-px h-6 bg-gray-300 mx-0.5" />
            {/* Colors */}
            <Shimmer className="w-8 h-8 rounded" />
            <Shimmer className="w-8 h-8 rounded" />
            <div className="w-px h-6 bg-gray-300 mx-0.5" />
            {/* Line spacing */}
            <Shimmer className="w-8 h-8 rounded" />
            <div className="w-px h-6 bg-gray-300 mx-0.5" />
            {/* Other tools */}
            <Shimmer className="w-8 h-8 rounded" />
            <Shimmer className="w-8 h-8 rounded" />
            <Shimmer className="w-8 h-8 rounded" />
            <Shimmer className="w-8 h-8 rounded" />
            <Shimmer className="w-8 h-8 rounded" />
          </div>
        </div>
      </div>

      {/* Editor Content Shimmer - matches Editor content area */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto bg-white py-12 pb-32">
          <div className="px-4 space-y-4">
            {/* Simulate editor content lines */}
            <ShimmerText width="w-full" height="h-6" />
            <ShimmerText width="w-full" height="h-6" />
            <ShimmerText width="w-5/6" height="h-6" />
            <div className="py-2" />
            <ShimmerText width="w-full" height="h-6" />
            <ShimmerText width="w-full" height="h-6" />
            <ShimmerText width="w-4/5" height="h-6" />
            <div className="py-2" />
            <ShimmerText width="w-full" height="h-6" />
            <ShimmerText width="w-full" height="h-6" />
            <ShimmerText width="w-3/4" height="h-6" />
            <div className="py-2" />
            <ShimmerText width="w-full" height="h-6" />
            <ShimmerText width="w-5/6" height="h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
