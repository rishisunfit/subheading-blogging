/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useCallback } from "react";
import { getSessionId } from "@/lib/session";

interface HeatmapTrackerProps {
  postId: string;
  enabled?: boolean;
}

interface ScrollData {
  maxScrollDepth: number;
  scrollBucket: string;
  viewportWidth: number;
  viewportHeight: number;
}

interface ClickData {
  xPercent: number;
  yPercent: number;
  contentX: number | null;
  contentY: number | null;
  scrollY: number;
  contentContainerSelector: string;
  elementTag: string | null;
  elementClass: string | null;
  elementId: string | null;
  heatmapId: string | null;
  isDeadClick: boolean;
  viewportWidth: number;
  viewportHeight: number;
}

interface AttentionData {
  sectionId: string;
  timeVisibleMs: number;
  viewCount: number;
  viewportWidth: number;
  viewportHeight: number;
}

// interface RageClickData {
//   xPercent: number;
//   yPercent: number;
//   clickCount: number;
//   timeWindowMs: number;
//   elementTag: string | null;
//   elementClass: string | null;
//   elementId: string | null;
//   heatmapId: string | null;
//   viewportWidth: number;
//   viewportHeight: number;
// }

// Throttle utility
function throttle<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let previous = 0;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func(...args);
      }, remaining);
    }
  }) as T;
}

// Debounce utility
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  }) as T;
}

