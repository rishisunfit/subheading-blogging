"use client";

interface QuizProgressProps {
  current: number;
  total: number;
  primaryColor: string;
  backgroundColor: string;
}

export function QuizProgress({
  current,
  total,
  primaryColor,
}: QuizProgressProps) {
  const progress = (current / total) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium opacity-60">
          Question {current} of {total}
        </span>
        <span className="text-sm font-medium opacity-60">
          {Math.round(progress)}%
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: `${primaryColor}15` }}
      >
        <div
          className="h-full rounded-full transition-all duration-400 ease-out"
          style={{
            backgroundColor: primaryColor,
            width: `${progress}%`,
          }}
        />
      </div>
    </div>
  );
}

// Alias for backwards compatibility
export const QuizProgressSimple = QuizProgress;
