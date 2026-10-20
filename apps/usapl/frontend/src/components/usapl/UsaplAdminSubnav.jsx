import React from 'react';
import { NavLink } from 'react-router-dom';

export default function UsaplAdminSubnav() {
  return (
    <div className="usapl-choice-row" style={{ margin: '0 0 20px' }}>
      <NavLink to="/usapl/admin" end className={({ isActive }) => `usapl-choice ${isActive ? 'selected' : ''}`}>
        Inbox
      </NavLink>
      <NavLink to="/usapl/admin/divisions" className={({ isActive }) => `usapl-choice ${isActive ? 'selected' : ''}`}>
        Divisions
      </NavLink>
      <NavLink to="/usapl/admin/archived" className={({ isActive }) => `usapl-choice ${isActive ? 'selected' : ''}`}>
        Archived
      </NavLink>
      <NavLink to="/usapl/admin/locations" className={({ isActive }) => `usapl-choice ${isActive ? 'selected' : ''}`}>
        Locations
      </NavLink>
      <NavLink to="/usapl/admin/visits" className={({ isActive }) => `usapl-choice ${isActive ? 'selected' : ''}`}>
        Visits
      </NavLink>
    </div>
  );
}
