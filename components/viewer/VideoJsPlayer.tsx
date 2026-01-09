/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import Hls from "hls.js";
import "video.js/dist/video-js.css";
import "videojs-markers";
import "videojs-markers/dist/videojs.markers.css";

import {
  videoTimestampsApi,
  type VideoTimestamp,
} from "@/services/videoTimestamps";

type VideoJsPlayerProps = {
  postId: string;
  videoUrl: string;
  videoId?: string | null;
  primaryColor?: string | null;
  className?: string;
  placeholderId?: string;
  videoTitle?: string;
};

export function extractCloudflareVideoIdFromUrl(url: string): {
  videoId: string | null;
  customerCode: string | null;
} {
  if (!url) return { videoId: null, customerCode: null };
  const normalized = url.startsWith("http")
    ? url
    : `https://${url.replace(/^\/\//, "")}`;

  let match = normalized.match(
    /customer-([a-zA-Z0-9]+)\.cloudflarestream\.com\/([a-zA-Z0-9]+)\/iframe/
  );
  if (match && match[1] && match[2]) {
    return { videoId: match[2], customerCode: match[1] };
  }

  match = normalized.match(
    /customer-([a-zA-Z0-9]+)\.cloudflarestream\.com\/([a-zA-Z0-9]+)/
  );
  if (match && match[1] && match[2]) {
    return { videoId: match[2], customerCode: match[1] };
  }

  match = normalized.match(/iframe\.videodelivery\.net\/([a-zA-Z0-9]+)/);
  if (match && match[1]) {
    return { videoId: match[1], customerCode: null };
  }

  match = normalized.match(/videodelivery\.net\/([a-zA-Z0-9]+)/);
  if (match && match[1]) {
    return { videoId: match[1], customerCode: null };
  }

  match = normalized.match(/watch\.cloudflarestream\.com\/([a-zA-Z0-9]+)/);
  if (match && match[1]) {
    return { videoId: match[1], customerCode: null };
  }

  if (/^[a-zA-Z0-9]{16,}$/.test(normalized)) {
    return { videoId: normalized, customerCode: null };
  }

  return { videoId: null, customerCode: null };
}

function convertToHlsManifestUrl(url: string): string | null {
  const { videoId, customerCode } = extractCloudflareVideoIdFromUrl(url);
  if (!videoId) return null;

  if (url.includes(".m3u8")) return url;

  if (customerCode) {
    return `https://customer-${customerCode}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
  }
  return `https://videodelivery.net/${videoId}/manifest/video.m3u8`;
}

function extractPrimaryColorFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pc = urlObj.searchParams.get("primaryColor");
    if (pc) {
      return pc.startsWith("#") ? pc : `#${pc.replace(/^%23/, "")}`;
    }
    const match = url.match(/primaryColor=([^&]+)/);
    if (match) {
      const color = decodeURIComponent(match[1]);
      return color.startsWith("#") ? color : `#${color.replace(/^%23/, "")}`;
    }
  } catch {
    const match = url.match(/primaryColor=%23([a-fA-F0-9]{6})/);
    if (match) {
      return `#${match[1]}`;
    }
  }
  return null;
}

function extractBooleanFromUrl(
  url: string,
  key: string,
  defaultValue: boolean = true
): boolean {
  try {
    const urlObj = new URL(url);
    const val = urlObj.searchParams.get(key);
    if (val === "false") return false;
    if (val === "true") return true;
  } catch {
    const match = url.match(new RegExp(`${key}=(true|false)`));
    if (match) {
      return match[1] === "true";
    }
  }
  return defaultValue;
}

