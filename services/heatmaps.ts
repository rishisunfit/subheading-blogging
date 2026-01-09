import { supabase } from "@/lib/supabase";

export interface ScrollHeatmapData {
  scroll_bucket: string;
  count: number;
}

export interface ClickHeatmapData {
  x_percent: number;
  y_percent: number;
  content_x: number | null;
  content_y: number | null;
  scroll_y: number;
  content_container_selector: string;
  is_dead_click: boolean;
}

export interface AttentionHeatmapData {
  section_id: string;
  avg_time_visible_ms: number;
  view_count: number;
  unique_sessions: number;
}

export interface CTAHeatmapData {
  cta_id: string;
  seen_count: number;
  clicked_count: number;
  conversion_rate: number;
}

export interface RageClickHeatmapData {
  x_percent: number;
  y_percent: number;
  click_count: number;
  count: number;
  totalClicks?: number; // For aggregated data
}

export const heatmapsApi = {
  async getScrollData(postId: string): Promise<ScrollHeatmapData[]> {
    const { data, error } = await supabase
      .from("post_heatmap_scroll")
      .select("scroll_bucket")
      .eq("post_id", postId);

    if (error) throw error;

    const buckets: Record<string, number> = {
      "0-25": 0,
      "25-50": 0,
      "50-75": 0,
      "75-100": 0,
    };

    data?.forEach((item) => {
      buckets[item.scroll_bucket] = (buckets[item.scroll_bucket] || 0) + 1;
    });

    return Object.entries(buckets).map(([scroll_bucket, count]) => ({
      scroll_bucket,
      count,
    }));
  },

  async getClickData(
    postId: string,
    limit = 1000
  ): Promise<ClickHeatmapData[]> {
    const { data, error } = await supabase
      .from("post_heatmap_clicks")
      .select(
        "x_percent, y_percent, content_x, content_y, scroll_y, content_container_selector, is_dead_click"
      )
      .eq("post_id", postId)
      .limit(limit);

    if (error) throw error;

    return (data || []).map((item) => ({
      x_percent: item.x_percent,
      y_percent: item.y_percent,
      content_x: item.content_x,
      content_y: item.content_y,
      scroll_y: item.scroll_y,
      content_container_selector: item.content_container_selector,
      is_dead_click: item.is_dead_click,
    }));
  },

  async getAttentionData(postId: string): Promise<AttentionHeatmapData[]> {
    const { data, error } = await supabase
      .from("post_heatmap_attention")
      .select("section_id, time_visible_ms, view_count, session_id")
      .eq("post_id", postId);

    if (error) throw error;

    const sections: Record<
      string,
      { totalTime: number; totalViews: number; sessions: Set<string> }
    > = {};

    data?.forEach((item) => {
      if (!sections[item.section_id]) {
        sections[item.section_id] = {
          totalTime: 0,
          totalViews: 0,
          sessions: new Set(),
        };
      }
      sections[item.section_id].totalTime += item.time_visible_ms;
      sections[item.section_id].totalViews += item.view_count;
      sections[item.section_id].sessions.add(item.session_id);
    });

    return Object.entries(sections).map(([section_id, stats]) => ({
      section_id,
      avg_time_visible_ms: Math.round(stats.totalTime / stats.sessions.size),
      view_count: stats.totalViews,
      unique_sessions: stats.sessions.size,
    }));
  },

  async getCTAData(postId: string): Promise<CTAHeatmapData[]> {
    const { data, error } = await supabase
      .from("post_heatmap_cta")
      .select("cta_id, was_seen, was_clicked")
      .eq("post_id", postId);

    if (error) throw error;

    const ctas: Record<string, { seen: number; clicked: number }> = {};

    data?.forEach((item) => {
      if (!ctas[item.cta_id]) {
        ctas[item.cta_id] = { seen: 0, clicked: 0 };
      }
      if (item.was_seen) ctas[item.cta_id].seen++;
      if (item.was_clicked) ctas[item.cta_id].clicked++;
    });

    return Object.entries(ctas).map(([cta_id, stats]) => ({
      cta_id,
      seen_count: stats.seen,
      clicked_count: stats.clicked,
      conversion_rate: stats.seen > 0 ? (stats.clicked / stats.seen) * 100 : 0,
    }));
  },

  async getRageClickData(postId: string): Promise<RageClickHeatmapData[]> {
    const { data, error } = await supabase
      .from("post_heatmap_rage_clicks")
      .select("x_percent, y_percent, click_count")
      .eq("post_id", postId)
      .limit(100);

    if (error) throw error;

    const locations: Record<
      string,
      { x: number; y: number; count: number; totalClicks: number }
    > = {};

    data?.forEach((item) => {
      const key = `${Math.floor(item.x_percent / 5)}-${Math.floor(
        item.y_percent / 5
      )}`;
      if (!locations[key]) {
        locations[key] = {
          x: Math.floor(item.x_percent / 5) * 5,
          y: Math.floor(item.y_percent / 5) * 5,
          count: 0,
          totalClicks: 0,
        };
      }
      locations[key].count++;
      locations[key].totalClicks += item.click_count;
    });

    return Object.values(locations).map((loc) => ({
      x_percent: loc.x,
      y_percent: loc.y,
      click_count: loc.totalClicks,
      count: loc.count,
      totalClicks: loc.totalClicks,
    }));
  },
};
