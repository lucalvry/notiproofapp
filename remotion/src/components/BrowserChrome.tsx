import React from "react";
import { Img, staticFile } from "remotion";
import { colors, fonts } from "../theme";

export const BrowserChrome: React.FC<{
  url: string;
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  favicon?: string | null;
}> = ({ url, children, width = "100%", height = "100%", favicon = staticFile("logo.png") }) => {
  return (
    <div
      style={{
        width,
        height,
        background: colors.card,
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 30px 80px -20px rgba(15,52,96,0.35), 0 8px 24px -8px rgba(15,52,96,0.2)",
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${colors.border}`,
      }}
    >
      <div
        style={{
          height: 44,
          background: "#F1F5F9",
          borderBottom: `1px solid ${colors.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 18px",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: 6, background: "#FB7185" }} />
          <span style={{ width: 12, height: 12, borderRadius: 6, background: "#FBBF24" }} />
          <span style={{ width: 12, height: 12, borderRadius: 6, background: "#34D399" }} />
        </div>
        <div
          style={{
            flex: 1,
            height: 26,
            background: "#FFFFFF",
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 12px",
            fontFamily: fonts.body,
            fontSize: 13,
            color: colors.inkSoft,
          }}
        >
          {favicon && (
            <Img src={favicon} style={{ width: 14, height: 14, objectFit: "contain" }} />
          )}
          <span>{url}</span>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden", background: colors.bg }}>{children}</div>
    </div>
  );
};
