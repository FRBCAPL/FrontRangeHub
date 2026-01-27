import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BACKEND_URL } from '@shared/config/config.js';
import styles from './PlayerManagement.module.css';

export default function PlayerManagement() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    pin: '',
    division: '',
    locations: '',
    isApproved: true,
    isActive: true
  });

  // Fetch all unified players
  const fetchPlayers = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-auth/all-users`);
      const data = await response.json();
      if (data.success) {
        setPlayers(data.users);
      }
    } catch (error) {
      console.error('Error fetching unified players:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Add new unified player
  const handleAddPlayer = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-auth/admin/add-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        setShowAddForm(false);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          pin: '',
          division: '',
          locations: '',
          isApproved: true,
          isActive: true
        });
        fetchPlayers();
        alert('Player added successfully!');
      } else {
        alert('Error adding player: ' + data.message);
      }
    } catch (error) {
      console.error('Error adding player:', error);
      alert('Error adding player');
    }
  };

  // Update existing unified player
  const handleUpdatePlayer = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-auth/admin/update-user/${editingPlayer._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        setEditingPlayer(null);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          pin: '',
          division: '',
          locations: '',
          isApproved: true,
          isActive: true
        });
        fetchPlayers();
        alert('Player updated successfully!');
      } else {
        alert('Error updating player: ' + data.message);
      }
    } catch (error) {
      console.error('Error updating player:', error);
      alert('Error updating player');
    }
  };

  // Start editing a player
  const handleEditPlayer = (player) => {
    setEditingPlayer(player);
    setFormData({
      firstName: player.firstName || '',
      lastName: player.lastName || '',
      email: player.email || '',
      phone: player.phone || '',
      pin: player.pin || '',
      division: player.division || '',
      locations: player.locations || '',
      isApproved: player.isApproved || false,
      isActive: player.isActive || true
    });
  };

  // Delete unified player
  const handleDeletePlayer = async (playerId) => {
    if (!confirm('Are you sure you want to delete this player?')) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-auth/admin/delete-user/${playerId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        fetchPlayers();
        alert('Player deleted successfully!');
      } else {
        alert('Error deleting player: ' + data.message);
      }
    } catch (error) {
      console.error('Error deleting player:', error);
      alert('Error deleting player');
    }
  };

  if (loading) {
    return <div className={styles.container}>Loading unified players...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Unified Player Management</h2>
        <button 
          className={styles.addButton}
          onClick={() => setShowAddForm(true)}
        >
          Add New Player
        </button>
      </div>

      {/* Add Player Form */}
      {showAddForm && (
        <div className={styles.formOverlay}>
          <div className={styles.form}>
            <h3>Add New Unified Player</h3>
            <form onSubmit={handleAddPlayer}>
              <div className={styles.formRow}>
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              <input
                type="text"
                name="phone"
                placeholder="Phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
              <input
                type="text"
                name="pin"
                placeholder="PIN"
                value={formData.pin}
                onChange={handleInputChange}
                required
              />
              <input
                type="text"
                name="division"
                placeholder="Division"
                value={formData.division}
                onChange={handleInputChange}
              />
              <input
                type="text"
                name="locations"
                placeholder="Locations"
                value={formData.locations}
                onChange={handleInputChange}
              />
              <div className={styles.checkboxes}>
                <label>
                  <input
                    type="checkbox"
                    name="isApproved"
                    checked={formData.isApproved}
                    onChange={handleInputChange}
                  />
                  Approved
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                  />
                  Active
                </label>
              </div>
              <div className={styles.formButtons}>
                <button type="submit">Add Player</button>
                <button type="button" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Player Form */}
      {editingPlayer && createPortal(
        <div className={styles.formOverlay}>
          <div className={styles.form}>
            <h3>Edit Unified Player: {editingPlayer.firstName} {editingPlayer.lastName}</h3>
            <form onSubmit={handleUpdatePlayer}>
              <div className={styles.formRow}>
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              <input
                type="text"
                name="phone"
                placeholder="Phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
              <input
                type="text"
                name="pin"
                placeholder="PIN"
                value={formData.pin}
                onChange={handleInputChange}
                required
              />
              <input
                type="text"
                name="division"
                placeholder="Division"
                value={formData.division}
                onChange={handleInputChange}
              />
              <input
                type="text"
                name="locations"
                placeholder="Locations"
                value={formData.locations}
                onChange={handleInputChange}
              />
              <div className={styles.checkboxes}>
                <label>
                  <input
                    type="checkbox"
                    name="isApproved"
                    checked={formData.isApproved}
                    onChange={handleInputChange}
                  />
                  Approved
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                  />
                  Active
                </label>
              </div>
              <div className={styles.formButtons}>
                <button type="submit">Update Player</button>
                <button type="button" onClick={() => setEditingPlayer(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Players List */}
      <div className={styles.playersList}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>PIN</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.map(player => (
              <tr key={player._id}>
                <td>{player.firstName} {player.lastName}</td>
                <td>{player.email}</td>
                <td>{player.phone}</td>
                <td>{player.pin ? '***' : 'Not Set'}</td>
                <td>{player.role || 'player'}</td>
                <td>
                  <span className={`${styles.status} ${player.isApproved ? styles.approved : styles.pending}`}>
                    {player.isApproved ? 'Approved' : 'Pending'}
                  </span>
                  <span className={`${styles.status} ${player.isActive ? styles.active : styles.inactive}`}>
                    {player.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button 
                    className={styles.editButton}
                    onClick={() => handleEditPlayer(player)}
                  >
                    Edit
                  </button>
                  <button 
                    className={styles.deleteButton}
                    onClick={() => handleDeletePlayer(player._id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
