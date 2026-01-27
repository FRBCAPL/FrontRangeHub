import React, { useRef, useEffect, useState } from "react";

export default function ResponsiveWrapper({ aspectWidth, aspectHeight, children }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.6);

  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const newScale = Math.min(width / aspectWidth, height / aspectHeight);
      setScale(newScale);
    }
  }, [aspectWidth, aspectHeight]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "visible",
        contain: "layout style paint"
      }}
    >
      <div
        style={{
          width: aspectWidth,
          height: aspectHeight,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
          position: "absolute",
          top: "50%",
          left: "50%",
          pointerEvents: "none"
        }}
      >
        {children}
      </div>
    </div>
  );
}
