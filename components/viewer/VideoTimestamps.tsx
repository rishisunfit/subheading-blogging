/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef } from "react";
import {
  videoTimestampsApi,
  type VideoTimestamp,
} from "@/services/videoTimestamps";

interface VideoTimestampsProps {
  postId: string;
  containerSelector?: string;
}

// Format seconds to MM:SS or HH:MM:SS
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// Extract Cloudflare Stream video ID from iframe src
function extractVideoIdFromIframe(iframe: HTMLIFrameElement): string | null {
  const src = iframe.src;
  const patterns = [
    /iframe\.videodelivery\.net\/([a-zA-Z0-9]+)/,
    /videodelivery\.net\/([a-zA-Z0-9]+)/,
    /customer-[a-zA-Z0-9]+\.cloudflarestream\.com\/([a-zA-Z0-9]+)\/iframe/,
    /customer-[a-zA-Z0-9]+\.cloudflarestream\.com\/([a-zA-Z0-9]+)/,
    /watch\.cloudflarestream\.com\/([a-zA-Z0-9]+)/,
  ];
  for (const pattern of patterns) {
    const match = src.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

function getPrimaryColor(iframe: HTMLIFrameElement): string {
  try {
    const url = new URL(iframe.src);
    const pc = url.searchParams.get("primaryColor");
    if (pc && pc.trim()) return pc.trim();
  } catch {
    return "#3B82F6"; // blue fallback
  }
  const wrapper = iframe.closest(".video-wrapper") as HTMLElement | null;
  const attr = wrapper?.getAttribute("data-primary-color");
  if (attr && attr.trim()) return attr.trim();
  return "#3B82F6"; // blue fallback
}

function ensureControlsDisabled(iframe: HTMLIFrameElement): boolean {
  try {
    const url = new URL(iframe.src);
    if (url.searchParams.get("controls") === "false") return false;
    url.searchParams.set("controls", "false");
    iframe.src = url.toString();
    return true;
  } catch {
    return false;
  }
}

// SVG Icons
const PlayIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const PauseIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
const VolumeIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>`;
const MuteIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
const FullscreenIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;

export function VideoTimestamps({
  postId,
  containerSelector = ".preview-content",
}: VideoTimestampsProps) {
  const playersRef = useRef<Map<string, any>>(new Map());
  const cleanupRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    const init = () => {
      const container = document.querySelector(containerSelector);
      const iframes = container?.querySelectorAll<HTMLIFrameElement>(
        'iframe[src*="cloudflarestream.com"], iframe[src*="videodelivery.net"]'
      );

      if (iframes && iframes.length > 0) {
        if (!(window as any).Stream) {
          const script = document.createElement("script");
          script.src = "https://embed.cloudflarestream.com/embed/sdk.latest.js";
          script.async = true;
          document.body.appendChild(script);
          script.onload = () => setupPlayers(iframes);
        } else {
          setupPlayers(iframes);
        }
      } else {
        setTimeout(init, 500);
      }
    };

    const timeoutId = setTimeout(init, 300);
    return () => {
      clearTimeout(timeoutId);
      cleanupRef.current.forEach((fn) => fn());
      cleanupRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, containerSelector]);

  const setupPlayers = async (iframes: NodeListOf<HTMLIFrameElement>) => {
    const Stream = (window as any).Stream;
    if (!Stream) return;

    for (let i = 0; i < iframes.length; i++) {
      const iframe = iframes[i];
      const videoId = extractVideoIdFromIframe(iframe);
      if (!videoId) continue;

      // Disable native controls
      const changed = ensureControlsDisabled(iframe);

      const initPlayer = async () => {
        try {
          const player = Stream(iframe);
          playersRef.current.set(videoId, player);

          // Set default speed to 1x
          try {
            player.playbackRate = 1;
          } catch {
            return;
          }

          // Load timestamps
          let timestamps: VideoTimestamp[] = [];
          try {
            timestamps = await videoTimestampsApi.getPublicByVideoId(videoId);
            timestamps.sort(
              (a, b) => a.timestamp_seconds - b.timestamp_seconds
            );
          } catch (e) {
            console.error("Error loading timestamps:", e);
          }

          // Create overlay UI
          createOverlayPlayer(iframe, player, videoId, timestamps, i);
        } catch (e) {
          console.error("Error initializing player:", e);
        }
      };

      if (changed) {
        iframe.addEventListener("load", initPlayer, { once: true });
      } else {
        await initPlayer();
      }
    }
  };

  const createOverlayPlayer = (
    iframe: HTMLIFrameElement,
    player: any,
    videoId: string,
    timestamps: VideoTimestamp[],
    index: number
  ) => {
    const primaryColor = getPrimaryColor(iframe);
    const wrapper =
      (iframe.closest(".video-wrapper") as HTMLElement) ||
      (iframe.parentElement as HTMLElement);
    if (!wrapper) return;

    // Create container that wraps iframe and overlay
    const containerId = `cf-player-container-${videoId}-${index}`;
    let container = document.getElementById(containerId) as HTMLElement | null;

    // If container already exists and iframe is already inside it, reuse it
    if (container && container.contains(iframe)) {
      // Clear existing overlay and recreate
      const existingOverlay = container.querySelector(".cf-overlay");
      if (existingOverlay) existingOverlay.remove();
    } else {
      // Remove old container if it exists elsewhere
      if (container) container.remove();

      // Create new container
      container = document.createElement("div");
      container.id = containerId;
      container.style.cssText = `
            position: relative;
            width: 100%;
            aspect-ratio: 16/9;
            background: #000;
            border-radius: 12px;
            overflow: hidden;
        `;

      // Handle fullscreen changes to adjust padding
      const handleFullscreenChange = () => {
        const isFullscreen = !!document.fullscreenElement;
        if (isFullscreen) {
          controlsBar.style.padding = "0 24px 16px";
          overlay.style.borderRadius = "0";
        } else {
          controlsBar.style.padding = "0 16px 12px";
          overlay.style.borderRadius = "12px";
        }
      };
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      cleanupRef.current.push(() => {
        document.removeEventListener(
          "fullscreenchange",
          handleFullscreenChange
        );
      });

      // Move iframe into container
      iframe.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border: none;
                pointer-events: none;
            `;

      // Safely replace iframe with container, then move iframe inside
      const iframeParent = iframe.parentNode;
      if (iframeParent) {
        iframeParent.insertBefore(container, iframe);
      } else {
        wrapper.appendChild(container);
      }
      container.appendChild(iframe);
    }

    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "cf-overlay";
    overlay.style.cssText = `
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            opacity: 1;
            transition: opacity 0.3s ease;
            cursor: pointer;
        `;

    // Gradient background for controls visibility
    const gradient = document.createElement("div");
    gradient.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 150px;
            background: linear-gradient(transparent, rgba(0,0,0,0.8));
            pointer-events: none;
        `;
    overlay.appendChild(gradient);

    // Center play button (big)
    const centerPlay = document.createElement("button");
    centerPlay.className = "cf-center-play";
    centerPlay.innerHTML = PlayIcon;
    centerPlay.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(1);
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(0,0,0,0.6);
            border: none;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s ease, background 0.2s ease;
            backdrop-filter: blur(4px);
        `;
    centerPlay.querySelector("svg")!.style.cssText =
      "width: 40px; height: 40px; margin-left: 4px;";
    centerPlay.onmouseenter = () => {
      centerPlay.style.transform = "translate(-50%, -50%) scale(1.1)";
      centerPlay.style.background = primaryColor;
    };
    centerPlay.onmouseleave = () => {
      centerPlay.style.transform = "translate(-50%, -50%) scale(1)";
      centerPlay.style.background = "rgba(0,0,0,0.6)";
    };
    overlay.appendChild(centerPlay);

    // Controls bar at bottom
    const controlsBar = document.createElement("div");
    controlsBar.className = "cf-controls-bar";
    controlsBar.style.cssText = `
            position: relative;
            padding: 0 16px 8px;
            z-index: 10;
        `;

    // Seekbar section with timestamps - moved very low
    const seekSection = document.createElement("div");
    seekSection.style.cssText = `
            position: relative;
            margin-bottom: 4px;
        `;

    // Seekbar track
    const seekTrack = document.createElement("div");
    seekTrack.className = "cf-seek-track";
    seekTrack.style.cssText = `
            position: relative;
            height: 4px;
            background: rgba(255,255,255,0.2);
            border-radius: 2px;
            cursor: pointer;
            transition: height 0.15s ease, background 0.15s ease;
        `;

    // Buffer bar
    const bufferBar = document.createElement("div");
    bufferBar.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            background: rgba(255,255,255,0.4);
            border-radius: 3px;
            width: 0%;
            pointer-events: none;
        `;
    seekTrack.appendChild(bufferBar);

    // Progress bar
    const progressBar = document.createElement("div");
    progressBar.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            background: ${primaryColor};
            border-radius: 3px;
            width: 0%;
            pointer-events: none;
        `;
    seekTrack.appendChild(progressBar);

    // Seek thumb
    const seekThumb = document.createElement("div");
    seekThumb.style.cssText = `
            position: absolute;
            top: 50%;
            left: 0%;
            transform: translate(-50%, -50%) scale(0);
            width: 14px;
            height: 14px;
            background: ${primaryColor};
            border-radius: 50%;
            pointer-events: none;
            transition: transform 0.15s ease;
        `;
    seekTrack.appendChild(seekThumb);

    // Timestamp markers on seekbar
    const markerContainer = document.createElement("div");
    markerContainer.style.cssText = `
            position: absolute;
            left: 0;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            height: 100%;
            pointer-events: none;
        `;

    // Hide hover time when hovering over marker container
    markerContainer.onmouseenter = () => {
      hoverTime.style.opacity = "0";
      hoverTime.style.pointerEvents = "none";
      hoverTime.style.visibility = "hidden";
    };

    const markerElements: Array<{
      ts: VideoTimestamp;
      dot: HTMLElement;
      label: HTMLElement;
    }> = [];
    timestamps.forEach((ts) => {
      const dot = document.createElement("div");
      dot.style.cssText = `
                position: absolute;
                top: 50%;
                transform: translate(-50%, -50%);
                width: 12px;
                height: 12px;
                background: white;
                border: 2px solid ${primaryColor};
                border-radius: 50%;
                cursor: pointer;
                pointer-events: auto;
                transition: transform 0.15s ease, box-shadow 0.15s ease;
                z-index: 5;
            `;

      const label = document.createElement("div");
      label.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 2px; font-size: 7px;">${
                  ts.label
                }</div>
                <div style="font-size: 6px; opacity: 0.9; font-family: tabular-nums;">${formatTime(
                  ts.timestamp_seconds
                )}</div>
            `;
      label.style.cssText = `
                position: absolute;
                bottom: calc(100% + 12px);
                left: 50%;
                transform: translateX(-50%) translateY(4px);
                background: rgba(15, 15, 15, 0.95);
                color: white;
                padding: 10px 14px;
                border-radius: 10px;
                font-size: 12px;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 100;
                box-shadow: 0 8px 24px rgba(0,0,0,0.4);
                text-align: center;
                border: 1px solid rgba(255,255,255,0.1);
                backdrop-filter: blur(8px);
            `;
      dot.appendChild(label);

      dot.onmouseenter = () => {
        dot.style.transform = "translate(-50%, -50%) scale(1.4)";
        dot.style.boxShadow = `0 0 0 6px ${primaryColor}40`;
        label.style.opacity = "1";
        label.style.transform = "translateX(-50%) translateY(0)";
        hoverTime.style.opacity = "0";
        hoverTime.style.pointerEvents = "none";
        hoverTime.style.visibility = "hidden";
      };
      dot.onmouseleave = () => {
        dot.style.transform = "translate(-50%, -50%)";
        dot.style.boxShadow = "none";
        label.style.opacity = "0";
        label.style.transform = "translateX(-50%) translateY(4px)";
      };
      dot.onclick = (e) => {
        e.stopPropagation();
        seekTo(ts.timestamp_seconds);
      };

      markerContainer.appendChild(dot);
      markerElements.push({ ts, dot, label });
    });

    seekTrack.appendChild(markerContainer);

    // Hover time tooltip
    const hoverTime = document.createElement("div");
    hoverTime.style.cssText = `
            position: absolute;
            bottom: calc(100% + 8px);
            transform: translateX(-50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.1s ease;
            z-index: 50;
        `;
    seekTrack.appendChild(hoverTime);

    seekSection.appendChild(seekTrack);

    // Bottom controls row
    const bottomRow = document.createElement("div");
    bottomRow.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        `;

    const leftControls = document.createElement("div");
    leftControls.style.cssText =
      "display: flex; align-items: center; gap: 8px;";

    const rightControls = document.createElement("div");
    rightControls.style.cssText =
      "display: flex; align-items: center; gap: 8px;";

    // Helper to create icon button
    const createIconBtn = (icon: string, title: string) => {
      const btn = document.createElement("button");
      btn.innerHTML = icon;
      btn.title = title;
      btn.style.cssText = `
                background: transparent;
                border: none;
                color: white;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                border-radius: 6px;
                transition: background 0.15s ease;
            `;
      btn.querySelector("svg")!.style.cssText = "width: 22px; height: 22px;";
      btn.onmouseenter = () => {
        btn.style.background = "rgba(255,255,255,0.1)";
      };
      btn.onmouseleave = () => {
        btn.style.background = "transparent";
      };
      return btn;
    };

    const playBtn = createIconBtn(PlayIcon, "Play/Pause");
    const muteBtn = createIconBtn(VolumeIcon, "Mute/Unmute");

    // Volume slider
    const volumeSlider = document.createElement("input");
    volumeSlider.type = "range";
    volumeSlider.min = "0";
    volumeSlider.max = "1";
    volumeSlider.step = "0.1";
    volumeSlider.value = "1";
    volumeSlider.style.cssText = `
            width: 60px;
            height: 4px;
            accent-color: ${primaryColor};
            cursor: pointer;
        `;

    // Time display
    const timeDisplay = document.createElement("span");
    timeDisplay.style.cssText = `
            color: white;
            font-size: 13px;
            font-family: system-ui, sans-serif;
            font-variant-numeric: tabular-nums;
            padding: 0 4px;
            white-space: nowrap;
        `;
    timeDisplay.textContent = "0:00 / 0:00";

    // Speed dropdown wrapper
    const speedWrapper = document.createElement("div");
    speedWrapper.style.cssText =
      "display: flex; align-items: center; gap: 6px;";

    // const speedLabel = document.createElement("span");
    // speedLabel.textContent = "Speed";
    // speedLabel.style.cssText = "color: rgba(255,255,255,0.7); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;";

    const speedSelect = document.createElement("select");
    speedSelect.style.cssText = `
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            padding: 4px 24px 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 8px center;
            outline: none;
            transition: all 0.2s ease;
            min-width: 50px;
        `;
    speedSelect.onmouseenter = () => {
      speedSelect.style.background = "rgba(255,255,255,0.2)";
      speedSelect.style.borderColor = "rgba(255,255,255,0.4)";
    };
    speedSelect.onmouseleave = () => {
      speedSelect.style.background = "rgba(255,255,255,0.1)";
      speedSelect.style.borderColor = "rgba(255,255,255,0.2)";
    };

    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    speeds.forEach((rate) => {
      const option = document.createElement("option");
      option.value = rate.toString();
      option.textContent = `${rate}x`;
      option.style.background = "#1a1a1a";
      option.style.color = "white";
      speedSelect.appendChild(option);
    });

    // Ensure 1x is selected and visible - set after all options are added
    speedSelect.value = "1";
    speedSelect.selectedIndex = speeds.indexOf(1);

    // Force update display
    const selectedOption = speedSelect.options[speedSelect.selectedIndex];
    if (selectedOption) {
      selectedOption.selected = true;
    }

    // speedWrapper.appendChild(speedLabel);
    speedWrapper.appendChild(speedSelect);

    const fullscreenBtn = createIconBtn(FullscreenIcon, "Fullscreen");

    leftControls.appendChild(playBtn);
    leftControls.appendChild(muteBtn);
    leftControls.appendChild(volumeSlider);
    leftControls.appendChild(timeDisplay);

    rightControls.appendChild(speedWrapper);
    rightControls.appendChild(fullscreenBtn);

    bottomRow.appendChild(leftControls);
    bottomRow.appendChild(rightControls);

    controlsBar.appendChild(seekSection);
    controlsBar.appendChild(bottomRow);
    overlay.appendChild(controlsBar);
    container.appendChild(overlay);

    // State
    let isPlaying = false;
    let isMuted = false;
    let duration = 0;
    let currentTime = 0;
    let hideTimeout: number | null = null;
    let isHovering = false;
    let isSeeking = false;

    const showControls = () => {
      overlay.style.opacity = "1";
      container.style.cursor = "default";
    };

    const hideControls = () => {
      if (!isHovering && isPlaying && !isSeeking) {
        overlay.style.opacity = "0";
        container.style.cursor = "none";
      }
    };

    const resetHideTimer = () => {
      if (hideTimeout) clearTimeout(hideTimeout);
      showControls();
      hideTimeout = window.setTimeout(hideControls, 3000);
    };

    container.onmouseenter = () => {
      isHovering = true;
      showControls();
    };
    container.onmouseleave = () => {
      isHovering = false;
      resetHideTimer();
    };
    container.onmousemove = () => resetHideTimer();
    container.onclick = (e) => {
      const target = e.target as HTMLElement;
      // Don't trigger if clicking on any interactive element
      if (
        target.closest(
          "button, input, select, .cf-seek-track, .cf-timestamp-dot, .cf-controls-bar, .cf-center-play"
        )
      ) {
        return;
      }
      // Only toggle play if clicking directly on the overlay/video area
      if (target === overlay || target === container || target === gradient) {
        togglePlay();
      }
    };

    // Seekbar interactions
    seekTrack.onmouseenter = () => {
      seekTrack.style.height = "6px";
      seekTrack.style.background = "rgba(255,255,255,0.3)";
      seekThumb.style.transform = "translate(-50%, -50%) scale(1)";
    };
    seekTrack.onmouseleave = () => {
      if (!isSeeking) {
        seekTrack.style.height = "4px";
        seekTrack.style.background = "rgba(255,255,255,0.2)";
        seekThumb.style.transform = "translate(-50%, -50%) scale(0)";
      }
    };
    seekTrack.onmousemove = (e) => {
      const rect = seekTrack.getBoundingClientRect();
      const pct = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width)
      );

      // Only show hoverTime if not hovering over a dot or marker container
      const target = e.target as HTMLElement;
      const overDot = target.closest(".cf-timestamp-dot");
      const overMarker = markerContainer.contains(target);
      if (!overDot && !overMarker) {
        hoverTime.style.left = `${pct * 100}%`;
        hoverTime.style.opacity = "1";
        hoverTime.style.pointerEvents = "auto";
        hoverTime.style.visibility = "visible";
        hoverTime.textContent = formatTime(duration * pct);
      } else {
        hoverTime.style.opacity = "0";
        hoverTime.style.pointerEvents = "none";
        hoverTime.style.visibility = "hidden";
      }
    };
    seekTrack.onmouseleave = () => {
      hoverTime.style.opacity = "0";
      hoverTime.style.pointerEvents = "none";
      hoverTime.style.visibility = "hidden";
    };

    const updateSeekVisual = (pct: number) => {
      progressBar.style.width = `${pct * 100}%`;
      seekThumb.style.left = `${pct * 100}%`;
    };

    seekTrack.onmousedown = (e) => {
      isSeeking = true;
      const rect = seekTrack.getBoundingClientRect();
      const seek = (clientX: number) => {
        const pct = Math.max(
          0,
          Math.min(1, (clientX - rect.left) / rect.width)
        );
        updateSeekVisual(pct);
        return pct;
      };
      seek(e.clientX);

      const onMove = (ev: MouseEvent) => seek(ev.clientX);
      const onUp = (ev: MouseEvent) => {
        isSeeking = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        const pct = seek(ev.clientX);
        seekTo(duration * pct);
        seekTrack.style.height = "5px";
        seekThumb.style.transform = "translate(-50%, -50%) scale(0)";
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };

    // Player control functions
    const togglePlay = async () => {
      try {
        // Check if player is paused - handle both property and function
        let paused: boolean;
        if (typeof player.paused === "function") {
          paused = await player.paused();
        } else if (typeof player.paused === "boolean") {
          paused = player.paused;
        } else {
          // Fallback: try to get paused state
          paused = player.paused ?? true;
        }

        if (paused) {
          await player.play();
        } else {
          await player.pause();
        }
      } catch (e) {
        console.error("Error toggling play:", e);
      }
    };

    const seekTo = async (seconds: number) => {
      try {
        player.currentTime = seconds;
        await player.play();
      } catch {
        return;
      }
    };

    const toggleMute = (e?: MouseEvent) => {
      if (e) e.stopPropagation();
      try {
        isMuted = !isMuted;
        player.muted = isMuted;
        muteBtn.innerHTML = isMuted ? MuteIcon : VolumeIcon;
        const muteSvg = muteBtn.querySelector("svg");
        if (muteSvg) muteSvg.style.cssText = "width: 22px; height: 22px;";
      } catch {
        return;
      }
    };

    // Event handlers
    playBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      await togglePlay();
    };
    centerPlay.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      await togglePlay();
    };
    muteBtn.onclick = toggleMute;
    volumeSlider.onclick = (e) => e.stopPropagation();
    volumeSlider.oninput = (e) => {
      e.stopPropagation();
      try {
        player.volume = parseFloat(volumeSlider.value);
        if (parseFloat(volumeSlider.value) === 0) {
          isMuted = true;
          muteBtn.innerHTML = MuteIcon;
        } else {
          isMuted = false;
          muteBtn.innerHTML = VolumeIcon;
        }
        const muteSvg = muteBtn.querySelector("svg");
        if (muteSvg) muteSvg.style.cssText = "width: 22px; height: 22px;";
      } catch {
        return;
      }
    };
    speedSelect.onclick = (e) => e.stopPropagation();
    speedSelect.onchange = (e) => {
      e.stopPropagation();
      const rate = parseFloat(speedSelect.value);
      try {
        player.playbackRate = rate;
        // Force update display
        speedSelect.selectedIndex = speeds.indexOf(rate);
      } catch {
        return;
      }
    };
    // Handle fullscreen changes to adjust padding
    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;
      if (isFullscreen) {
        controlsBar.style.padding = "0 24px 16px";
        container.style.borderRadius = "0";
      } else {
        controlsBar.style.padding = "0 16px 12px";
        container.style.borderRadius = "12px";
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    cleanupRef.current.push(() => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    });

    fullscreenBtn.onclick = async () => {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else {
          await container.requestFullscreen();
        }
        // Small delay to ensure fullscreen state is updated
        setTimeout(handleFullscreenChange, 100);
      } catch (e) {
        console.error("Error toggling fullscreen:", e);
      }
    };

    // Update loop
    const updateInterval = setInterval(() => {
      try {
        duration = player.duration || 0;
        currentTime = player.currentTime || 0;

        try {
          // Get paused state - handle both property and function
          let paused: boolean;
          if (typeof player.paused === "function") {
            // If it's a function, call it synchronously (most players return boolean directly)
            try {
              const result = player.paused();
              paused =
                typeof result === "boolean"
                  ? result
                  : (result as any)?.then
                  ? true
                  : player.paused ?? true;
            } catch {
              paused = player.paused ?? true;
            }
          } else if (typeof player.paused === "boolean") {
            paused = player.paused;
          } else {
            paused = player.paused ?? true;
          }

          isPlaying = !paused;
          playBtn.innerHTML = isPlaying ? PauseIcon : PlayIcon;
          const playSvg = playBtn.querySelector("svg");
          if (playSvg) playSvg.style.cssText = "width: 22px; height: 22px;";
          centerPlay.innerHTML = isPlaying ? PauseIcon : PlayIcon;
          const centerSvg = centerPlay.querySelector("svg");
          if (centerSvg) {
            centerSvg.style.cssText =
              "width: 40px; height: 40px; margin-left: " +
              (isPlaying ? "0" : "4px") +
              ";";
          }
          centerPlay.style.opacity = isPlaying ? "0" : "1";
        } catch {
          return;
        }

        if (duration > 0 && !isSeeking) {
          const pct = currentTime / duration;
          updateSeekVisual(pct);
          timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(
            duration
          )}`;

          // Position timestamp markers
          markerElements.forEach(({ ts, dot }) => {
            const mpct = ts.timestamp_seconds / duration;
            dot.style.left = `${mpct * 100}%`;
          });
        }

        // Buffer
        try {
          const buffered = player.buffered;
          if (buffered && buffered.length > 0) {
            const bufferedEnd = buffered.end(buffered.length - 1);
            bufferBar.style.width = `${(bufferedEnd / duration) * 100}%`;
          }
        } catch {
          return;
        }
      } catch {
        return;
      }
    }, 100);

    cleanupRef.current.push(() => clearInterval(updateInterval));
  };

  return null;
}