export function HeatmapTracker({
  postId,
  enabled = true,
}: HeatmapTrackerProps) {
  const scrollDataRef = useRef<ScrollData | null>(null);
  const clickDataRef = useRef<ClickData[]>([]);
  const attentionDataRef = useRef<Map<string, AttentionData>>(new Map());
  const rageClickDataRef = useRef<
    Map<string, { clicks: number; firstClick: number }>
  >(new Map());
  const sectionObserversRef = useRef<Map<string, IntersectionObserver>>(
    new Map()
  );
  const ctaObserversRef = useRef<Map<string, IntersectionObserver>>(new Map());
  const sectionTimersRef = useRef<Map<string, number>>(new Map());

  // Verify we're on the correct page (posts/[id])
  const isCorrectPage = useCallback(() => {
    if (typeof window === "undefined") return false;
    const pathname = window.location.pathname;
    // Check if URL matches /posts/[id] pattern
    return /^\/posts\/[^/]+$/.test(pathname);
  }, []);

  // Get viewport dimensions
  const getViewportSize = useCallback(() => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }, []);

  // Calculate scroll depth percentage
  const calculateScrollDepth = useCallback(() => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollableHeight = documentHeight - windowHeight;

    if (scrollableHeight <= 0) return 100;

    const scrollPercent = Math.min(
      100,
      Math.round((scrollTop / scrollableHeight) * 100)
    );
    return scrollPercent;
  }, []);

  // Get scroll bucket
  const getScrollBucket = useCallback((percent: number): string => {
    if (percent < 25) return "0-25";
    if (percent < 50) return "25-50";
    if (percent < 75) return "50-75";
    return "75-100";
  }, []);

  // Track scroll depth
  const trackScroll = useCallback(() => {
    if (!enabled || !isCorrectPage()) return;

    const scrollDepth = calculateScrollDepth();
    const viewport = getViewportSize();
    const bucket = getScrollBucket(scrollDepth);

    const currentMax = scrollDataRef.current?.maxScrollDepth || 0;

    if (scrollDepth > currentMax) {
      scrollDataRef.current = {
        maxScrollDepth: scrollDepth,
        scrollBucket: bucket,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, calculateScrollDepth, getViewportSize, getScrollBucket]);

  // Send scroll data (throttled)
  const sendScrollData = useCallback(
    throttle(async () => {
      if (!scrollDataRef.current || !isCorrectPage()) return;

      const sessionId = getSessionId();
      const data = scrollDataRef.current;

      try {
        await fetch("/api/heatmap/scroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            post_id: postId,
            session_id: sessionId,
            max_scroll_depth_percent: data.maxScrollDepth,
            scroll_bucket: data.scrollBucket,
            viewport_width: data.viewportWidth,
            viewport_height: data.viewportHeight,
            page_url: window.location.href,
            user_agent: navigator.userAgent,
          }),
        });
      } catch (error) {
        console.error("Failed to send scroll data:", error);
      }
    }, 250),
    [postId, isCorrectPage]
  );

  // Track clicks
  const trackClick = useCallback(
    (event: MouseEvent) => {
      if (!enabled || !isCorrectPage()) return;

      const target = event.target as HTMLElement;
      const viewport = getViewportSize();
      const documentWidth = document.documentElement.scrollWidth;
      const documentHeight = document.documentElement.scrollHeight;

      // Calculate percentage coordinates (for backward compatibility)
      const xPercent = Number(
        ((event.clientX / documentWidth) * 100).toFixed(2)
      );
      const yPercent = Number(
        ((event.clientY / documentHeight) * 100).toFixed(2)
      );

      // Find the content container (article or .preview-content)
      const contentContainer =
        target.closest("article") ||
        document.querySelector(".preview-content") ||
        document.querySelector("article");

      let contentX: number | null = null;
      let contentY: number | null = null;
      let contentContainerSelector = "article";
      const scrollY = Math.round(window.scrollY || window.pageYOffset);

      if (contentContainer) {
        const containerRect = contentContainer.getBoundingClientRect();
        // Calculate coordinates relative to the content container's bounding box
        // These coordinates will be used to position overlays on the rendered content
        contentX = Math.round(event.clientX - containerRect.left);
        // For contentY, we need the position relative to the container's content top
        // Since the container might be scrolled, we use the viewport-relative position
        // In analytics, we'll render the container at the top, so this will align correctly
        contentY = Math.round(event.clientY - containerRect.top);

        // Determine the selector
        if (contentContainer.classList.contains("preview-content")) {
          contentContainerSelector = ".preview-content";
        } else if (contentContainer.tagName.toLowerCase() === "article") {
          contentContainerSelector = "article";
        }
      }

      // Get element info
      const elementTag = target.tagName.toLowerCase();
      const elementClass =
        target.className && typeof target.className === "string"
          ? target.className
          : null;
      const elementId = target.id || null;
      const heatmapId = target.getAttribute("data-heatmap-id") || null;

      // Check if it's a dead click (no click handler, not a link/button)
      const isDeadClick =
        !target.onclick &&
        !target.getAttribute("onclick") &&
        !target.closest("a, button, [role='button'], [onclick]") &&
        elementTag !== "a" &&
        elementTag !== "button";

      const clickData: ClickData = {
        xPercent,
        yPercent,
        contentX,
        contentY,
        scrollY,
        contentContainerSelector,
        elementTag,
        elementClass,
        elementId,
        heatmapId,
        isDeadClick,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
      };

      clickDataRef.current.push(clickData);

      // Check for rage clicks (3+ clicks in same area within 500ms)
      const key = `${Math.floor(xPercent / 5)}-${Math.floor(yPercent / 5)}`;
      const now = Date.now();
      const existing = rageClickDataRef.current.get(key);

      if (existing) {
        const timeSinceFirst = now - existing.firstClick;
        if (timeSinceFirst < 500) {
          const newCount = existing.clicks + 1;
          rageClickDataRef.current.set(key, {
            clicks: newCount,
            firstClick: existing.firstClick,
          });

          if (newCount >= 3 && isCorrectPage()) {
            // Send rage click data
            fetch("/api/heatmap/rage-click", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                post_id: postId,
                session_id: getSessionId(),
                x_percent: xPercent,
                y_percent: yPercent,
                click_count: newCount,
                time_window_ms: timeSinceFirst,
                element_tag: elementTag,
                element_class: elementClass,
                element_id: elementId,
                heatmap_id: heatmapId,
                viewport_width: viewport.width,
                viewport_height: viewport.height,
                page_url: window.location.href,
                user_agent: navigator.userAgent,
              }),
            }).catch(console.error);
          }
        } else {
          // Reset if too much time has passed
          rageClickDataRef.current.set(key, { clicks: 1, firstClick: now });
        }
      } else {
        rageClickDataRef.current.set(key, { clicks: 1, firstClick: now });
      }
    },
    [enabled, postId, getViewportSize]
  );

  // Send click data (debounced)
  const sendClickData = useCallback(
    debounce(async () => {
      if (clickDataRef.current.length === 0 || !isCorrectPage()) return;

      const sessionId = getSessionId();
      const clicks = [...clickDataRef.current];
      clickDataRef.current = [];

      try {
        await fetch("/api/heatmap/clicks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            post_id: postId,
            session_id: sessionId,
            clicks: clicks.map((click) => ({
              x_percent: click.xPercent,
              y_percent: click.yPercent,
              content_x: click.contentX,
              content_y: click.contentY,
              scroll_y: click.scrollY,
              content_container_selector: click.contentContainerSelector,
              element_tag: click.elementTag,
              element_class: click.elementClass,
              element_id: click.elementId,
              heatmap_id: click.heatmapId,
              is_dead_click: click.isDeadClick,
              viewport_width: click.viewportWidth,
              viewport_height: click.viewportHeight,
              page_url: window.location.href,
              user_agent: navigator.userAgent,
            })),
          }),
        });
      } catch (error) {
        console.error("Failed to send click data:", error);
      }
    }, 1000),
    [postId, isCorrectPage]
  );

  // Track attention by section using IntersectionObserver
  const trackSectionAttention = useCallback(() => {
    if (!enabled || typeof window === "undefined" || !isCorrectPage()) return;

    // Find all sections with data-heatmap-section attribute or use headings as sections
    const sections = document.querySelectorAll(
      "[data-heatmap-section], h1, h2, h3, h4, h5, h6"
    );

    sections.forEach((section) => {
      const sectionId =
        section.getAttribute("data-heatmap-section") ||
        section.id ||
        `section-${Array.from(sections).indexOf(section)}`;

      // Skip if already observing
      if (sectionObserversRef.current.has(sectionId)) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const timerId = window.setTimeout(() => {
                // Section has been visible for >500ms
                const viewport = getViewportSize();
                const existing = attentionDataRef.current.get(sectionId);

                if (existing) {
                  existing.timeVisibleMs += 500;
                  existing.viewCount += 1;
                } else {
                  attentionDataRef.current.set(sectionId, {
                    sectionId,
                    timeVisibleMs: 500,
                    viewCount: 1,
                    viewportWidth: viewport.width,
                    viewportHeight: viewport.height,
                  });
                }

                // Send attention data
                if (!isCorrectPage()) return;
                const data = attentionDataRef.current.get(sectionId);
                if (data) {
                  fetch("/api/heatmap/attention", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      post_id: postId,
                      session_id: getSessionId(),
                      section_id: data.sectionId,
                      time_visible_ms: data.timeVisibleMs,
                      view_count: data.viewCount,
                      viewport_width: data.viewportWidth,
                      viewport_height: data.viewportHeight,
                      page_url: window.location.href,
                      user_agent: navigator.userAgent,
                    }),
                  }).catch(console.error);
                }
              }, 500);

              sectionTimersRef.current.set(sectionId, timerId);
            } else {
              // Section left viewport
              const timerId = sectionTimersRef.current.get(sectionId);
              if (timerId) {
                clearTimeout(timerId);
                sectionTimersRef.current.delete(sectionId);
              }
            }
          });
        },
        {
          threshold: 0.5, // 50% of section must be visible
          rootMargin: "0px",
        }
      );

      observer.observe(section);
      sectionObserversRef.current.set(sectionId, observer);
    });
  }, [enabled, postId, getViewportSize]);

  // Track CTA interactions
  const trackCTAInteractions = useCallback(() => {
    if (!enabled || typeof window === "undefined" || !isCorrectPage()) return;

    // Find all CTAs with data-cta-id attribute
    const ctas = document.querySelectorAll("[data-cta-id]");

    ctas.forEach((cta) => {
      const ctaId = cta.getAttribute("data-cta-id");
      if (!ctaId) return;

      // Skip if already observing
      if (ctaObserversRef.current.has(ctaId)) return;

      const viewport = getViewportSize();

      // Track when CTA enters viewport
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && isCorrectPage()) {
              // CTA is visible
              fetch("/api/heatmap/cta", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  post_id: postId,
                  session_id: getSessionId(),
                  cta_id: ctaId,
                  was_seen: true,
                  was_clicked: false,
                  viewport_width: viewport.width,
                  viewport_height: viewport.height,
                  page_url: window.location.href,
                  user_agent: navigator.userAgent,
                }),
              }).catch(console.error);
            }
          });
        },
        {
          threshold: 0.5,
          rootMargin: "0px",
        }
      );

      observer.observe(cta);
      ctaObserversRef.current.set(ctaId, observer);

      // Track CTA clicks
      const clickHandler = () => {
        if (!isCorrectPage()) return;
        fetch("/api/heatmap/cta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            post_id: postId,
            session_id: getSessionId(),
            cta_id: ctaId,
            was_seen: true,
            was_clicked: true,
            viewport_width: viewport.width,
            viewport_height: viewport.height,
            page_url: window.location.href,
            user_agent: navigator.userAgent,
          }),
        }).catch(console.error);
      };

      cta.addEventListener("click", clickHandler);
    });
  }, [enabled, postId, getViewportSize]);

  // Setup scroll tracking
  useEffect(() => {
    if (!enabled) return;

    const throttledScroll = throttle(trackScroll, 100);
    window.addEventListener("scroll", throttledScroll, { passive: true });

    // Send scroll data on scroll end
    const scrollEndHandler = debounce(sendScrollData, 250);
    window.addEventListener("scroll", scrollEndHandler, { passive: true });

    // Send final scroll data on page unload
    const beforeUnloadHandler = () => {
      sendScrollData();
    };
    window.addEventListener("beforeunload", beforeUnloadHandler);

    return () => {
      window.removeEventListener("scroll", throttledScroll);
      window.removeEventListener("scroll", scrollEndHandler);
      window.removeEventListener("beforeunload", beforeUnloadHandler);
      sendScrollData(); // Final send
    };
  }, [enabled, trackScroll, sendScrollData]);

  // Setup click tracking
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("click", trackClick, true);
    document.addEventListener("click", sendClickData, true);

    return () => {
      document.removeEventListener("click", trackClick, true);
      document.removeEventListener("click", sendClickData, true);
      sendClickData(); // Final send
    };
  }, [enabled, trackClick, sendClickData]);

  // Setup attention tracking
  useEffect(() => {
    if (!enabled) return;

    // Wait for content to load
    const timeoutId = setTimeout(() => {
      trackSectionAttention();
    }, 1000);

    // Re-track on content changes (for dynamic content)
    const observer = new MutationObserver(() => {
      trackSectionAttention();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      // Cleanup section observers
      sectionObserversRef.current.forEach((obs) => obs.disconnect());
      sectionObserversRef.current.clear();
      sectionTimersRef.current.forEach((timer) => clearTimeout(timer));
      sectionTimersRef.current.clear();
    };
  }, [enabled, trackSectionAttention]);

  // Setup CTA tracking
  useEffect(() => {
    if (!enabled) return;

    // Wait for content to load
    const timeoutId = setTimeout(() => {
      trackCTAInteractions();
    }, 1000);

    // Re-track on content changes
    const observer = new MutationObserver(() => {
      trackCTAInteractions();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      // Cleanup CTA observers
      ctaObserversRef.current.forEach((obs) => obs.disconnect());
      ctaObserversRef.current.clear();
    };
  }, [enabled, trackCTAInteractions]);

  // Send all pending data on unmount
  useEffect(() => {
    return () => {
      if (scrollDataRef.current) {
        sendScrollData();
      }
      sendClickData();
    };
  }, [sendScrollData, sendClickData]);

  return null; // This component doesn't render anything
}
