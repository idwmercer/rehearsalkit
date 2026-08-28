import { fmFetch } from "@proofkit/webviewer";
import { useEffect, useRef, useState } from "react";

import logo from "../assets/RKLogoDark.png";

const isWebDirect = window.location.protocol === "blob:";

// FileMaker closes the file on this call; if the WebViewer is already tearing
// down the promise can reject — nothing to do about it, so swallow it.
const closeFileQuietly = async () => {
  try {
    await fmFetch("CloseFile", {});
  } catch {
    // window is closing regardless
  }
};

export const LogoutPage = () => {
  const [curtainClosed, setCurtainClosed] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showGoodbye, setShowGoodbye] = useState(false);
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) {
      return;
    }
    didRun.current = true;

    const t1 = setTimeout(() => setShowGoodbye(true), 200);
    const t2 = setTimeout(() => setCurtainClosed(true), 600);

    if (isWebDirect) {
      const t3 = setTimeout(() => setShowMessage(true), 1800);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }

    const t3 = setTimeout(() => {
      void closeFileQuietly();
    }, 3800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div
      style={{
        alignItems: "center",
        background: "#000",
        display: "flex",
        inset: 0,
        justifyContent: "center",
        overflow: "hidden",
        position: "fixed",
      }}
    >
      {/* Splash screen content */}
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          textAlign: "center",
          zIndex: 1,
        }}
      >
        <img
          src={logo}
          alt="RehearsalKit"
          style={{ marginBottom: "60px", objectFit: "contain", width: "280px" }}
        />
        <div
          style={{
            color: "white",
            fontSize: "15px",
            fontWeight: 700,
            marginBottom: "12px",
          }}
        >
          Brought to you by Informing Designs, LLC
        </div>
        <div style={{ color: "#888", fontSize: "13px", marginBottom: "24px" }}>
          support@informingdesigns.com
        </div>
        <div
          style={{
            color: "#f5c518",
            fontFamily: "Georgia, serif",
            fontSize: "30px",
            fontStyle: "italic",
            fontWeight: 300,
            letterSpacing: "0.1em",
            opacity: showGoodbye ? 1 : 0,
            transition: "opacity 0.6s ease",
          }}
        >
          Goodbye
        </div>
      </div>

      {/* Left curtain */}
      <div
        style={{
          bottom: 0,
          left: 0,
          position: "absolute",
          top: 0,
          transform: curtainClosed ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 1.2s cubic-bezier(0.76, 0, 0.24, 1)",
          width: "55%",
          zIndex: 10,
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 330 800"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="lgl" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4a0e0e" />
              <stop offset="50%" stopColor="#7a1a1a" />
              <stop offset="85%" stopColor="#6b1515" />
              <stop offset="100%" stopColor="#3d0c0c" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="330" height="800" fill="url(#lgl)" />
          <rect x="0" y="0" width="330" height="10" fill="#2a0606" />
          <path
            d="M55,0 Q35,400 55,800 L75,800 Q55,400 75,0 Z"
            fill="#3a0a0a"
            opacity="0.5"
          />
          <path
            d="M130,0 Q110,400 130,800 L150,800 Q130,400 150,0 Z"
            fill="#8b2020"
            opacity="0.3"
          />
          <path
            d="M205,0 Q185,400 205,800 L225,800 Q205,400 225,0 Z"
            fill="#3a0a0a"
            opacity="0.5"
          />
          <path
            d="M280,0 Q260,400 280,800 L300,800 Q280,400 300,0 Z"
            fill="#8b2020"
            opacity="0.3"
          />
        </svg>
      </div>

      {/* Right curtain */}
      <div
        style={{
          bottom: 0,
          position: "absolute",
          right: 0,
          top: 0,
          transform: curtainClosed ? "translateX(0)" : "translateX(100%)",
          transition: "transform 1.2s cubic-bezier(0.76, 0, 0.24, 1)",
          width: "55%",
          zIndex: 10,
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 330 800"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="lgr" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#4a0e0e" />
              <stop offset="50%" stopColor="#7a1a1a" />
              <stop offset="85%" stopColor="#6b1515" />
              <stop offset="100%" stopColor="#3d0c0c" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="330" height="800" fill="url(#lgr)" />
          <rect x="0" y="0" width="330" height="10" fill="#2a0606" />
          <path
            d="M275,0 Q295,400 275,800 L255,800 Q275,400 255,0 Z"
            fill="#3a0a0a"
            opacity="0.5"
          />
          <path
            d="M200,0 Q220,400 200,800 L180,800 Q200,400 180,0 Z"
            fill="#8b2020"
            opacity="0.3"
          />
          <path
            d="M125,0 Q145,400 125,800 L105,800 Q125,400 105,0 Z"
            fill="#3a0a0a"
            opacity="0.5"
          />
          <path
            d="M50,0 Q70,400 50,800 L30,800 Q50,400 30,0 Z"
            fill="#8b2020"
            opacity="0.3"
          />
        </svg>
      </div>

      {/* WebDirect message */}
      {isWebDirect && (
        <div
          style={{
            alignItems: "center",
            color: "#c4a97a",
            display: "flex",
            flexDirection: "column",
            fontSize: "14px",
            gap: "10px",
            left: "50%",
            letterSpacing: "0.06em",
            opacity: showMessage ? 1 : 0,
            padding: "32px 24px",
            position: "absolute",
            textAlign: "center",
            top: "50%",
            transform: "translate(-50%, -50%)",
            transition: "opacity 0.8s ease",
            whiteSpace: "nowrap",
            zIndex: 20,
          }}
        >
          <span>You may close your browser or tab.</span>
          <button
            type="button"
            onClick={() => window.top?.location.reload()}
            style={{
              background: "transparent",
              border: "1px solid rgba(196,169,122,0.6)",
              borderRadius: "8px",
              color: "#c4a97a",
              cursor: "pointer",
              fontSize: "14px",
              letterSpacing: "0.05em",
              marginTop: "6px",
              padding: "9px 28px",
            }}
          >
            Log back in
          </button>
        </div>
      )}
    </div>
  );
};
