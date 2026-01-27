import React from 'react';
import { 
  FaHome, 
  FaCalendarAlt, 
  FaUsers, 
  FaTrophy, 
  FaCog,
  FaPlus,
  FaComments
} from 'react-icons/fa';

export default function MobileBottomNavigation({ 
  activeTab, 
  onTabChange, 
  onQuickAction,
  pendingCount = 0,
  sentCount = 0,
  matchesCount = 0
}) {
  const tabs = [
    {
      id: 'overview',
      label: 'Home',
      icon: <FaHome />,
      badge: null
    },
    {
      id: 'matches',
      label: 'Matches',
      icon: <FaCalendarAlt />,
      badge: matchesCount > 0 ? matchesCount : null
    },
    {
      id: 'proposals',
      label: 'Proposals',
      icon: <FaUsers />,
      badge: pendingCount > 0 ? pendingCount : null
    },
    {
      id: 'standings',
      label: 'Standings',
      icon: <FaTrophy />,
      badge: null
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: <FaComments />,
      badge: null
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(24, 24, 27, 0.95)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '8px 0',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center'
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: activeTab === tab.id ? '#e53e3e' : '#888',
            padding: '8px 4px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minHeight: '60px',
            minWidth: '60px',
            position: 'relative'
          }}
          onTouchStart={(e) => {
            e.target.style.transform = 'scale(0.95)';
          }}
          onTouchEnd={(e) => {
            e.target.style.transform = 'scale(1)';
          }}
        >
          <div style={{
            fontSize: '1.2rem',
            marginBottom: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {tab.icon}
          </div>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: activeTab === tab.id ? '600' : '400',
            textAlign: 'center'
          }}>
            {tab.label}
          </span>
          
          {/* Badge */}
          {tab.badge && (
            <div style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: '#e53e3e',
              color: '#fff',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.6rem',
              fontWeight: '600',
              border: '2px solid rgba(24, 24, 27, 0.95)'
            }}>
              {tab.badge > 99 ? '99+' : tab.badge}
            </div>
          )}
        </button>
      ))}
      
      {/* Quick Action Button */}
      <button
        onClick={onQuickAction}
        style={{
          position: 'absolute',
          top: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #e53e3e, #c53030)',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(229, 62, 62, 0.4)',
          transition: 'all 0.2s ease',
          zIndex: 1001
        }}
        onTouchStart={(e) => {
          e.target.style.transform = 'translateX(-50%) scale(0.95)';
        }}
        onTouchEnd={(e) => {
          e.target.style.transform = 'translateX(-50%) scale(1)';
        }}
      >
        <FaPlus />
      </button>
    </div>
  );
}
