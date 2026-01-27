import React, { useState, useEffect } from 'react';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaSave, 
  FaTimes, 
  FaMapMarkerAlt,
  FaCheck,
  FaExclamationTriangle
} from 'react-icons/fa';

export default function LocationManagement({ backendUrl }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [newLocation, setNewLocation] = useState({ name: '', address: '', notes: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load locations on component mount
  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/api/locations`);
      if (!response.ok) {
        throw new Error('Failed to load locations');
      }
      const data = await response.json();
      setLocations(data.locations || []);
    } catch (err) {
      setError('Failed to load locations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.name.trim()) {
      setError('Location name is required');
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/api/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLocation)
      });

      if (!response.ok) {
        throw new Error('Failed to add location');
      }

      const data = await response.json();
      setLocations([...locations, data.location]);
      setNewLocation({ name: '', address: '', notes: '' });
      setSuccess('Location added successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to add location: ' + err.message);
    }
  };

  const handleUpdateLocation = async (id, updatedLocation) => {
    try {
      const response = await fetch(`${backendUrl}/api/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLocation)
      });

      if (!response.ok) {
        throw new Error('Failed to update location');
      }

      const data = await response.json();
      setLocations(locations.map(loc => 
        loc._id === id ? data.location : loc
      ));
      setEditingId(null);
      setSuccess('Location updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update location: ' + err.message);
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this location? This will affect any players who have selected this location.')) {
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/api/locations/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete location');
      }

      setLocations(locations.filter(loc => loc._id !== id));
      setSuccess('Location deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete location: ' + err.message);
    }
  };

  const startEditing = (location) => {
    setEditingId(location._id);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ fontSize: '18px', color: '#ccc' }}>Loading locations...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '20px',
        color: 'white'
      }}>
        <h2 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaMapMarkerAlt /> Location Management
        </h2>
        <p style={{ margin: 0, opacity: 0.9 }}>
          Manage predefined locations that players can select during registration. 
          Players can also add custom locations if needed.
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div style={{
          background: 'rgba(76, 175, 80, 0.2)',
          border: '1px solid #4CAF50',
          color: '#4CAF50',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FaCheck /> {success}
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(244, 67, 54, 0.2)',
          border: '1px solid #f44336',
          color: '#f44336',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {/* Add New Location */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h3 style={{ color: '#e53e3e', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPlus /> Add New Location
        </h3>
        
        <div style={{ display: 'grid', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: '#fff', fontWeight: 'bold' }}>
              Location Name *
            </label>
            <input
              type="text"
              value={newLocation.name}
              onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #444',
                background: '#222',
                color: '#fff',
                fontSize: '16px'
              }}
              placeholder="e.g., Pool Hall A, Community Center"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: '#fff', fontWeight: 'bold' }}>
              Address (Optional)
            </label>
            <input
              type="text"
              value={newLocation.address}
              onChange={(e) => setNewLocation({...newLocation, address: e.target.value})}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #444',
                background: '#222',
                color: '#fff',
                fontSize: '16px'
              }}
              placeholder="e.g., 123 Main St, City, State"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: '#fff', fontWeight: 'bold' }}>
              Notes (Optional)
            </label>
            <textarea
              value={newLocation.notes}
              onChange={(e) => setNewLocation({...newLocation, notes: e.target.value})}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #444',
                background: '#222',
                color: '#fff',
                fontSize: '16px',
                minHeight: '80px',
                resize: 'vertical'
              }}
              placeholder="Additional information about this location..."
            />
          </div>

          <button
            onClick={handleAddLocation}
            style={{
              padding: '12px 20px',
              borderRadius: '6px',
              border: 'none',
              background: '#e53e3e',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'center'
            }}
          >
            <FaPlus /> Add Location
          </button>
        </div>
      </div>

      {/* Existing Locations */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h3 style={{ color: '#e53e3e', marginBottom: '15px' }}>
          Existing Locations ({locations.length})
        </h3>

        {locations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#ccc' }}>
            <FaMapMarkerAlt style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }} />
            <p>No locations added yet. Add your first location above!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {locations.map(location => (
              <div key={location._id} style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '15px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                {editingId === location._id ? (
                  <LocationEditForm
                    location={location}
                    onSave={(updatedLocation) => handleUpdateLocation(location._id, updatedLocation)}
                    onCancel={cancelEditing}
                  />
                ) : (
                  <LocationDisplay
                    location={location}
                    onEdit={() => startEditing(location)}
                    onDelete={() => handleDeleteLocation(location._id)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Location Display Component
function LocationDisplay({ location, onEdit, onDelete }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ flex: 1 }}>
        <h4 style={{ color: '#fff', margin: '0 0 5px 0', fontSize: '18px' }}>
          {location.name}
        </h4>
        {location.address && (
          <p style={{ color: '#ccc', margin: '0 0 5px 0', fontSize: '14px' }}>
            📍 {location.address}
          </p>
        )}
        {location.notes && (
          <p style={{ color: '#999', margin: 0, fontSize: '13px' }}>
            📝 {location.notes}
          </p>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onEdit}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #666',
            background: 'transparent',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <FaEdit /> Edit
        </button>
        <button
          onClick={onDelete}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #f44336',
            background: 'transparent',
            color: '#f44336',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <FaTrash /> Delete
        </button>
      </div>
    </div>
  );
}

// Location Edit Form Component
function LocationEditForm({ location, onSave, onCancel }) {
  const [editedLocation, setEditedLocation] = useState({
    name: location.name,
    address: location.address || '',
    notes: location.notes || ''
  });

  const handleSave = () => {
    if (!editedLocation.name.trim()) {
      alert('Location name is required');
      return;
    }
    onSave(editedLocation);
  };

  return (
    <div style={{ display: 'grid', gap: '10px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '5px', color: '#fff', fontWeight: 'bold' }}>
          Location Name *
        </label>
        <input
          type="text"
          value={editedLocation.name}
          onChange={(e) => setEditedLocation({...editedLocation, name: e.target.value})}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #444',
            background: '#222',
            color: '#fff',
            fontSize: '14px'
          }}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '5px', color: '#fff', fontWeight: 'bold' }}>
          Address
        </label>
        <input
          type="text"
          value={editedLocation.address}
          onChange={(e) => setEditedLocation({...editedLocation, address: e.target.value})}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #444',
            background: '#222',
            color: '#fff',
            fontSize: '14px'
          }}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '5px', color: '#fff', fontWeight: 'bold' }}>
          Notes
        </label>
        <textarea
          value={editedLocation.notes}
          onChange={(e) => setEditedLocation({...editedLocation, notes: e.target.value})}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #444',
            background: '#222',
            color: '#fff',
            fontSize: '14px',
            minHeight: '60px',
            resize: 'vertical'
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #666',
            background: 'transparent',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <FaTimes /> Cancel
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: 'none',
            background: '#4CAF50',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <FaSave /> Save
        </button>
      </div>
    </div>
  );
}
