import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '@shared/config/config.js';
import adminAuthService from '@shared/services/services/adminAuthService.js';
import { 
  FaSpinner, 
  FaCheckCircle, 
  FaExclamationCircle,
  FaUsers,
  FaTrophy,
  FaUserCog,
  FaCog,
  FaChartBar,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaKey,
  FaShieldAlt,
  FaDatabase,
  FaServer
} from 'react-icons/fa';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';

export default function PlatformAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [stats, setStats] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [operators, setOperators] = useState([]);
  const [admins, setAdmins] = useState([]);

  // Get admin credentials from authentication service
  const getAdminCredentials = () => {
    const currentAdmin = adminAuthService.getCurrentAdmin();
    if (!currentAdmin) {
      throw new Error('No authenticated admin found');
    }
    return { email: currentAdmin.email, pin: currentAdmin.pin };
  };

  // Modal states
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [showCreateOperator, setShowCreateOperator] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showAssignLeague, setShowAssignLeague] = useState(false);

  // Form states
  const [leagueForm, setLeagueForm] = useState({
    leagueId: '',
    name: '',
    description: '',
    adminEmail: '',
    adminName: '',
    operatorEmail: ''
  });

  const [operatorForm, setOperatorForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: ''
  });

  const [adminForm, setAdminForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    role: 'admin',
    permissions: {
      canCreateLeagues: false,
      canDeleteLeagues: false,
      canManageLeagueOperators: false,
      canViewAllLeagueData: false,
      canManageBilling: false,
      canViewSystemLogs: false
    }
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { email, pin } = getAdminCredentials();
      
      const headers = {
        'Content-Type': 'application/json',
        'x-admin-email': email,
        'x-admin-pin': pin
      };

      const [statsRes, leaguesRes, operatorsRes, adminsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/platform/stats`, { headers }),
        fetch(`${BACKEND_URL}/api/platform/leagues`, { headers }),
        fetch(`${BACKEND_URL}/api/platform/operators`, { headers }),
        fetch(`${BACKEND_URL}/api/platform/admins`, { headers })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      } else {
        console.error('Stats response error:', statsRes.status, await statsRes.text());
      }
      
      if (leaguesRes.ok) {
        const leaguesData = await leaguesRes.json();
        setLeagues(leaguesData.leagues || []);
      } else {
        console.error('Leagues response error:', leaguesRes.status, await leaguesRes.text());
      }
      
      if (operatorsRes.ok) {
        const operatorsData = await operatorsRes.json();
        setOperators(operatorsData.operators || []);
      } else {
        console.error('Operators response error:', operatorsRes.status, await operatorsRes.text());
      }
      
      if (adminsRes.ok) {
        const adminsData = await adminsRes.json();
        setAdmins(adminsData.admins || []);
      } else {
        console.error('Admins response error:', adminsRes.status, await adminsRes.text());
      }

    } catch (error) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLeague = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { email, pin } = getAdminCredentials();
      const response = await fetch(`${BACKEND_URL}/api/platform/leagues`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...leagueForm,
          adminEmail: email, // Include credentials in body for POST requests
          adminPin: pin
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('League created successfully!');
        setShowCreateLeague(false);
        setLeagueForm({ leagueId: '', name: '', description: '', adminEmail: '', adminName: '', operatorEmail: '' });
        loadDashboardData();
      } else {
        setError(data.message || 'Failed to create league');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOperator = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { email, pin } = getAdminCredentials();
      const response = await fetch(`${BACKEND_URL}/api/platform/operators`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...operatorForm,
          adminEmail: email, // Include credentials in body for POST requests
          adminPin: pin
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Operator created successfully!');
        setShowCreateOperator(false);
        setOperatorForm({ email: '', firstName: '', lastName: '', phone: '', password: '' });
        loadDashboardData();
      } else {
        setError(data.message || 'Failed to create operator');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { email, pin } = getAdminCredentials();
      const response = await fetch(`${BACKEND_URL}/api/platform/admins`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...adminForm,
          adminEmail: email, // Include credentials in body for POST requests
          adminPin: pin
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Admin created successfully!');
        setShowCreateAdmin(false);
        setAdminForm({
          email: '', firstName: '', lastName: '', phone: '', password: '',
          role: 'admin', permissions: { canCreateLeagues: false, canDeleteLeagues: false, canManageLeagueOperators: false, canViewAllLeagueData: false, canManageBilling: false, canViewSystemLogs: false }
        });
        loadDashboardData();
      } else {
        setError(data.message || 'Failed to create admin');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <div className="overview-section">
      <h2>Platform Overview</h2>
      
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <FaTrophy className="stat-icon" />
            <div className="stat-content">
              <h3>{stats.stats.leagues.total}</h3>
              <p>Total Leagues</p>
            </div>
          </div>
          
          <div className="stat-card">
            <FaUsers className="stat-icon" />
            <div className="stat-content">
              <h3>{stats.stats.operators}</h3>
              <p>League Operators</p>
            </div>
          </div>
          
          <div className="stat-card">
            <FaUserCog className="stat-icon" />
            <div className="stat-content">
              <h3>{stats.stats.admins}</h3>
              <p>Platform Admins</p>
            </div>
          </div>
          
          <div className="stat-card">
            <FaChartBar className="stat-icon" />
            <div className="stat-content">
              <h3>{stats.stats.leagues.active}</h3>
              <p>Active Leagues</p>
            </div>
          </div>
        </div>
      )}

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button onClick={() => setShowCreateLeague(true)} className="btn-primary">
            <FaPlus /> Create New League
          </button>
          <button onClick={() => setShowCreateOperator(true)} className="btn-secondary">
            <FaUserCog /> Add League Operator
          </button>
          <button onClick={() => setShowCreateAdmin(true)} className="btn-secondary">
            <FaShieldAlt /> Add Platform Admin
          </button>
        </div>
      </div>
    </div>
  );

  const renderLeagues = () => (
    <div className="leagues-section">
      <div className="section-header">
        <h2>League Management</h2>
        <button onClick={() => setShowCreateLeague(true)} className="btn-primary">
          <FaPlus /> Create League
        </button>
      </div>

      <div className="leagues-grid">
        {leagues.map(league => (
          <div key={league.leagueId} className="league-card">
            <div className="league-header">
              <h3>{league.name}</h3>
              <span className={`status-badge ${league.subscription.status}`}>
                {league.subscription.status}
              </span>
            </div>
            
            <div className="league-details">
              <p><strong>ID:</strong> {league.leagueId}</p>
              <p><strong>Admin:</strong> {league.adminEmail}</p>
              <p><strong>Plan:</strong> {league.subscription.plan}</p>
              <p><strong>Created:</strong> {new Date(league.createdAt).toLocaleDateString()}</p>
            </div>

            <div className="league-actions">
              <button className="btn-small">
                <FaEye /> View Details
              </button>
              <button className="btn-small">
                <FaEdit /> Edit
              </button>
              <button className="btn-small btn-danger">
                <FaTrash /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderOperators = () => (
    <div className="operators-section">
      <div className="section-header">
        <h2>League Operators</h2>
        <button onClick={() => setShowCreateOperator(true)} className="btn-primary">
          <FaPlus /> Add Operator
        </button>
      </div>

      <div className="operators-grid">
        {operators.map(operator => (
          <div key={operator._id} className="operator-card">
            <div className="operator-header">
              <h3>{operator.firstName} {operator.lastName}</h3>
              <span className="status-badge active">Active</span>
            </div>
            
            <div className="operator-details">
              <p><strong>Email:</strong> {operator.email}</p>
              <p><strong>Leagues:</strong> {operator.assignedLeagues.length}</p>
              <p><strong>Last Login:</strong> {operator.lastLoginAt ? new Date(operator.lastLoginAt).toLocaleDateString() : 'Never'}</p>
            </div>

            <div className="operator-actions">
              <button className="btn-small">
                <FaEye /> View Details
              </button>
              <button className="btn-small">
                <FaEdit /> Edit
              </button>
              <button onClick={() => setShowAssignLeague(true)} className="btn-small">
                <FaKey /> Assign League
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAdmins = () => (
    <div className="admins-section">
      <div className="section-header">
        <h2>Platform Admins</h2>
        <button onClick={() => setShowCreateAdmin(true)} className="btn-primary">
          <FaPlus /> Add Admin
        </button>
      </div>

      <div className="admins-grid">
        {admins.map(admin => (
          <div key={admin._id} className="admin-card">
            <div className="admin-header">
              <h3>{admin.firstName} {admin.lastName}</h3>
              <span className={`role-badge ${admin.role}`}>
                {admin.role}
              </span>
            </div>
            
            <div className="admin-details">
              <p><strong>Email:</strong> {admin.email}</p>
              <p><strong>Role:</strong> {admin.role}</p>
              <p><strong>Last Login:</strong> {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleDateString() : 'Never'}</p>
            </div>

            <div className="admin-actions">
              <button className="btn-small">
                <FaEye /> View Details
              </button>
              <button className="btn-small">
                <FaEdit /> Edit
              </button>
              <button className="btn-small btn-danger">
                <FaTrash /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="platform-admin-dashboard">
      {error && (
        <div className="error-message">
          <FaExclamationCircle /> {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          <FaCheckCircle /> {success}
        </div>
      )}

      <div className="dashboard-header">
        <h1>Platform Administration</h1>
        <div className="header-actions">
          <button onClick={loadDashboardData} className="btn-secondary" disabled={loading}>
            {loading ? <FaSpinner className="spinner" /> : <FaServer />} Refresh
          </button>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FaChartBar /> Overview
        </button>
        <button 
          className={`tab ${activeTab === 'leagues' ? 'active' : ''}`}
          onClick={() => setActiveTab('leagues')}
        >
          <FaTrophy /> Leagues
        </button>
        <button 
          className={`tab ${activeTab === 'operators' ? 'active' : ''}`}
          onClick={() => setActiveTab('operators')}
        >
          <FaUsers /> Operators
        </button>
        <button 
          className={`tab ${activeTab === 'admins' ? 'active' : ''}`}
          onClick={() => setActiveTab('admins')}
        >
          <FaShieldAlt /> Admins
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'leagues' && renderLeagues()}
        {activeTab === 'operators' && renderOperators()}
        {activeTab === 'admins' && renderAdmins()}
      </div>

      {/* Create League Modal */}
      <DraggableModal
        isOpen={showCreateLeague}
        onClose={() => setShowCreateLeague(false)}
        title="Create New League"
        maxWidth="600px"
      >
        <form onSubmit={handleCreateLeague}>
          <div className="form-group">
            <label>League ID *</label>
            <input
              type="text"
              value={leagueForm.leagueId}
              onChange={(e) => setLeagueForm({...leagueForm, leagueId: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})}
              placeholder="e.g., front-range-pool"
              required
            />
          </div>

          <div className="form-group">
            <label>League Name *</label>
            <input
              type="text"
              value={leagueForm.name}
              onChange={(e) => setLeagueForm({...leagueForm, name: e.target.value})}
              placeholder="e.g., Front Range Pool League"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={leagueForm.description}
              onChange={(e) => setLeagueForm({...leagueForm, description: e.target.value})}
              placeholder="Brief description of the league"
            />
          </div>

          <div className="form-group">
            <label>Admin Email *</label>
            <input
              type="email"
              value={leagueForm.adminEmail}
              onChange={(e) => setLeagueForm({...leagueForm, adminEmail: e.target.value})}
              placeholder="admin@league.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Admin Name *</label>
            <input
              type="text"
              value={leagueForm.adminName}
              onChange={(e) => setLeagueForm({...leagueForm, adminName: e.target.value})}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="form-group">
            <label>Assign Operator (Optional)</label>
            <input
              type="email"
              value={leagueForm.operatorEmail}
              onChange={(e) => setLeagueForm({...leagueForm, operatorEmail: e.target.value})}
              placeholder="operator@league.com"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => setShowCreateLeague(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <FaSpinner className="spinner" /> : 'Create League'}
            </button>
          </div>
        </form>
      </DraggableModal>

      {/* Create Operator Modal */}
      <DraggableModal
        isOpen={showCreateOperator}
        onClose={() => setShowCreateOperator(false)}
        title="Create League Operator"
        maxWidth="500px"
      >
        <form onSubmit={handleCreateOperator}>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={operatorForm.email}
              onChange={(e) => setOperatorForm({...operatorForm, email: e.target.value})}
              placeholder="operator@example.com"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                value={operatorForm.firstName}
                onChange={(e) => setOperatorForm({...operatorForm, firstName: e.target.value})}
                placeholder="John"
                required
              />
            </div>

            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                value={operatorForm.lastName}
                onChange={(e) => setOperatorForm({...operatorForm, lastName: e.target.value})}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={operatorForm.phone}
              onChange={(e) => setOperatorForm({...operatorForm, phone: e.target.value})}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              value={operatorForm.password}
              onChange={(e) => setOperatorForm({...operatorForm, password: e.target.value})}
              placeholder="Enter password"
              required
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => setShowCreateOperator(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <FaSpinner className="spinner" /> : 'Create Operator'}
            </button>
          </div>
        </form>
      </DraggableModal>

      {/* Create Admin Modal */}
      <DraggableModal
        isOpen={showCreateAdmin}
        onClose={() => setShowCreateAdmin(false)}
        title="Create Platform Admin"
        maxWidth="600px"
      >
        <form onSubmit={handleCreateAdmin}>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={adminForm.email}
              onChange={(e) => setAdminForm({...adminForm, email: e.target.value})}
              placeholder="admin@platform.com"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                value={adminForm.firstName}
                onChange={(e) => setAdminForm({...adminForm, firstName: e.target.value})}
                placeholder="Admin"
                required
              />
            </div>

            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                value={adminForm.lastName}
                onChange={(e) => setAdminForm({...adminForm, lastName: e.target.value})}
                placeholder="User"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={adminForm.phone}
              onChange={(e) => setAdminForm({...adminForm, phone: e.target.value})}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              value={adminForm.password}
              onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
              placeholder="Enter password"
              required
            />
          </div>

          <div className="form-group">
            <label>Role *</label>
            <select
              value={adminForm.role}
              onChange={(e) => setAdminForm({...adminForm, role: e.target.value})}
              required
            >
              <option value="admin">Admin</option>
              <option value="support">Support</option>
            </select>
          </div>

          <div className="form-group">
            <label>Permissions</label>
            <div className="permissions-grid">
              {Object.entries(adminForm.permissions).map(([permission, value]) => (
                <label key={permission} className="permission-checkbox">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setAdminForm({
                      ...adminForm,
                      permissions: {
                        ...adminForm.permissions,
                        [permission]: e.target.checked
                      }
                    })}
                  />
                  {permission.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </label>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => setShowCreateAdmin(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <FaSpinner className="spinner" /> : 'Create Admin'}
            </button>
          </div>
        </form>
      </DraggableModal>

      <style jsx>{`
        .platform-admin-dashboard {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e0e0e0;
        }

        .dashboard-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          border-bottom: 1px solid #e0e0e0;
        }

        .tab {
          padding: 12px 24px;
          border: none;
          background: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 3px solid transparent;
          transition: all 0.3s ease;
        }

        .tab.active {
          border-bottom-color: #007bff;
          color: #007bff;
        }

        .tab:hover {
          background: #f8f9fa;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .stat-icon {
          font-size: 2rem;
          color: #007bff;
        }

        .stat-content h3 {
          margin: 0;
          font-size: 2rem;
          color: #333;
        }

        .stat-content p {
          margin: 5px 0 0 0;
          color: #666;
        }

        .quick-actions {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .action-buttons {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .leagues-grid,
        .operators-grid,
        .admins-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .league-card,
        .operator-card,
        .admin-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .league-header,
        .operator-header,
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .status-badge,
        .role-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .status-badge.active { background: #d4edda; color: #155724; }
        .status-badge.trial { background: #fff3cd; color: #856404; }
        .status-badge.expired { background: #f8d7da; color: #721c24; }

        .role-badge.admin { background: #cce5ff; color: #004085; }
        .role-badge.support { background: #d1ecf1; color: #0c5460; }

        .league-details,
        .operator-details,
        .admin-details {
          margin-bottom: 15px;
        }

        .league-details p,
        .operator-details p,
        .admin-details p {
          margin: 5px 0;
          font-size: 0.9rem;
        }

        .league-actions,
        .operator-actions,
        .admin-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn-primary,
        .btn-secondary,
        .btn-small {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #545b62;
        }

        .btn-small {
          padding: 6px 12px;
          font-size: 0.8rem;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background: #c82333;
        }

        .btn-primary:disabled,
        .btn-secondary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .permissions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .permission-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
        }

        .form-actions {
          display: flex;
          gap: 15px;
          justify-content: flex-end;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }

        .error-message,
        .success-message {
          padding: 10px;
          margin-bottom: 20px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .error-message {
          background: #fee;
          color: #c33;
          border: 1px solid #fcc;
        }

        .success-message {
          background: #efe;
          color: #363;
          border: 1px solid #cfc;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            gap: 15px;
            align-items: stretch;
          }

          .dashboard-tabs {
            flex-wrap: wrap;
          }

          .tab {
            flex: 1;
            min-width: 120px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .leagues-grid,
          .operators-grid,
          .admins-grid {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            flex-direction: column;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .permissions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
