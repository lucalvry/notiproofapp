import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// A simple fake cursor that travels from (fromX, fromY) to (toX, toY) and "clicks"
// at clickFrame. All coordinates are absolute % of the scene container.
export const FakeCursor: React.FC<{
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  travelStart?: number;
  travelDuration?: number;
  clickFrame?: number;
}> = ({ fromX, fromY, toX, toY, travelStart = 0, travelDuration = 18, clickFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const t = spring({
    frame: frame - travelStart,
    fps,
    config: { damping: 22, stiffness: 140, mass: 0.7 },
  });

  const x = interpolate(t, [0, 1], [fromX, toX]);
  const y = interpolate(t, [0, 1], [fromY, toY]);

  const clickPulse =
    clickFrame !== undefined
      ? interpolate(frame, [clickFrame, clickFrame + 6, clickFrame + 16], [0, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  return (
    <>
      {/* Click ring */}
      <div
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          transform: `translate(-50%, -50%) scale(${1 + clickPulse * 2.2})`,
          width: 40,
          height: 40,
          borderRadius: 999,
          border: `2px solid rgba(14,165,233,${0.85 - clickPulse * 0.85})`,
          pointerEvents: "none",
        }}
      />
      {/* Cursor */}
      <svg
        width="34"
        height="34"
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          transform: "translate(-2px, -2px)",
          filter: "drop-shadow(0 4px 8px rgba(15,23,42,0.35))",
          pointerEvents: "none",
        }}
      >
        <path d="M3 2 L3 20 L8 15 L11.5 22 L14 21 L10.5 14 L17 14 Z" fill="white" stroke="#0F172A" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    </>
  );
};
