import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { NotiToast } from "../../components/Toast";
import { Caption } from "../../components/Caption";

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgFade = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const titleT = spring({ frame: frame - 6, fps, config: { damping: 22, stiffness: 150 } });
  const titleY = interpolate(titleT, [0, 1], [40, 0]);

  const toastT = spring({ frame: frame - 40, fps, config: { damping: 14, stiffness: 160 } });
  const toastX = interpolate(toastT, [0, 1], [-80, 0]);

  // Subtle floating
  const float = Math.sin(frame / 18) * 4;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 30% 20%, ${colors.navy} 0%, ${colors.navyDeep} 60%, #050B1E 100%)`,
        fontFamily: fonts.body,
        color: "white",
        overflow: "hidden",
      }}
    >
      {/* Decorative gradient blobs */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: 999,
          background: `radial-gradient(circle, ${colors.sky}33 0%, transparent 70%)`,
          top: -200,
          right: -150,
          opacity: bgFade,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: 999,
          background: `radial-gradient(circle, ${colors.sky}22 0%, transparent 70%)`,
          bottom: -200,
          left: -100,
          opacity: bgFade,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: titleT,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 18,
            letterSpacing: 6,
            color: colors.skySoft,
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          NotiProof · For Business Owners
        </div>
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 96,
            fontWeight: 700,
            lineHeight: 1.05,
            textAlign: "center",
            maxWidth: 1400,
          }}
        >
          Turn real activity into{" "}
          <span style={{ color: colors.sky }}>live social proof</span>.
        </div>
        <div
          style={{
            fontSize: 26,
            color: "#CBD5E1",
            marginTop: 28,
            maxWidth: 900,
            textAlign: "center",
          }}
        >
          From signup to live notifications on your site in about five minutes.
        </div>
      </div>

      {/* Floating toast */}
      <div
        style={{
          position: "absolute",
          bottom: 180,
          left: 120,
          transform: `translateX(${toastX}px) translateY(${float}px)`,
          opacity: toastT,
        }}
      >
        <NotiToast name="Sarah from London" action="just bought Premium plan" time="2 min ago" />
      </div>
    </AbsoluteFill>
  );
};

export const SCENE1_HOOK_DURATION = 321;
