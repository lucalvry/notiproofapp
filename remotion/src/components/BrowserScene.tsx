import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { BrowserChrome } from "./BrowserChrome";

export const BrowserScene: React.FC<{
  url: string;
  tag?: string;
  heading: string;
  subtitle?: string;
  bg?: string;
  children: React.ReactNode;
}> = ({ url, tag, heading, subtitle, bg, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enterT = spring({ frame, fps, config: { damping: 22, stiffness: 140 } });
  const y = interpolate(enterT, [0, 1], [50, 0]);

  return (
    <AbsoluteFill
      style={{
        background: bg ?? `linear-gradient(135deg, ${colors.bg} 0%, #E0F2FE 100%)`,
        padding: 80,
        fontFamily: fonts.body,
      }}
    >
      <div style={{ width: "100%", height: "100%", opacity: enterT, transform: `translateY(${y}px)` }}>
        <BrowserChrome url={url}>
          <div style={{ padding: "48px 72px", height: "100%", overflow: "hidden" }}>
            {tag && (
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 13,
                  color: colors.muted,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {tag}
              </div>
            )}
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 44,
                fontWeight: 700,
                color: colors.ink,
                marginBottom: subtitle ? 10 : 28,
              }}
            >
              {heading}
            </div>
            {subtitle && (
              <div style={{ fontSize: 17, color: colors.inkSoft, marginBottom: 32, maxWidth: 820 }}>
                {subtitle}
              </div>
            )}
            {children}
          </div>
        </BrowserChrome>
      </div>
    </AbsoluteFill>
  );
};

export const HookScene: React.FC<{
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
  accentNode?: React.ReactNode;
}> = ({ eyebrow, title, subtitle, accentNode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - 6, fps, config: { damping: 22, stiffness: 150 } });
  const y = interpolate(t, [0, 1], [40, 0]);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 30% 20%, ${colors.navy} 0%, ${colors.navyDeep} 60%, #050B1E 100%)`,
        fontFamily: fonts.body,
        color: "white",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute", width: 600, height: 600, borderRadius: 999,
          background: `radial-gradient(circle, ${colors.sky}33 0%, transparent 70%)`,
          top: -200, right: -150,
        }}
      />
      <div
        style={{
          position: "absolute", width: 500, height: 500, borderRadius: 999,
          background: `radial-gradient(circle, ${colors.sky}22 0%, transparent 70%)`,
          bottom: -200, left: -100,
        }}
      />
      <div
        style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: 80,
          opacity: t, transform: `translateY(${y}px)`,
        }}
      >
        <div
          style={{
            fontFamily: fonts.display, fontSize: 18, letterSpacing: 6,
            color: colors.skySoft, textTransform: "uppercase", marginBottom: 24,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontFamily: fonts.display, fontSize: 92, fontWeight: 700,
            lineHeight: 1.05, textAlign: "center", maxWidth: 1500,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 26, color: "#CBD5E1", marginTop: 28, maxWidth: 1000, textAlign: "center" }}>
            {subtitle}
          </div>
        )}
        {accentNode && <div style={{ marginTop: 44 }}>{accentNode}</div>}
      </div>
    </AbsoluteFill>
  );
};
