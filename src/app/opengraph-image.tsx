import { ImageResponse } from "next/og";
import { wedding } from "@/config/wedding";

export const alt = "Thiệp mời đám cưới";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#fbf8f4",
          color: "#59463f",
          fontFamily: "serif",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 12, color: "#a2796c" }}>TRÂN TRỌNG KÍNH MỜI</div>
        <div style={{ fontSize: 82, marginTop: 36 }}>{`${wedding.bride} & ${wedding.groom}`}</div>
        <div style={{ fontSize: 28, marginTop: 32 }}>{wedding.dateLabel}</div>
        <div style={{ width: 90, height: 2, background: "#c89f91", marginTop: 32 }} />
      </div>
    ),
    size,
  );
}
