import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../../theme";
import { BrowserScene } from "../../components/BrowserScene";

export const AgyScene4AddClient: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nameT = spring({ frame: frame - 25, fps, config: { damping: 22, stiffness: 140 } });
  const indT = spring({ frame: frame - 55, fps, config: { damping: 22, stiffness: 140 } });
  const emailT = spring({ frame: frame - 80, fps, config: { damping: 22, stiffness: 140 } });
  const toastT = spring({ frame: frame - 150, fps, config: { damping: 14, stiffness: 200 } });

  const name = "Fernwood Bakery";
  const ind = "Food & Beverage";
  const email = "ops@fernwoodbakery.com";

  const typed = (text: string, t: number) => text.slice(0, Math.floor(text.length * t));

  return (
    <BrowserScene
      url="app.notiproof.com/agency/clients/new"
      tag="AGY · Add Client"
      heading="Add client"
      subtitle="One click. NotiProof spins up the workspace and emails the invite."
    >
      <div style={{ maxWidth: 620, position: "relative" }}>
        {[
          { label: "Client name", value: typed(name, nameT), active: nameT < 1 },
          { label: "Industry", value: typed(ind, indT), active: indT < 1 && nameT > 0.9 },
          { label: "Contact email", value: typed(email, emailT), active: emailT < 1 && indT > 0.9 },
        ].map((f) => (
          <div key={f.label} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.inkSoft, marginBottom: 8 }}>{f.label}</div>
            <div style={{
              background: colors.card, borderRadius: 10, padding: "14px 16px",
              border: `1.5px solid ${f.active ? colors.sky : colors.border}`,
              fontSize: 16, color: colors.ink, minHeight: 24,
            }}>{f.value}<span style={{ opacity: 0.5 }}>{f.active && f.value.length > 0 ? "▍" : ""}</span></div>
          </div>
        ))}
        <button style={{
          padding: "14px 28px", borderRadius: 10,
          background: `linear-gradient(135deg, ${colors.sky}, ${colors.navy})`,
          color: "white", border: "none", fontSize: 15, fontWeight: 600,
          marginTop: 8, boxShadow: `0 10px 24px -8px ${colors.sky}66`,
        }}>Create client & send invite</button>

        {toastT > 0 && (
          <div style={{
            position: "absolute", top: -30, right: -200,
            background: colors.success, color: "white",
            padding: "14px 20px", borderRadius: 12, fontSize: 14, fontWeight: 600,
            opacity: toastT, transform: `translateX(${interpolate(toastT, [0, 1], [60, 0])}px)`,
            boxShadow: "0 10px 24px -8px rgba(16,185,129,0.4)",
          }}>✓ Invite sent to {email}</div>
        )}
      </div>
    </BrowserScene>
  );
};

export const AGY_SCENE4_DURATION = 270;
