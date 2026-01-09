/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { heatmapsApi } from "@/services/heatmaps";
import type {
  ScrollHeatmapData,
  ClickHeatmapData,
  AttentionHeatmapData,
  CTAHeatmapData,
  RageClickHeatmapData,
} from "@/services/heatmaps";

interface HeatmapVisualizationProps {
  postId: string;
  type: "scroll" | "clicks" | "attention" | "cta" | "rage-clicks";
}

export function HeatmapVisualization({
  postId,
  type,
}: HeatmapVisualizationProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHeatmapData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, type]);

  const loadHeatmapData = async () => {
    try {
      setLoading(true);
      setError(null);

      switch (type) {
        case "scroll":
          await loadScrollData();
          break;
        case "clicks":
          await loadClickData();
          break;
        case "attention":
          await loadAttentionData();
          break;
        case "cta":
          await loadCTAData();
          break;
        case "rage-clicks":
          await loadRageClickData();
          break;
      }
    } catch (err) {
      console.error("Error loading heatmap data:", err);
      setError("Failed to load heatmap data");
    } finally {
      setLoading(false);
    }
  };

  const loadScrollData = async () => {
    const data = await heatmapsApi.getScrollData(postId);
    setData(data);
  };

  const loadClickData = async () => {
    const data = await heatmapsApi.getClickData(postId);
    setData(data);
  };

  const loadAttentionData = async () => {
    const data = await heatmapsApi.getAttentionData(postId);
    setData(data);
  };

  const loadCTAData = async () => {
    const data = await heatmapsApi.getCTAData(postId);
    setData(data);
  };

  const loadRageClickData = async () => {
    const data = await heatmapsApi.getRageClickData(postId);
    setData(data);
  };

  if (loading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 rounded-lg bg-red-50">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <p className="text-gray-600">No heatmap data available yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg">
      {type === "scroll" && (
        <ScrollVisualization data={data as ScrollHeatmapData[]} />
      )}
      {type === "clicks" && (
        <ClickVisualization data={data as ClickHeatmapData[]} />
      )}
      {type === "attention" && (
        <AttentionVisualization data={data as AttentionHeatmapData[]} />
      )}
      {type === "cta" && <CTAVisualization data={data as CTAHeatmapData[]} />}
      {type === "rage-clicks" && (
        <RageClickVisualization data={data as RageClickHeatmapData[]} />
      )}
    </div>
  );
}

function ScrollVisualization({ data }: { data: ScrollHeatmapData[] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(...data.map((item) => item.count), 1);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Scroll Depth Heatmap</h3>
      <div className="space-y-2">
        {data.map((item) => {
          const percentage = total > 0 ? (item.count / total) * 100 : 0;
          const barWidth = (item.count / maxCount) * 100;
          return (
            <div key={item.scroll_bucket} className="flex items-center gap-4">
              <div className="w-20 text-sm font-medium">
                {item.scroll_bucket}%
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all"
                  style={{ width: `${barWidth}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700">
                  {item.count} sessions ({percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClickVisualization({ data }: { data: ClickHeatmapData[] }) {
  const deadClicks = data.filter((item) => item.is_dead_click).length;
  const totalClicks = data.length;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Click Heatmap</h3>
      <div className="mb-4 text-sm text-gray-600">
        Total clicks: {totalClicks} | Dead clicks: {deadClicks} (
        {totalClicks > 0 ? ((deadClicks / totalClicks) * 100).toFixed(1) : 0}%)
      </div>
      <div
        className="relative border-2 border-gray-300 rounded-lg"
        style={{ aspectRatio: "16/9", minHeight: "300px" }}
      >
        {data.slice(0, 500).map((item, index) => (
          <div
            key={index}
            className={`absolute w-3 h-3 rounded-full ${
              item.is_dead_click
                ? "bg-red-500 opacity-60"
                : "bg-blue-500 opacity-40"
            }`}
            style={{
              left: `${item.x_percent}%`,
              top: `${item.y_percent}%`,
              transform: "translate(-50%, -50%)",
            }}
            title={item.is_dead_click ? "Dead click" : "Click"}
          />
        ))}
      </div>
    </div>
  );
}

function AttentionVisualization({ data }: { data: AttentionHeatmapData[] }) {
  const maxTime = Math.max(...data.map((item) => item.avg_time_visible_ms), 1);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Attention by Section</h3>
      <div className="space-y-3">
        {data
          .sort((a, b) => b.avg_time_visible_ms - a.avg_time_visible_ms)
          .map((item) => {
            const barWidth = (item.avg_time_visible_ms / maxTime) * 100;
            return (
              <div key={item.section_id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium truncate">
                    {item.section_id}
                  </div>
                  <div className="text-xs text-gray-600">
                    {Math.round(item.avg_time_visible_ms / 1000)}s avg
                  </div>
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {item.unique_sessions} sessions, {item.view_count} views
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function CTAVisualization({ data }: { data: CTAHeatmapData[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">CTA Interaction Heatmap</h3>
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.cta_id} className="border rounded-lg p-4">
            <div className="font-medium mb-2">{item.cta_id}</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Seen:</span>
                <span className="font-semibold">{item.seen_count}</span>
              </div>
              <div className="flex justify-between">
                <span>Clicked:</span>
                <span className="font-semibold">{item.clicked_count}</span>
              </div>
              <div className="flex justify-between">
                <span>Conversion Rate:</span>
                <span className="font-semibold text-green-600">
                  {item.conversion_rate.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2">
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${item.conversion_rate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RageClickVisualization({ data }: { data: RageClickHeatmapData[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Rage Click Indicators</h3>
      <div className="mb-4 text-sm text-gray-600">
        {data.length} rage click location{data.length !== 1 ? "s" : ""} detected
      </div>
      <div
        className="relative border-2 border-gray-300 rounded-lg"
        style={{ aspectRatio: "16/9", minHeight: "300px" }}
      >
        {data.map((item, index) => {
          const intensity = Math.min(item.count / 10, 1); // Normalize intensity
          return (
            <div
              key={index}
              className="absolute rounded-full bg-red-500 opacity-60"
              style={{
                left: `${item.x_percent}%`,
                top: `${item.y_percent}%`,
                width: `${20 + intensity * 30}px`,
                height: `${20 + intensity * 30}px`,
                transform: "translate(-50%, -50%)",
              }}
              title={`${item.count} rage click events, ${
                item.totalClicks || item.click_count
              } total clicks`}
            />
          );
        })}
      </div>
    </div>
  );
}
