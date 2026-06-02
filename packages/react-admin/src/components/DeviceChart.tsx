"use client";

import React from "react";
import { useDeviceBreakdown } from "../hooks/useAnalytics.js";
import { DateRange } from "../types.js";

export interface DeviceChartProps {
  type?: "device" | "browser" | "os";
  range?: DateRange;
  style?: React.CSSProperties;
  className?: string;
}

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#f97316",
  "#84cc16",
];

/**
 * DeviceChart
 *
 * Horizontal bar chart for device/browser/OS breakdown.
 * No external charting library required.
 *
 * @example
 * <DeviceChart type="device" />
 * <DeviceChart type="browser" />
 * <DeviceChart type="os" />
 */
export function DeviceChart({
  type = "device",
  range,
  style,
  className,
}: DeviceChartProps) {
  const { data, loading, error } = useDeviceBreakdown(type, range);

  const titles = {
    device: "Devices",
    browser: "Browsers",
    os: "Operating Systems",
  };

  return (
    <div
      style={{
        background: "#13131f",
        border: "1px solid #2e2e4e",
        borderRadius: 12,
        padding: "20px 24px",
        ...style,
      }}
      className={className}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 20,
        }}
      >
        <span style={{ color: "#f8f8ff", fontWeight: 600, fontSize: 14 }}>
          {titles[type]}
        </span>
        <span style={{ color: "#6b6b8a", fontSize: 12 }}>breakdown</span>
      </div>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 32,
                background: "#1e1e2e",
                borderRadius: 6,
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      )}

      {error && (
        <div style={{ color: "#f87171", fontSize: 13 }}>
          Failed to load: {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.slice(0, 8).map((item, i) => (
            <div key={item.dimension}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span style={{ color: "#e0e0f0", fontSize: 13 }}>
                  {item.dimension}
                </span>
                <span style={{ color: "#a0a0b8", fontSize: 12 }}>
                  {item.percentage}% ({item.count.toLocaleString()})
                </span>
              </div>
              <div
                style={{
                  background: "#1e1e2e",
                  borderRadius: 4,
                  height: 8,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${item.percentage}%`,
                    height: "100%",
                    background: COLORS[i % COLORS.length],
                    borderRadius: 4,
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
