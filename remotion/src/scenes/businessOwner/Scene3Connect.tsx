import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserChrome } from "../../components/BrowserChrome";
import { Caption } from "../../components/Caption";

const PROVIDERS = [
  { name: "Shopify", color: "#95BF47" },
  { name: "WooCommerce", color: "#7F54B3" },
  { name: "Google Reviews", color: "#4285F4" },
  { name: "Trustpilot", color: "#00B67A" },
  { name: "G2", color: "#FF492C" },
  { name: "Zapier", color: "#FF4A00" },
];

export const Scene3Connect: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterT = spring({ frame, fps, config: { damping: 22, stiffness: 140 } });
  const y = interpolate(enterT, [0, 1], [60, 0]);

  // Highlight Shopify around frame 60, then show "Connected" check
  const highlight = interpolate(frame, [55, 65, 90], [0, 1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const checkT = spring({
    frame: frame - 95,
    fps,
    config: { damping: 14, stiffness: 180 },
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
        <BrowserChrome url="app.notiproof.com/onboarding/connect">
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
              ONB-01 · Step 1 of 3
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 44,
                fontWeight: 700,
                color: colors.ink,
                marginBottom: 12,
              }}
            >
              Connect a data source
            </div>
            <div style={{ fontSize: 17, color: colors.inkSoft, marginBottom: 40, maxWidth: 720 }}>
              Pick where your customer activity lives. We'll import orders and reviews automatically.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 20,
              }}
            >
              {PROVIDERS.map((p, i) => {
                const cardT = spring({
                  frame: frame - (10 + i * 5),
                  fps,
                  config: { damping: 18, stiffness: 160 },
                });
                const isShopify = p.name === "Shopify";
                const ring = isShopify ? highlight : 0;
                const shopifyConnected = isShopify ? checkT : 0;

                return (
                  <div
                    key={p.name}
                    style={{
                      background: colors.card,
                      borderRadius: 14,
                      padding: 24,
                      border: `2px solid ${ring > 0 ? colors.sky : colors.border}`,
                      boxShadow: ring > 0 ? `0 0 0 4px ${colors.sky}33` : "0 1px 3px rgba(0,0,0,0.04)",
                      opacity: cardT,
                      transform: `translateY(${interpolate(cardT, [0, 1], [20, 0])}px) scale(${1 + ring * 0.02})`,
                      position: "relative",
                      minHeight: 140,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        background: p.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: 700,
                        fontFamily: fonts.display,
                        fontSize: 22,
                      }}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: colors.ink }}>{p.name}</div>
                      <div style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                        {isShopify ? "OAuth · 1 click" : p.name === "WooCommerce" ? "REST API keys" : "Native sync"}
                      </div>
                    </div>
                    {shopifyConnected > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: 18,
                          right: 18,
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          background: colors.success,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontWeight: 700,
                          transform: `scale(${shopifyConnected})`,
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </BrowserChrome>
      </div>

      <Caption tag="Step 1" text="Connect Shopify, WooCommerce, Google Reviews, and more." />
    </AbsoluteFill>
  );
};

export const SCENE3_CONNECT_DURATION = 396;
