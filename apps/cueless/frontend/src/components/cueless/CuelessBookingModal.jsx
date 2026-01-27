import React, { useState, useEffect, useRef } from 'react';

const CuelessBookingModal = ({ open, onClose, children, title }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset position when modal opens
  useEffect(() => {
    if (open) {
      setDrag({ x: 0, y: 0 });
    }
  }, [open]);

  const onMouseDown = (e) => {
    if (isMobile) return;
    setDragging(true);
    dragStart.current = {
      x: e.clientX - drag.x,
      y: e.clientY - drag.y,
    };
    document.body.style.userSelect = "none";
  };

  const onMouseMove = (e) => {
    if (!dragging || isMobile) return;
    setDrag({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const onMouseUp = () => {
    setDragging(false);
    document.body.style.userSelect = "";
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    } else {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging]);

  if (!open) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "10px" : "40px",
        zIndex: 1000,
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)"
      }}
    >
      <div
        style={{
          transform: isMobile ? "translate(0px, 0px)" : `translate(${drag.x}px, ${drag.y}px)`,
          cursor: dragging ? "grabbing" : "default",
          background: "linear-gradient(135deg, #000000 0%, #0a192f 100%)",
          color: "#fff",
          border: "2px solid #00ff41",
          borderRadius: isMobile ? "0.5rem" : "1.2rem",
          boxShadow: "0 0 32px #00ff41, 0 0 40px rgba(0,0,0,0.85)",
          width: isMobile ? "95vw" : "650px",
          maxWidth: isMobile ? "95vw" : "650px",
          minWidth: isMobile ? "280px" : "400px",
          margin: "0 auto",
          animation: "modalBounceIn 0.5s cubic-bezier(.21,1.02,.73,1.01)",
          padding: 0,
          position: "relative",
          fontFamily: "inherit",
          boxSizing: "border-box",
          textAlign: "center",
          height: "800px",
          maxHeight: "500px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column"
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        {/* Header */}
        <div
          onMouseDown={onMouseDown}
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            background: "#00ff41",
            padding: isMobile ? "0.3rem 0.5rem" : "0.4rem 0.6rem",
            borderTopLeftRadius: isMobile ? "0.5rem" : "1.2rem",
            borderTopRightRadius: isMobile ? "0.5rem" : "1.2rem",
            position: "relative",
            cursor: isMobile ? "default" : "grab",
            userSelect: "none",
            gap: isMobile ? "0.3rem" : "0.4rem"
          }}
        >
          <h2 
            style={{
              margin: 0,
              fontSize: isMobile ? "1.1rem" : "1.3rem",
              fontWeight: "bold",
              textAlign: "center",
              letterSpacing: "0.02em",
              textShadow: "0 1px 12px #000a",
              zIndex: 2,
              flex: 1,
              wordBreak: "break-word",
              minWidth: 0,
              color: "#fff"
            }}
          >
            {title}
          </h2>
          <button 
            onClick={onClose} 
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: isMobile ? "1.2em" : "1.5em",
              fontWeight: "bold",
              cursor: "pointer",
              zIndex: 10,
              alignSelf: "flex-start",
              marginTop: "0",
              lineHeight: 1,
              transition: "color 0.2s, transform 0.2s",
              padding: 0,
              marginLeft: "1rem"
            }}
            onMouseEnter={(e) => {
              e.target.style.color = "#000000";
              e.target.style.transform = "scale(1.2) rotate(10deg)";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "#fff";
              e.target.style.transform = "scale(1) rotate(0deg)";
            }}
          >
            &times;
          </button>
        </div>

        {/* Modal content - NO PADDING */}
        <div 
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            padding: 0,
            background: "none"
          }}
        >
          {children}
        </div>
      </div>

      <style>{`
        @keyframes modalBounceIn {
          0% { opacity: 0; transform: scale(0.95) translateY(-40px);}
          70% { opacity: 1; transform: scale(1.02) translateY(8px);}
          100% { opacity: 1; transform: scale(1) translateY(0);}
        }
      `}</style>
    </div>
  );
};

export default CuelessBookingModal;
