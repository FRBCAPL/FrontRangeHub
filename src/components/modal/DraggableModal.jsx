import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function DraggableModal({ 
  open, 
  onClose, 
  children, 
  title = "Modal",
  maxWidth = "800px",
  maxHeight = null,
  className = "",
  borderColor = "#e53e3e",
  textColor = "#fff",
  glowColor = "#e53e3e",
  style = {},
  zIndex = 100000,
  containerSelector = null // Optional: CSS selector for container to center on (e.g., pool table)
}) {
  // Draggable state
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const dragStart = useRef({ x: 0, y: 0 });

  // Reset position when modal opens
  useEffect(() => {
    if (open) {
      console.log('🎯 Modal opening - resetting drag position to center');
      setDrag({ x: 0, y: 0 });
    }
  }, [open]);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const onMouseDown = (e) => {
    setDragging(true);
    dragStart.current = {
      x: e.clientX - drag.x,
      y: e.clientY - drag.y,
    };
    document.body.style.userSelect = "none";
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
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

  // Find container element if selector provided
  const [containerRect, setContainerRect] = useState(null);
  
  useEffect(() => {
    if (open && containerSelector) {
      const container = document.querySelector(containerSelector);
      if (container) {
        const updateRect = () => {
          const rect = container.getBoundingClientRect();
          setContainerRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          });
        };
        updateRect();
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect, true);
        return () => {
          window.removeEventListener('resize', updateRect);
          window.removeEventListener('scroll', updateRect, true);
        };
      }
    } else {
      setContainerRect(null);
    }
  }, [open, containerSelector]);

  console.log('🔍 DraggableModal: open prop is:', open);
  if (!open) {
    console.log('🔍 DraggableModal: Not rendering because open is false');
    return null;
  }
  console.log('🔍 DraggableModal: Rendering modal because open is true');

  // Calculate position based on container or viewport
  const overlayStyle = containerRect ? {
    position: "fixed",
    top: `${containerRect.top}px`,
    left: `${containerRect.left}px`,
    width: `${containerRect.width}px`,
    height: `${containerRect.height}px`,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: isMobile ? "10px" : "20px",
    zIndex: zIndex,
    backdropFilter: "blur(3px)",
    WebkitBackdropFilter: "blur(3px)"
  } : {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: isMobile ? "10px" : "20px",
    zIndex: zIndex,
    backdropFilter: "blur(3px)",
    WebkitBackdropFilter: "blur(3px)"
  };

  const modalContent = (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={overlayStyle}
    >
      <div
        className={`draggable-modal ${className}`}
        style={{
          transform: window.innerWidth <= 768 ? "translate(-50%, -50%)" : `translate(-50%, -50%) translate(${drag.x}px, ${drag.y}px)`,
          cursor: dragging ? "grabbing" : "default",
          background: "linear-gradient(120deg, #232323 80%, #2a0909 100%)",
          color: "#fff",
          border: `2px solid ${borderColor}`,
          borderRadius: window.innerWidth <= 768 ? "0.5rem" : "1.2rem",
          boxShadow: `0 0 32px ${glowColor}, 0 0 40px rgba(0,0,0,0.85)`,
          width: window.innerWidth <= 768 ? "95vw" : (style.width || "800px") + " !important",
          maxWidth: window.innerWidth <= 768 ? "95vw" : (style.maxWidth || maxWidth),
          minWidth: window.innerWidth <= 768 ? "320px" : "800px",
          maxHeight: window.innerWidth <= 768 ? "90vh" : (style.maxHeight || maxHeight || "90vh"),
          margin: "0",
          left: "50%",
          top: "50%",
          position: "fixed",
          animation: "modalBounceIn 0.5s cubic-bezier(.21,1.02,.73,1.01)",
          padding: 0,
          fontFamily: "inherit",
          boxSizing: "border-box",
          height: style.height || maxHeight || (window.innerWidth <= 768 ? "auto" : "auto"),
          maxHeight: style.maxHeight || maxHeight || "90vh",
          display: "flex",
          flexDirection: "column",
          ...style
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        {/* Draggable header */}
        <div
          className="modal-header"
          onMouseDown={onMouseDown}
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            background: borderColor,
            padding: window.innerWidth <= 768 ? "0.3rem 0.5rem" : "0.4rem 0.6rem",
            borderTopLeftRadius: window.innerWidth <= 768 ? "0.5rem" : "1.2rem",
            borderTopRightRadius: window.innerWidth <= 768 ? "0.5rem" : "1.2rem",
            position: "relative",
            cursor: "grab",
            userSelect: "none",
            gap: window.innerWidth <= 768 ? "0.3rem" : "0.4rem"
          }}
        >
          <span 
            className="modal-accent-bar"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "5px",
              background: `linear-gradient(90deg, #fff0 0%, ${borderColor} 60%, #fff0 100%)`,
              borderTopLeftRadius: window.innerWidth <= 768 ? "0.5rem" : "1.2rem",
              borderTopRightRadius: window.innerWidth <= 768 ? "0.5rem" : "1.2rem",
              pointerEvents: "none"
            }}
          ></span>
          <h2 
            className="modal-title"
            style={{
              margin: 0,
              fontSize: window.innerWidth <= 768 ? "1.1rem" : "1.3rem",
              fontWeight: "bold",
              textAlign: "center",
              letterSpacing: "0.02em",
              textShadow: "0 1px 12px #000a",
              zIndex: 2,
              flex: 1,
              wordBreak: "break-word",
              minWidth: 0,
              color: textColor
            }}
          >
            {typeof title === 'string' ? title : title}
          </h2>
          {/* Close button moved here for flex layout */}
          <button 
            className="modal-close-btn"
            onClick={onClose} 
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: window.innerWidth <= 768 ? "1.2em" : "1.5em",
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
              e.target.style.color = "#ffd6d6";
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

        {/* Modal content */}
        <div 
          className="modal-content"
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            padding: window.innerWidth <= 768 ? "0.6rem 0.8rem 0.4rem 0.8rem" : "0.8rem 1rem 0.6rem 1rem",
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
        
        /* Force content to fill modal width */
        .draggable-modal form,
        .draggable-modal > div,
        .modal-content > * {
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        
        @media (max-width: 768px) {
          .modal-overlay {
            padding: 20px !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .draggable-modal {
            max-width: 95vw !important;
            border-radius: 0.5rem !important;
            height: auto !important;
            max-height: 90vh !important;
            margin: 0 !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            position: fixed !important;
          }
          .modal-header {
            padding: 0.5rem 0.5rem 0.3rem 0.5rem !important;
          }
          .modal-content {
            padding: 0.8rem 0.6rem 0.6rem 0.6rem !important;
            flex: 1 1 auto !important;
            min-height: 0 !important;
            overflow-y: auto !important;
            max-height: calc(90vh - 60px) !important;
          }
        }
        
        @media (max-width: 480px) {
          .modal-overlay {
            padding: 15px !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .draggable-modal {
            max-width: 98vw !important;
            border-radius: 0.3rem !important;
            height: auto !important;
            max-height: 95vh !important;
            margin: 0 !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            position: fixed !important;
          }
          .modal-content {
            max-height: calc(95vh - 50px) !important;
          }
          .modal-header {
            padding: 0.4rem 0.4rem 0.2rem 0.4rem !important;
          }
          .modal-content {
            padding: 0.6rem 0.5rem 0.5rem 0.5rem !important;
          }
        }
        /* Custom scrollbar for modal-content */
        .modal-content::-webkit-scrollbar {
          width: 10px;
        }
        .modal-content::-webkit-scrollbar-thumb {
          background: ${borderColor};
          border-radius: 6px;
        }
        .modal-content::-webkit-scrollbar-track {
          background: #232323;
          border-radius: 6px;
        }
        .modal-content {
          scrollbar-width: thin;
          scrollbar-color: ${borderColor} #232323;
        }
      `}</style>
    </div>
  );

  // Use portal to render at document body level for proper centering
  return createPortal(modalContent, document.body);
}
