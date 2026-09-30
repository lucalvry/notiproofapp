import React from "react";
import { colors, fonts } from "../theme";

export const NotiToast: React.FC<{
  name: string;
  action: string;
  time: string;
}> = ({ name, action, time }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 18px",
        background: colors.card,
        borderRadius: 14,
        boxShadow: "0 18px 40px -12px rgba(15,52,96,0.35)",
        border: `1px solid ${colors.border}`,
        fontFamily: fonts.body,
        minWidth: 360,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          background: `linear-gradient(135deg, ${colors.sky}, ${colors.navy})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 700,
          fontFamily: fonts.display,
        }}
      >
        {name.charAt(0)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, color: colors.ink, fontWeight: 600 }}>
          {name} <span style={{ fontWeight: 400, color: colors.inkSoft }}>{action}</span>
        </div>
        <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{time}</div>
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: colors.navy,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          opacity: 0.5,
        }}
      >
        NotiProof
      </div>
    </div>
  );
};