export function VideoJsPlayer({
  postId,
  videoUrl,
  videoId: providedVideoId,
  primaryColor: providedPrimaryColor,
  className,
  placeholderId,
  videoTitle,
}: VideoJsPlayerProps) {
  const { videoId: extractedVideoId } =
    extractCloudflareVideoIdFromUrl(videoUrl);
  const resolvedVideoId = providedVideoId || extractedVideoId;
  const extractedPrimaryColor =
    providedPrimaryColor || extractPrimaryColorFromUrl(videoUrl) || "#3B82F6";

  const autoplay = extractBooleanFromUrl(videoUrl, "autoplay", true);
  const showDuration = extractBooleanFromUrl(videoUrl, "showDuration", true);
  const showBackground = extractBooleanFromUrl(videoUrl, "showBackground", true);

  console.log("VideoJsPlayer settings from URL:", {
    videoUrl,
    autoplay,
    showDuration,
    showBackground,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [timestamps, setTimestamps] = useState<VideoTimestamp[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const markersInitializedRef = useRef(false);
  const [hasStarted, setHasStarted] = useState(false);
  const hasStartedRef = useRef(false);
  const [videoDuration, setVideoDuration] = useState<string>("0:00");
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Unique ID for this player instance to scope CSS
  // Use useState with lazy initializer to ensure Math.random() only runs once
  const [playerId] = useState(() => {
    const id =
      resolvedVideoId ||
      extractedVideoId ||
      Math.random().toString(36).substring(2, 9);
    return `videojs-player-${id}`;
  });

  useEffect(() => {
    if (!resolvedVideoId) return;
    let ignore = false;
    videoTimestampsApi
      .getPublicByVideoId(resolvedVideoId)
      .then((data) => {
        if (!ignore) {
          console.log(`Loaded ${data?.length || 0} timestamps:`, data);
          setTimestamps(data || []);
        }
      })
      .catch((error) => {
        console.error("Error loading timestamps for Video.js player:", error);
      });

    return () => {
      ignore = true;
    };
  }, [postId, resolvedVideoId]);

  useEffect(() => {
    if (!isMounted || !videoRef.current || !videoUrl) {
      return;
    }

    const video = videoRef.current;
    const hlsManifestUrl = convertToHlsManifestUrl(videoUrl);
    const isHls = !!hlsManifestUrl;
    const finalUrl = hlsManifestUrl || videoUrl;

    console.log("Initializing player with URL:", finalUrl, "isHls:", isHls);

    // IMPORTANT:
    // The post renderer already constrains the video container to 16:9 via `.video-wrapper` in `app/globals.css`.
    // Using Video.js "fluid" mode (which creates its own aspect-ratio box) causes nested aspect-ratio containers
    // and can clip the control bar (especially after fullscreen exit). So we disable `fluid` and let the parent
    // container define sizing.
    const player = videojs(video, {
      autoplay: autoplay, // Respect extracted setting
      muted: true, // Start muted
      controls: true,
      preload: "auto",
      fluid: false,
      inactivityTimeout: 3000, // Hide controls after 3 seconds of inactivity
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2], // Allow speed change
      html5: {
        vhs: {
          overrideNative: true,
        },
        nativeVideoTracks: false,
        nativeAudioTracks: false,
        nativeTextTracks: false,
      },
    });

    // Ensure pitch preservation (prevent chipmunk effect)
    if ((video as any).mozPreservesPitch !== undefined) (video as any).mozPreservesPitch = true;
    if ((video as any).webkitPreservesPitch !== undefined) (video as any).webkitPreservesPitch = true;
    if ((video as any).preservesPitch !== undefined) (video as any).preservesPitch = true;

    playerRef.current = player;
    console.log("Player initialized");

    // Format duration helper
    const formatDuration = (seconds: number): string => {
      if (!seconds || !isFinite(seconds)) return "0:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Update duration when available
    const updateDuration = () => {
      const duration = player.duration();
      if (duration && isFinite(duration) && duration > 0) {
        setVideoDuration(formatDuration(duration));
      }
    };

    player.on("loadedmetadata", updateDuration);
    player.on("durationchange", updateDuration);
    player.ready(() => {
      setTimeout(updateDuration, 100);
      // Ensure video starts playing muted in background if autoplay is enabled
      if (autoplay && !hasStartedRef.current && player.paused()) {
        const playPromise = player.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.log(
              "Autoplay prevented, will play on user interaction:",
              err
            );
          });
        }
      }
    });

    if (containerRef.current) {
      containerRef.current.style.setProperty(
        "--vjs-primary-color",
        extractedPrimaryColor
      );
      player.ready(() => {
        const controlBar = player.getChild("controlBar");
        if (controlBar) {
          const playToggle = controlBar.getChild("playToggle");
          const progressControl = controlBar.getChild("progressControl");

          if (playToggle) {
            const playEl = playToggle.el() as HTMLElement;
            if (playEl) {
              playEl.style.color = extractedPrimaryColor;
            }
          }

          if (progressControl) {
            const seekBar = progressControl.getChild("seekBar");
            if (seekBar) {
              const loadProgress = seekBar.getChild("loadProgressBar");
              const playProgress = seekBar.getChild("playProgressBar");
              if (loadProgress) {
                const loadEl = loadProgress.el() as HTMLElement;
                if (loadEl) {
                  loadEl.style.backgroundColor = extractedPrimaryColor;
                }
              }
              if (playProgress) {
                const playEl = playProgress.el() as HTMLElement;
                if (playEl) {
                  playEl.style.backgroundColor = extractedPrimaryColor;
                }
              }
            }
          }
        }
      });
    }

    // Handle play button click to start video
    const handlePlayClick = () => {
      if (!hasStartedRef.current) {
        player.currentTime(0); // Start from beginning
        player.muted(false); // Unmute
        hasStartedRef.current = true;
        setHasStarted(true);
        const playPromise = player.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.error("Error playing video:", err);
          });
        }
      }
    };

    // Store handler for cleanup
    (player as any)._customPlayHandler = handlePlayClick;

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hlsRef.current = hls;

      hls.loadSource(finalUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("HLS manifest loaded successfully");
        // Try to play muted in background if autoplay is enabled
        if (autoplay && !hasStartedRef.current && player.paused()) {
          const playPromise = player.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              console.log("Autoplay prevented:", err);
            });
          }
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error("HLS network error, trying to recover...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error("HLS media error, trying to recover...");
              hls.recoverMediaError();
              break;
            default:
              console.error("HLS fatal error, cannot recover");
              hls.destroy();
              break;
          }
        }
      });
    } else if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = finalUrl;
    } else if (!isHls) {
      // Direct video (e.g. MP4)
      player.src({
        src: finalUrl,
        type: videoUrl.includes(".mp4") ? "video/mp4" : "video/webm",
      });
      // Try to play muted in background after source is set if autoplay is enabled
      player.ready(() => {
        if (autoplay && !hasStartedRef.current && player.paused()) {
          const playPromise = player.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              console.log("Autoplay prevented:", err);
            });
          }
        }
      });
    } else {
      console.error("HLS is not supported in this browser");
    }

    player.on("error", () => {
      const error = player.error();
      console.error("Video.js player error:", error);
    });

    // Force a resize check when entering/exiting fullscreen
    player.on("fullscreenchange", () => {
      console.log("Fullscreen changed, triggering resize");
      setTimeout(() => {
        player.trigger("resize");
      }, 100);
    });

    return () => {
      player.off("loadedmetadata", updateDuration);
      player.off("durationchange", updateDuration);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      player.dispose();
      playerRef.current = null;
      markersInitializedRef.current = false;
    };
  }, [videoUrl, isMounted, extractedPrimaryColor]);

  // Manual marker injection when videojs-markers plugin fails
  useEffect(() => {
    if (!playerRef.current || timestamps.length === 0) {
      return;
    }

    const player = playerRef.current as Player & {
      markers?: (config: any) => void;
    };

    console.log(`Setting up markers with ${timestamps.length} timestamps`);

    const setupMarkers = () => {
      if (markersInitializedRef.current) {
        console.log("Markers already initialized");
        return;
      }

      const duration = player.duration();
      console.log("Duration:", duration);

      if (!duration || !isFinite(duration) || duration === 0) {
        console.log("Duration not ready");
        return;
      }

      // Try the plugin first
      if (typeof (player as any).markers === "function") {
        try {
          (player as any).markers.removeAll?.();
        } catch (e) {
          console.warn("Error removing existing markers:", e);
        }

        const markersConfig = {
          markers: timestamps.map((ts) => ({
            time: ts.timestamp_seconds,
            text: ts.label,
          })),
          markerStyle: {
            width: "14px",
            height: "14px",
            "background-color": extractedPrimaryColor,
            "border-radius": "50%",
            border: "3px solid white",
            "box-shadow": "0 0 6px rgba(0,0,0,0.8)",
          },
          markerTip: {
            display: true,
            text: (marker: { time: number; text: string }) => marker.text,
          },
          breakOverlay: {
            display: false,
          },
          onMarkerClick: (marker: { time: number }) => {
            console.log(`Marker clicked at ${marker.time}s`);
            player.currentTime(marker.time);
            if (player.paused()) {
              player.play();
            }
          },
        };

        try {
          (player as any).markers(markersConfig);
          console.log("✓ Markers plugin called");

          // Check if markers actually appeared in DOM
          setTimeout(() => {
            const markerElements = document.querySelectorAll(".vjs-marker");
            console.log(
              `Found ${markerElements.length} marker elements in DOM`
            );

            // If plugin failed to create markers, create them manually
            if (markerElements.length === 0) {
              console.log("Plugin failed, creating markers manually...");
              createManualMarkers(player, timestamps, duration);
            }

            markersInitializedRef.current = true;
          }, 500);
        } catch (e) {
          console.error("Error initializing markers:", e);
          // Fallback to manual creation
          createManualMarkers(player, timestamps, duration);
          markersInitializedRef.current = true;
        }
      } else {
        console.warn(
          "videojs-markers plugin not available, creating manual markers"
        );
        createManualMarkers(player, timestamps, duration);
        markersInitializedRef.current = true;
      }
    };

    const checkAndSetup = () => {
      const readyState = player.readyState();
      const duration = player.duration();

      if (readyState >= 1 && duration && isFinite(duration) && duration > 0) {
        setupMarkers();
      }
    };

    const onLoadedMetadata = () => {
      console.log("loadedmetadata event");
      setTimeout(checkAndSetup, 100);
    };

    const onDurationChange = () => {
      console.log("durationchange event");
      setTimeout(checkAndSetup, 100);
    };

    player.on("loadedmetadata", onLoadedMetadata);
    player.on("durationchange", onDurationChange);

    player.ready(() => {
      console.log("Player ready");
      setTimeout(checkAndSetup, 100);
      setTimeout(checkAndSetup, 500);
      setTimeout(checkAndSetup, 1000);
    });

    return () => {
      player.off("loadedmetadata", onLoadedMetadata);
      player.off("durationchange", onDurationChange);
    };
  }, [timestamps, extractedPrimaryColor]);

  const [placeholderElement, setPlaceholderElement] =
    useState<HTMLElement | null>(null);

  // Find placeholder element when it's available in the DOM
  useEffect(() => {
    if (placeholderId) {
      const findPlaceholder = () => {
        const placeholder = document.getElementById(placeholderId);
        if (placeholder) {
          // Ensure placeholder has the correct sizing + rounded corners.
          // Some pages also define `.video-js-placeholder` styles; inline styles here win and keep behavior consistent.
          placeholder.style.display = "block";
          placeholder.style.width = "80%";
          placeholder.style.maxWidth = "760px";
          (placeholder.style as any).aspectRatio = "16 / 9";
          placeholder.style.backgroundColor = "#000";
          placeholder.style.borderRadius = "0.75rem"; // matches Tailwind `rounded-xl` and overlay
          placeholder.style.overflow = "hidden";
          placeholder.style.position = "relative";
          placeholder.style.margin = "1.5rem auto";
          setPlaceholderElement(placeholder);
        } else {
          // Retry after a short delay if not found
          setTimeout(findPlaceholder, 100);
        }
      };
      findPlaceholder();
    }
  }, [placeholderId]);

  if (!videoUrl || !resolvedVideoId) {
    return null;
  }

  // If placeholderId is provided, render into placeholder using portal
  const containerClassName = placeholderId
    ? `rounded-xl border border-gray-200 overflow-hidden ${className ?? ""}`
    : `mt-12 rounded-xl border border-gray-200 overflow-hidden ${className ?? ""
    }`;

  // Convert primary color to rgba for overlay
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const overlayColor = showBackground
    ? hexToRgba(extractedPrimaryColor, 0.7)
    : "transparent";

  const handleOverlayPlayClick = () => {
    if (playerRef.current && !hasStartedRef.current) {
      playerRef.current.currentTime(0);
      playerRef.current.muted(false);
      hasStartedRef.current = true;
      setHasStarted(true);
      const playPromise = playerRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.error("Error playing video:", err);
        });
      }
    }
  };

  const playerContent = (
    <div
      id={playerId}
      ref={containerRef}
      className={containerClassName}
      data-video-started={hasStarted}
      data-has-timestamps={timestamps.length > 0 ? "true" : "false"}
      style={
        {
          "--vjs-primary-color": extractedPrimaryColor,
          maxWidth: "100%",
          margin: "0 auto",
          ...(placeholderId
            ? ({
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
            } as React.CSSProperties)
            : ({} as React.CSSProperties)),
        } as React.CSSProperties
      }
    >
      <div
        data-vjs-player
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          borderRadius: "0.75rem",
          overflow: "hidden",
        }}
      >
        <video
          ref={(el) => {
            videoRef.current = el;
            if (el && el.isConnected) {
              setIsMounted(true);
              // Ensure video is muted for autoplay
              if (el && !hasStarted) {
                el.muted = true;
              }
            }
          }}
          className="video-js vjs-big-play-centered vjs-default-skin"
          playsInline
          muted={!hasStarted}
          data-setup="{}"
        />
        {/* Overlay with play button and duration */}
        {!hasStarted && (
          <div
            ref={overlayRef}
            onClick={handleOverlayPlayClick}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: overlayColor,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 1000,
              borderRadius: "inherit",
            }}
          >
            {/* Title */}
            {videoTitle && (
              <h3
                style={{
                  color: "white",
                  fontSize: "1.5rem",
                  fontWeight: 600,
                  marginBottom: "20px",
                  textAlign: "center",
                  textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
                  maxWidth: "90%",
                  lineHeight: 1.3,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {videoTitle}
              </h3>
            )}

            {/* Play Button */}
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                backgroundColor: extractedPrimaryColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="white"
                style={{ marginLeft: "4px" }}
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            {/* Duration */}
            {showDuration && (
              <div
                style={{
                  color: "white",
                  fontSize: "16px",
                  fontWeight: 500,
                  textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
                }}
              >
                Video Duration: {videoDuration}
              </div>
            )}
          </div>
        )}
      </div>
      <style jsx global>{`
        #${playerId} {
          width: 100% !important;
          margin: 0 auto !important;
          border-radius: 0.75rem !important;
          overflow: hidden !important;
          background-color: transparent !important;
        }
        #${playerId} .video-js {
          width: 100% !important;
          height: 100% !important;
          margin: 0 auto !important;
          position: relative !important;
          border-radius: 0.75rem !important;
          overflow: hidden !important;
          background-color: transparent !important;
        }
        #${playerId} .video-js,
        #${playerId} .video-js .vjs-tech,
        #${playerId} .video-js .vjs-poster {
          width: 100% !important;
          height: 100% !important;
          border-radius: 0.75rem !important;
        }
        #${playerId} .video-js .vjs-tech {
          object-fit: contain !important;
          border-radius: 0.75rem !important;
        }
        #${playerId} .video-js .vjs-poster {
          background-size: contain !important;
          border-radius: 0.75rem !important;
        }
        #${playerId} .video-js video {
          border-radius: 0.75rem !important;
          background-color: transparent !important;
        }
        /* Hide control bar when video hasn't started */
        #${playerId}[data-video-started="false"] .video-js .vjs-control-bar {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
        }

        /* Show control bar when video has started */
        /* Show control bar when video has started - Premium Floating Style */
        #${playerId}[data-video-started="true"] .video-js .vjs-control-bar {
          z-index: 10 !important;
          display: flex !important;
          opacity: 1 !important;
          visibility: visible !important;
          bottom: 16px !important;
          left: 16px !important;
          right: 16px !important;
          width: auto !important;
          height: 52px !important;
          background-color: rgba(15, 15, 15, 0.85) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border-radius: 16px !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
          transform: none !important;
          transition: opacity 0.3s ease, visibility 0.3s ease !important;
          position: absolute !important;
          padding: 0 12px !important;
          align-items: center !important;
        }

        /* Improved Icon aesthetics */
        #${playerId} .video-js .vjs-button {
          width: 36px !important;
          height: 36px !important;
          border-radius: 8px !important;
          transition: background-color 0.2s !important;
        }
        #${playerId} .video-js .vjs-button:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
        #${playerId} .video-js .vjs-icon-placeholder:before {
            font-size: 1.8em !important;
            line-height: 36px !important;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5) !important;
        }
        
        #${playerId} .video-js .vjs-volume-panel {
            margin-right: 8px !important;
            display: flex !important;
            align-items: center !important;
        }

        /* Fix vertical alignment for text controls (Time, Speed) */
        #${playerId} .video-js .vjs-playback-rate,
        #${playerId} .video-js .vjs-time-control {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            height: 36px !important;
            margin-top: 0 !important; 
        }

        #${playerId} .video-js .vjs-playback-rate-value {
             display: flex !important;
             align-items: center !important;
             justify-content: center !important;
             height: 100% !important;
             line-height: 1 !important;
             font-size: 13px !important;
             font-weight: 500 !important;
        }

        #${playerId} .video-js .vjs-current-time,
        #${playerId} .video-js .vjs-duration,
        #${playerId} .video-js .vjs-remaining-time {
             display: flex !important;
             align-items: center !important;
             height: 36px !important;
        }
        
        #${playerId} .video-js .vjs-remaining-time-display,
        #${playerId} .video-js .vjs-current-time-display,
        #${playerId} .video-js .vjs-duration-display {
             display: flex !important;
             align-items: center !important;
             line-height: 1 !important;
             font-size: 14px !important;
             font-weight: 500 !important;
             padding: 0 4px !important;
        }

        /* Maximize seekbar space: Hide Volume and Time controls (except Duration) */
        #${playerId} .video-js .vjs-volume-panel,
        #${playerId} .video-js .vjs-current-time,
        #${playerId} .video-js .vjs-remaining-time,
        #${playerId} .video-js .vjs-time-divider {
            display: none !important;
        }
        
        #${playerId} .video-js .vjs-duration {
            display: flex !important;
            align-items: center !important;
            margin-left: 4px !important;
            margin-right: 4px !important;
            order: 3 !important;
        }

        /* Ensure progress control expands */
        #${playerId} .video-js .vjs-progress-control {
            flex: 1 1 auto !important;
            width: auto !important;
            margin: 0 8px !important;
            order: 2 !important;
        }
        
        #${playerId} .video-js .vjs-playback-rate { order: 4 !important; }
        #${playerId} .video-js .vjs-fullscreen-control { order: 5 !important; }
        #${playerId} .video-js .vjs-control-bar.vjs-hidden {
          display: flex !important;
        }

        /* Ensure controls are visible even when user is "inactive" ONLY if timestamps exist */
        #${playerId}[data-video-started="true"][data-has-timestamps="true"] .video-js.vjs-user-inactive .vjs-control-bar,
        #${playerId}[data-video-started="true"][data-has-timestamps="true"] .video-js.vjs-fullscreen .vjs-control-bar {
          display: flex !important;
          opacity: 1 !important;
          visibility: visible !important;
        }

        /* If NO timestamps, allow controls to hide on inactivity */
        #${playerId}[data-video-started="true"][data-has-timestamps="false"] .video-js.vjs-user-inactive .vjs-control-bar {
          opacity: 0 !important;
          visibility: hidden !important;
          transition: visibility 1s, opacity 1s;
        }
        #${playerId} [data-vjs-player] {
          border-radius: 0.75rem !important;
          overflow: hidden !important;
          background-color: transparent !important;
        }
        #${playerId} .video-js video {
          object-fit: contain !important;
          top: 0 !important;
          left: 0 !important;
          height: 100% !important;
          width: 100% !important;
          border-radius: 0.75rem !important;
          background-color: transparent !important;
        }
        /* Ensure all Video.js internal elements respect border radius */
        #${playerId} .video-js .vjs-tech,
        #${playerId} .video-js .vjs-poster,
        #${playerId} .video-js .vjs-text-track-display {
          border-radius: 0.75rem !important;
        }
        /* Sleek Progress Bar */
        #${playerId} .video-js .vjs-progress-control {
             height: 4px !important;
             top: 0 !important; /* Reset layout */
             margin: 0 16px !important;
             border-radius: 100px !important;
        }
        #${playerId} .video-js .vjs-slider {
             background-color: rgba(255, 255, 255, 0.2) !important;
             height: 4px !important;
             border-radius: 100px !important;
             margin: 0 !important; /* Fix alignment */
        }
        #${playerId} .video-js .vjs-play-progress {
             background-color: ${extractedPrimaryColor} !important;
             border-radius: 100px !important;
             box-shadow: 0 0 12px ${extractedPrimaryColor}90 !important;
        }
        #${playerId} .video-js .vjs-play-progress:before {
             display: none !important; /* Remove default square knob */
        }
        #${playerId} .video-js .vjs-play-progress:after {
             content: '' !important;
             position: absolute !important;
             top: -4px !important;
             right: -6px !important;
             width: 12px !important;
             height: 12px !important;
             background-color: white !important;
             border-radius: 50% !important;
             box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
             opacity: 0 !important;
             transform: scale(0) !important;
             transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
        }
        #${playerId} .video-js .vjs-progress-control:hover .vjs-play-progress:after {
             opacity: 1 !important;
             transform: scale(1) !important;
        }
        #${playerId} .video-js .vjs-play-control:hover,
        #${playerId} .video-js .vjs-play-control:focus {
          color: ${extractedPrimaryColor} !important;
        }
        #${playerId} .video-js .vjs-big-play-button {
          border-color: ${extractedPrimaryColor} !important;
        }
        #${playerId} .video-js .vjs-big-play-button:hover {
          background-color: ${extractedPrimaryColor} !important;
        }

        /* Hide default big play button when overlay is shown */
        #${playerId} .video-js .vjs-big-play-button {
          display: none !important;
        }

        /* Manual marker styles */
        #${playerId}
          .video-js
          .vjs-progress-control
          .vjs-progress-holder
          .vjs-marker,
        #${playerId}
          .video-js
          .vjs-progress-control
          .vjs-progress-holder
          .manual-marker {
          width: 14px !important;
          height: 14px !important;
          background-color: ${extractedPrimaryColor} !important;
          border-radius: 50% !important;
          border: 3px solid white !important;
          box-shadow: 0 0 8px rgba(0, 0, 0, 0.8) !important;
          position: absolute !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          cursor: pointer !important;
          z-index: 100 !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }

        #${playerId}
          .video-js
          .vjs-progress-control
          .vjs-progress-holder
          .vjs-marker:hover,
        #${playerId}
          .video-js
          .vjs-progress-control
          .vjs-progress-holder
          .manual-marker:hover {
          transform: translateY(-50%) scale(1.5) !important;
          transition: transform 0.2s ease !important;
          box-shadow: 0 0 12px rgba(0, 0, 0, 1) !important;
        }

        #${playerId} .vjs-marker-tip,
        #${playerId} .manual-marker-tip {
          background-color: rgba(0, 0, 0, 0.95) !important;
          color: white !important;
          padding: 6px 12px !important;
          border-radius: 4px !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          white-space: nowrap !important;
          pointer-events: none !important;
          z-index: 1000 !important;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5) !important;
          display: block !important;
          position: absolute !important;
          bottom: calc(100% + 8px) !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          opacity: 0 !important;
          transition: opacity 0.2s ease !important;
        }

        #${playerId} .manual-marker:hover .manual-marker-tip {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );

  // If placeholder is provided, render into it using portal
  if (placeholderId && placeholderElement) {
    return createPortal(playerContent, placeholderElement);
  }

  // Otherwise render normally
  return playerContent;
}

// Manual marker creation function
function createManualMarkers(
  player: Player,
  timestamps: VideoTimestamp[],
  duration: number
) {
  const controlBar = player.getChild("controlBar");
  if (!controlBar) {
    console.error("Control bar not found");
    return;
  }

  const progressControl = controlBar.getChild("progressControl");
  if (!progressControl) {
    console.error("Progress control not found");
    return;
  }

  const seekBar = progressControl.getChild("seekBar");
  if (!seekBar) {
    console.error("Seek bar not found");
    return;
  }

  // The seekBar element itself is what we need
  const progressHolder = seekBar.el() as HTMLElement;
  if (!progressHolder) {
    console.error("Seek bar element not found");
    return;
  }

  console.log("Progress holder found:", progressHolder);

  // Remove any existing manual markers
  progressHolder
    .querySelectorAll(".manual-marker")
    .forEach((el) => el.remove());

  timestamps.forEach((timestamp) => {
    const marker = document.createElement("div");
    marker.className = "manual-marker";

    const percentage = (timestamp.timestamp_seconds / duration) * 100;
    marker.style.left = `${percentage}%`;

    // Create tooltip
    const tooltip = document.createElement("div");
    tooltip.className = "manual-marker-tip";
    tooltip.textContent = timestamp.label;
    marker.appendChild(tooltip);

    // Click handler
    marker.addEventListener("click", () => {
      player.currentTime(timestamp.timestamp_seconds);
      if (player.paused()) {
        player.play();
      }
    });

    progressHolder.appendChild(marker);
    console.log(
      `Created manual marker at ${timestamp.timestamp_seconds}s (${percentage}%)`
    );
  });

  console.log(`✓ Created ${timestamps.length} manual markers`);
}
