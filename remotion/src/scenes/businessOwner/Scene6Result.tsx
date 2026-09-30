import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserChrome } from "../../components/BrowserChrome";
import { NotiToast } from "../../components/Toast";
import { Caption } from "../../components/Caption";

const FEED = [
  { name: "Mia", action: "left a 5★ review", time: "just now", appearAt: 20 },
  { name: "Daniel", action: "bought Espresso bundle", time: "1 min ago", appearAt: 55 },
  { name: "Priya", action: "signed up for newsletter", time: "3 min ago", appearAt: 90 },
];

const TOASTS = [
  { name: "Mia", action: "left a 5★ review", time: "just now", appearAt: 25 },
  { name: "Daniel", action: "bought Espresso bundle", time: "1 min ago", appearAt: 60 },
  { name: "Priya", action: "signed up", time: "3 min ago", appearAt: 95 },
];

export const Scene6Result: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enterT = spring({ frame, fps, config: { damping: 22, stiffness: 140 } });
  const y = interpolate(enterT, [0, 1], [60, 0]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${colors.bg} 0%, #E0F2FE 100%)`,
        padding: 60,
        fontFamily: fonts.body,
        display: "flex",
        gap: 32,
      }}
    >
      {/* Left: Dashboard */}
      <div style={{ flex: 1, opacity: enterT, transform: `translateY(${y}px)` }}>
        <BrowserChrome url="app.notiproof.com/dashboard">
          <div style={{ padding: "40px 44px" }}>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                color: colors.muted,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              DASH-01
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 32,
                fontWeight: 700,
                color: colors.ink,
                marginTop: 4,
                marginBottom: 6,
              }}
            >
              Welcome back, Alex
            </div>
            <div style={{ fontSize: 14, color: colors.inkSoft, marginBottom: 24 }}>
              Live activity from your connected sources.
            </div>

            <div
              style={{
                background: colors.card,
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: colors.muted, marginBottom: 12, letterSpacing: 1, textTransform: "uppercase" }}>
                Proof feed
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {FEED.map((f, i) => {
                  const t = spring({ frame: frame - f.appearAt, fps, config: { damping: 18, stiffness: 200 } });
                  const ty = interpolate(t, [0, 1], [16, 0]);
                  return (
                    <div
                      key={i}
                      style={{
                        opacity: t,
                        transform: `translateY(${ty}px)`,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: 12,
                        borderRadius: 10,
                        background: colors.bg,
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          background: `linear-gradient(135deg, ${colors.sky}, ${colors.navy})`,
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                        }}
                      >
                        {f.name.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, color: colors.ink, fontWeight: 600 }}>
                          {f.name} <span style={{ fontWeight: 400, color: colors.inkSoft }}>{f.action}</span>
                        </div>
                        <div style={{ fontSize: 11, color: colors.muted }}>{f.time}</div>
                      </div>
                      <div
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          background: colors.successSoft,
                          color: colors.success,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        approved
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </BrowserChrome>
      </div>

      {/* Right: Fake storefront */}
      <div style={{ flex: 1, opacity: enterT, transform: `translateY(${y}px)`, position: "relative" }}>
        <BrowserChrome url="acmecoffee.com">
          <div
            style={{
              padding: 40,
              height: "100%",
              background: "linear-gradient(180deg, #FEF3C7 0%, #FCD34D33 100%)",
              position: "relative",
            }}
          >
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 28,
                fontWeight: 700,
                color: "#78350F",
                marginBottom: 8,
              }}
            >
              Acme Coffee Co.
            </div>
            <div style={{ fontSize: 14, color: "#92400E", marginBottom: 30 }}>
              Small-batch espresso, shipped fresh.
            </div>
            <div
              style={{
                width: "100%",
                height: 180,
                background: "#FEF3C7",
                borderRadius: 12,
                border: "1px dashed #FCD34D",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#92400E",
                fontSize: 14,
              }}
            >
              [ product grid ]
            </div>
            <div
              style={{
                width: "60%",
                height: 50,
                background: "#78350F",
                color: "white",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
            >
              Shop now
            </div>

            {/* Stacked toasts at bottom-left */}
            <div style={{ position: "absolute", bottom: 24, left: 24, display: "flex", flexDirection: "column", gap: 10 }}>
              {TOASTS.map((t, i) => {
                const tt = spring({ frame: frame - t.appearAt, fps, config: { damping: 14, stiffness: 160 } });
                const tx = interpolate(tt, [0, 1], [-60, 0]);
                // fade out older toasts
                const fadeOut = interpolate(frame, [t.appearAt + 60, t.appearAt + 90], [1, i === TOASTS.length - 1 ? 1 : 0.2], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                return (
                  <div key={i} style={{ opacity: tt * fadeOut, transform: `translateX(${tx}px)` }}>
                    <NotiToast name={t.name} action={t.action} time={t.time} />
                  </div>
                );
              })}
            </div>
          </div>
        </BrowserChrome>
      </div>

      <Caption tag="The result" text="Real activity → live notifications on your site, in real time." />
    </AbsoluteFill>
  );
};

export const SCENE6_RESULT_DURATION = 302;
