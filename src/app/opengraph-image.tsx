import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SiteIQ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial Black, Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "18px",
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "52px",
              fontWeight: 900,
              color: "white",
            }}
          >
            S
          </div>
          <div
            style={{
              fontSize: "72px",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-2px",
            }}
          >
            SiteIQ
          </div>
        </div>
        <div
          style={{
            fontSize: "30px",
            color: "rgba(255,255,255,0.85)",
            letterSpacing: "0.5px",
          }}
        >
          See your website through your customer&apos;s eyes
        </div>
      </div>
    ),
    size
  );
}
