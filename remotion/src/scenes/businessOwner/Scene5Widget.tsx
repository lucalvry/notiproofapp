import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserChrome } from "../../components/BrowserChrome";
import { Caption } from "../../components/Caption";

const TYPES = [
  { label: "Floating", desc: "Toast in the corner" },
  { label: "Inline", desc: "Embedded on a page" },
  { label: "Badge", desc: "Trust marker for footer" },
];

export const Scene5Widget: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enterT = spring({ frame, fps, config: { damping: 22, stiffness: 140 } });
  const y = interpolate(enterT, [0, 1], [60, 0]);

  const selectFrame = 70;
  const clickFrame = 105;
  const selectT = spring({ frame: frame - selectFrame, fps, config: { damping: 18, stiffness: 180 } });
  const clickPulse = interpolate(frame, [clickFrame, clickFrame + 6, clickFrame + 16], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${colors.bg} 0%, #E0F2FE 100%)`,
        padding: 80,
        fontFamily: fonts.body,
      }}
    >
      <div style={{ width: "100%", height: "100%", opacity: enterT, transform: `translateY(${y}px)` }}>
        <BrowserChrome url="app.notiproof.com/onboarding/preview">
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
              ONB-03 · Step 3 of 3
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 44,
                fontWeight: 700,
                color: colors.ink,
                marginBottom: 28,
              }}
            >
              Preview your first widget
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
              {TYPES.map((t, i) => {
                const cardT = spring({
                  frame: frame - (10 + i * 10),
                  fps,
                  config: { damping: 18, stiffness: 160 },
                });
                const isSelected = i === 0;
                const ring = isSelected ? selectT : 0;

                return (
                  <div
                    key={t.label}
                    style={{
                      background: colors.card,
                      borderRadius: 14,
                      padding: 24,
                      border: `2px solid ${ring > 0 ? colors.sky : colors.border}`,
                      boxShadow: ring > 0 ? `0 0 0 4px ${colors.sky}33` : "0 1px 3px rgba(0,0,0,0.04)",
                      opacity: cardT,
                      transform: `translateY(${interpolate(cardT, [0, 1], [20, 0])}px)`,
                      minHeight: 200,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {/* Mini preview */}
                    <div
                      style={{
                        flex: 1,
                        borderRadius: 10,
                        background: colors.bg,
                        marginBottom: 16,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {i === 0 && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 10,
                            left: 10,
                            background: colors.card,
                            borderRadius: 8,
                            padding: "6px 10px",
                            fontSize: 10,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            color: colors.ink,
                          }}
                        >
                          🔔 Sarah just signed up
                        </div>
                      )}
                      {i === 1 && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 12,
                            background: colors.card,
                            borderRadius: 8,
                            padding: 10,
                            fontSize: 10,
                            color: colors.inkSoft,
                          }}
                        >
                          ★★★★★ "Best coffee I've had." — Mia
                        </div>
                      )}
                      {i === 2 && (
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%,-50%)",
                            padding: "10px 14px",
                            background: colors.navy,
                            color: "white",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          ✓ Trusted by 2,400+
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: colors.ink }}>{t.label}</div>
                    <div style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>{t.desc}</div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 32,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <div
                style={{
                  height: 56,
                  padding: "0 32px",
                  borderRadius: 12,
                  background: colors.navy,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  fontWeight: 600,
                  fontSize: 17,
                  boxShadow: clickPulse > 0 ? `0 0 0 4px ${colors.sky}55` : "0 8px 20px rgba(15,52,96,0.25)",
                  transform: `scale(${1 + clickPulse * 0.04})`,
                }}
              >
                Create widget →
              </div>
            </div>
          </div>
        </BrowserChrome>
      </div>

      <Caption tag="Step 3" text="Floating, Inline, or Badge — pick a style and create your widget." />
    </AbsoluteFill>
  );
};

export const SCENE5_WIDGET_DURATION = 272;
