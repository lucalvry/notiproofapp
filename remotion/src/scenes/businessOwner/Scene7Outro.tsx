import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserChrome } from "../../components/BrowserChrome";
import { LogoLockup } from "../../components/LogoLockup";


const STATS = [
  { label: "Impressions", value: 24890, suffix: "" },
  { label: "CTR", value: 4.7, suffix: "%" },
  { label: "Assisted conversions", value: 312, suffix: "" },
];

export const Scene7Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enterT = spring({ frame, fps, config: { damping: 22, stiffness: 140 } });
  const y = interpolate(enterT, [0, 1], [60, 0]);

  // Logo fades up at end
  const logoT = spring({ frame: frame - 100, fps, config: { damping: 18, stiffness: 160 } });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyDeep} 100%)`,
        padding: 80,
        fontFamily: fonts.body,
        color: "white",
      }}
    >
      <div style={{ width: "100%", height: "100%", opacity: enterT, transform: `translateY(${y}px)`, position: "relative" }}>
        <BrowserChrome url="app.notiproof.com/analytics">
          <div style={{ padding: "56px 80px" }}>
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
              ANA-01
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 44,
                fontWeight: 700,
                color: colors.ink,
                marginBottom: 36,
              }}
            >
              Analytics
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
              {STATS.map((s, i) => {
                const t = spring({ frame: frame - (10 + i * 12), fps, config: { damping: 18, stiffness: 160 } });
                const value = s.value * interpolate(t, [0, 1], [0, 1]);
                const display =
                  s.suffix === "%" ? value.toFixed(1) : Math.round(value).toLocaleString();
                return (
                  <div
                    key={s.label}
                    style={{
                      background: colors.card,
                      borderRadius: 16,
                      padding: 28,
                      border: `1px solid ${colors.border}`,
                      opacity: t,
                      transform: `translateY(${interpolate(t, [0, 1], [20, 0])}px)`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        color: colors.muted,
                        textTransform: "uppercase",
                        letterSpacing: 1.5,
                        fontWeight: 600,
                      }}
                    >
                      {s.label}
                    </div>
                    <div
                      style={{
                        fontFamily: fonts.display,
                        fontSize: 56,
                        fontWeight: 700,
                        color: colors.ink,
                        marginTop: 8,
                      }}
                    >
                      {display}
                      {s.suffix}
                    </div>
                    {/* Sparkline */}
                    <Sparkline frame={frame - (10 + i * 12)} color={colors.sky} />
                  </div>
                );
              })}
            </div>
          </div>
        </BrowserChrome>

        {/* Logo overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: 60,
            opacity: logoT,
            transform: `translateY(${interpolate(logoT, [0, 1], [20, 0])}px)`,
          }}
        >
          <div
            style={{
              padding: "16px 30px",
              borderRadius: 14,
              background: "rgba(15,23,42,0.92)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <LogoLockup size={36} color="white" gap={14} />
          </div>

        </div>
      </div>
    </AbsoluteFill>
  );
};

const Sparkline: React.FC<{ frame: number; color: string }> = ({ frame, color }) => {
  const points = [20, 28, 22, 35, 30, 45, 40, 55, 50, 62];
  const max = 70;
  const w = 200;
  const h = 50;
  const reveal = interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const visiblePoints = points.slice(0, Math.ceil(points.length * reveal) || 1);
  const path = visiblePoints
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - (p / max) * h;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} style={{ marginTop: 16 }}>
      <path d={path} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const SCENE7_OUTRO_DURATION = 299;
