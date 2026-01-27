import React from 'react';

const Phase1TrackerSkeleton = ({ isMobile }) => {
  return (
    <div style={{
      background: `rgba(0, 0, 0, 0.75)`,
      border: `1px solid rgba(255, 255, 255, 0.3)`,
      borderRadius: isMobile ? '12px' : '16px',
      padding: isMobile ? '8px' : '16px',
      margin: isMobile ? '-15px 0 0 0' : '13px auto',
      width: isMobile ? '100%' : '90%',
      maxWidth: isMobile ? 'none' : '1200px',
      boxShadow: `0 4px 16px rgba(0,0,0,0.3)`,
      backdropFilter: 'blur(4px)',
      height: isMobile ? '350px' : '400px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header Skeleton */}
      <div style={{
        position: 'relative',
        textAlign: 'center',
        marginBottom: isMobile ? '0px' : '4px',
        padding: isMobile ? '2px' : '4px',
        borderRadius: '8px',
        background: 'rgba(0, 0, 0, 0.6)',
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        minHeight: isMobile ? '2.5rem' : '3rem'
      }}>
        {/* Phase 1 Badge Skeleton */}
        <div style={{
          display: 'inline-block',
          width: isMobile ? '80px' : '100px',
          height: isMobile ? '24px' : '32px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)',
          borderRadius: '6px',
          animation: 'shimmer 1.5s infinite',
          margin: '8px'
        }} />
        
        {/* Rules Button Skeleton */}
        <div style={{
          display: 'inline-block',
          width: isMobile ? '60px' : '80px',
          height: isMobile ? '20px' : '28px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)',
          borderRadius: '6px',
          animation: 'shimmer 1.5s infinite',
          margin: '8px'
        }} />
      </div>

      {/* Status Message Skeleton */}
      <div style={{
        width: isMobile ? '200px' : '300px',
        height: isMobile ? '16px' : '20px',
        background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)',
        borderRadius: '4px',
        animation: 'shimmer 1.5s infinite',
        margin: '8px auto'
      }} />

      {/* Main Content Skeleton */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginTop: isMobile ? '20px' : '30px',
        gap: isMobile ? '10px' : '20px'
      }}>
        {/* Calendar Icon Skeleton */}
        <div style={{
          width: isMobile ? '100px' : '140px',
          height: isMobile ? '80px' : '120px',
          background: 'linear-gradient(90deg, rgba(0,255,0,0.1) 25%, rgba(0,255,0,0.2) 50%, rgba(0,255,0,0.1) 75%)',
          borderRadius: '12px',
          animation: 'shimmer 1.5s infinite',
          border: '2px solid rgba(0,255,0,0.3)'
        }} />

        {/* Proposals Section Skeleton */}
        <div style={{
          width: isMobile ? '80px' : '140px',
          height: isMobile ? '60px' : '100px',
          background: 'linear-gradient(90deg, rgba(52,152,219,0.1) 25%, rgba(52,152,219,0.2) 50%, rgba(52,152,219,0.1) 75%)',
          borderRadius: '12px',
          animation: 'shimmer 1.5s infinite',
          border: '2px solid rgba(52,152,219,0.3)'
        }} />
      </div>

      {/* Progress Section Skeleton */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'stretch',
        marginTop: isMobile ? '20px' : '30px',
        gap: isMobile ? '6px' : '12px',
        padding: isMobile ? '6px' : '8px',
        borderRadius: '8px',
        background: 'rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255,255,255,0.15)'
      }}>
        {/* Progress Card */}
        <div style={{
          flex: 1,
          height: isMobile ? '70px' : '80px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)',
          borderRadius: '8px',
          animation: 'shimmer 1.5s infinite'
        }} />

        {/* Record Card */}
        <div style={{
          flex: 1,
          height: isMobile ? '70px' : '80px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)',
          borderRadius: '8px',
          animation: 'shimmer 1.5s infinite'
        }} />

        {/* Position Card */}
        <div style={{
          flex: 1,
          height: isMobile ? '70px' : '80px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)',
          borderRadius: '8px',
          animation: 'shimmer 1.5s infinite'
        }} />
      </div>

      {/* Message Center & Upcoming Matches Skeleton */}
      <div style={{
        display: 'flex',
        gap: isMobile ? '8px' : '12px',
        marginTop: isMobile ? '10px' : '15px'
      }}>
        {/* Message Center */}
        <div style={{
          flex: isMobile ? '0 0 140px' : '0 0 200px',
          height: isMobile ? '80px' : '100px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)',
          borderRadius: '8px',
          animation: 'shimmer 1.5s infinite'
        }} />

        {/* Upcoming Matches */}
        <div style={{
          flex: 1,
          height: isMobile ? '80px' : '100px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)',
          borderRadius: '8px',
          animation: 'shimmer 1.5s infinite'
        }} />
      </div>

      {/* Shimmer Animation CSS */}
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -200px 0;
          }
          100% {
            background-position: calc(200px + 100%) 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Phase1TrackerSkeleton;
