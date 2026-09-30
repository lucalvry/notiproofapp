import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";

export const Caption: React.FC<{ tag?: string; text: string }> = ({ tag, text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame, fps, config: { damping: 22, stiffness: 140 } });
  const y = interpolate(t, [0, 1], [40, 0]);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 70,
        display: "flex",
        justifyContent: "center",
        opacity: t,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          padding: "18px 30px",
          background: "rgba(15,23,42,0.88)",
          borderRadius: 14,
          fontFamily: fonts.body,
          color: "white",
          fontSize: 28,
          lineHeight: 1.4,
          textAlign: "center",
          backdropFilter: undefined,
        }}
      >
        {tag && (
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 12,
              letterSpacing: 2,
              color: colors.skySoft,
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            {tag}
          </div>
        )}
        {text}
      </div>
    </div>
  );
};
