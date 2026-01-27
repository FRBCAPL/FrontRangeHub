import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '@shared/config/config.js';
import { 
  FaDollarSign, 
  FaCalendarAlt, 
  FaExclamationTriangle, 
  FaCheckCircle,
  FaClock,
  FaUser,
  FaSearch,
  FaFilter,
  FaDownload,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaMoneyBillWave,
  FaCreditCard,
  FaMobile
} from 'react-icons/fa';

export default function PaymentTracker() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentType: 'weekly_dues',
    paymentMethod: 'cash',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [penaltyData, setPenaltyData] = useState({
    amount: '',
    reason: '',
    strikeLevel: '1',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [feeConfig, setFeeConfig] = useState({
    registrationFee: 30,
    weeklyDues: 10,
    totalWeeks: 10,
    penaltyStructure: {
      strike1: 5,
      strike2: 10,
      strike3: 0
    }
  });

  useEffect(() => {
    loadPlayers();
    loadFeeConfig();
  }, []);

  const loadPlayers = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading players...');
      console.log('🔍 API URL:', `${BACKEND_URL}/api/users/search?approved=true`);
      const response = await fetch(`${BACKEND_URL}/api/users/search?approved=true&t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Loaded players data:', data.users.length, 'players');
        
        // Debug: Check raw player data for Beta Test User
        const rawBetaUser = data.users.find(p => p.firstName === 'Beta' && p.lastName === 'Test User');
        if (rawBetaUser) {
          console.log('🔍 Raw Beta Test User data from API:', {
            id: rawBetaUser._id,
            firstName: rawBetaUser.firstName,
            lastName: rawBetaUser.lastName,
            paymentHistory: rawBetaUser.paymentHistory,
            paymentHistoryLength: rawBetaUser.paymentHistory ? rawBetaUser.paymentHistory.length : 'undefined'
          });
                 } else {
           console.log('❌ Beta Test User not found in raw data');
                    console.log('Available users:', data.users.map(u => `${u.firstName} ${u.lastName}`));
         console.log('🔍 All users with IDs:', data.users.map(u => ({
           id: u._id,
           name: `${u.firstName} ${u.lastName}`,
           email: u.email
         })));
         
         // Debug: Check for users with empty names
         const usersWithEmptyNames = data.users.filter(u => !u.firstName || !u.lastName || u.firstName.trim() === '' || u.lastName.trim() === '');
         if (usersWithEmptyNames.length > 0) {
           console.log('⚠️ Users with empty names found:', usersWithEmptyNames.length);
           usersWithEmptyNames.forEach((user, index) => {
             console.log(`   ${index + 1}. ID: ${user._id}`);
             console.log(`      Email: ${user.email || 'No email'}`);
             console.log(`      First Name: "${user.firstName || 'EMPTY'}"`);
             console.log(`      Last Name: "${user.lastName || 'EMPTY'}"`);
           });
         }
         }
        
        // Debug: Check if ANY user has payment history
        const usersWithPayments = data.users.filter(u => u.paymentHistory && u.paymentHistory.length > 0);
        console.log('🔍 Users with payment history:', usersWithPayments.length);
        if (usersWithPayments.length > 0) {
          console.log('🔍 First user with payments:', {
            name: `${usersWithPayments[0].firstName} ${usersWithPayments[0].lastName}`,
            paymentHistory: usersWithPayments[0].paymentHistory
          });
        }
        
                 // Debug: Check for specific user by email
         const frbcaplUser = data.users.find(u => u.email === 'frbcapl@gmail.com');
         if (frbcaplUser) {
           console.log('🔍 Found frbcapl@gmail.com user:', {
             id: frbcaplUser._id,
             name: `${frbcaplUser.firstName} ${frbcaplUser.lastName}`,
             email: frbcaplUser.email,
             paymentHistory: frbcaplUser.paymentHistory,
             paymentHistoryLength: frbcaplUser.paymentHistory ? frbcaplUser.paymentHistory.length : 0
           });
           console.log('🔍 Full frbcapl user object:', frbcaplUser);
         console.log('🔍 frbcapl user keys:', Object.keys(frbcaplUser));
         console.log('🔍 frbcapl paymentHistory field:', frbcaplUser.paymentHistory);
         console.log('🔍 frbcapl paymentHistory type:', typeof frbcaplUser.paymentHistory);
         } else {
           console.log('❌ frbcapl@gmail.com user not found');
         }
        
        const playersWithPayments = data.users
          .filter(player => player.firstName && player.lastName && player.firstName.trim() && player.lastName.trim()) // Filter out users with empty names
          .map(player => {
            const playerWithPayments = {
              ...player,
              paymentHistory: player.paymentHistory || [],
              penalties: player.penalties || []
            };
            
            // Calculate balance and status after ensuring paymentHistory is set
            playerWithPayments.currentBalance = calculateCurrentBalance(playerWithPayments);
            playerWithPayments.paymentStatus = getPaymentStatus(playerWithPayments);
            
            return playerWithPayments;
          });
        
        // Debug: Check if Beta Test User is in the data
        const betaUser = playersWithPayments.find(p => p.firstName === 'Beta' && p.lastName === 'Test User');
        if (betaUser) {
          console.log('🔍 Beta Test User found in loaded data:');
          console.log('Payment history length:', betaUser.paymentHistory.length);
          console.log('Payment history:', betaUser.paymentHistory);
          console.log('Calculated balance:', betaUser.currentBalance);
          console.log('Payment status:', betaUser.paymentStatus);
        }
        
        setPlayers(playersWithPayments);
        console.log('✅ Players loaded and processed');
      } else {
        console.error('❌ Failed to load players:', response.status);
      }
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeeConfig = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payment-config`);
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setFeeConfig({
            registrationFee: data.config.registrationFee || 30,
            weeklyDues: data.config.weeklyDues || 10,
            totalWeeks: data.config.totalWeeks || 10,
            penaltyStructure: data.config.penaltyStructure || {
              strike1: 5,
              strike2: 10,
              strike3: 0
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading fee config:', error);
    }
  };

  const calculateCurrentBalance = (player) => {
    // Ensure feeConfig is loaded before calculation
    if (!feeConfig) {
      console.warn('feeConfig not loaded yet for balance calculation.');
      return 0;
    }

    // Calculate what they should have paid
    const expectedTotal = (feeConfig.registrationFee || 0) + ((feeConfig.weeklyDues || 0) * (feeConfig.totalWeeks || 0));
    
    // Calculate what they have paid
    const totalPaid = (player.paymentHistory || []).reduce((sum, payment) => {
      // Count all payment types that reduce the balance
      if (payment.paymentType === 'registration_fee' || 
          payment.paymentType === 'weekly_dues' || 
          payment.paymentType === 'participation_fee' ||
          payment.paymentType === 'penalty') {
        return sum + (payment.amount || 0);
      }
      return sum;
    }, 0);
    
    // Calculate penalties owed
    const totalPenalties = (player.penalties || []).reduce((sum, penalty) => {
      return sum + (penalty.amount || 0);
    }, 0);
    
    const balance = expectedTotal - totalPaid + totalPenalties;
    console.log(`Balance for ${player.firstName} ${player.lastName}: Expected=${expectedTotal}, Paid=${totalPaid}, Penalties=${totalPenalties}, Balance=${balance}`);
    return balance;
  };

  const getPaymentStatus = (player) => {
    const balance = calculateCurrentBalance(player);
    if (balance <= 0) return 'paid';
    if (balance <= 20) return 'partial';
    return 'overdue';
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || player.paymentStatus === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const handleAddPayment = async () => {
    if (!selectedPlayer || !paymentData.amount) return;
    
    try {
      console.log('Adding payment for player:', selectedPlayer._id);
      console.log('Payment data:', paymentData);
      
      const response = await fetch(`${BACKEND_URL}/api/users/${selectedPlayer._id}/add-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Payment added successfully:', result);
        console.log('🔍 Payment result details:', {
          success: result.success,
          message: result.message,
          payment: result.payment,
          user: result.user
        });
        setShowPaymentModal(false);
        setPaymentData({
          amount: '',
          paymentType: 'weekly_dues',
          paymentMethod: 'cash',
          notes: '',
          date: new Date().toISOString().split('T')[0]
        });
        console.log('🔄 Reloading players after payment...');
        await loadPlayers();
        console.log('✅ Players reloaded after payment');
        alert('Payment added successfully!');
      } else {
        const errorData = await response.json();
        console.error('Payment failed:', errorData);
        const errorMessage = errorData.message || errorData.error || 'Unknown error';
        alert(`Error adding payment: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      alert(`Error adding payment: ${error.message}`);
    }
  };

  const handleAddPenalty = async () => {
    if (!selectedPlayer || !penaltyData.amount) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/${selectedPlayer._id}/add-penalty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(penaltyData)
      });
      
      if (response.ok) {
        setShowPenaltyModal(false);
        setPenaltyData({
          amount: '',
          reason: '',
          strikeLevel: '1',
          notes: '',
          date: new Date().toISOString().split('T')[0]
        });
        loadPlayers();
      }
    } catch (error) {
      console.error('Error adding penalty:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#4CAF50';
      case 'partial': return '#FF9800';
      case 'overdue': return '#f44336';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <FaCheckCircle />;
      case 'partial': return <FaClock />;
      case 'overdue': return <FaExclamationTriangle />;
      default: return <FaUser />;
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'cash': return <FaMoneyBillWave />;
      case 'venmo': return <FaMobile />;
      case 'credit_card': return <FaCreditCard />;
      default: return <FaDollarSign />;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ animation: 'spin 1s linear infinite' }}>🔄</div>
        <p>Loading payment data...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ color: '#e53e3e', marginBottom: '20px', textAlign: 'center' }}>
        💰 Payment Tracker
      </h2>

      {/* Summary Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '15px', 
        marginBottom: '30px' 
      }}>
        <div style={{ 
          padding: '15px', 
          background: 'rgba(76, 175, 80, 0.1)', 
          borderRadius: '8px', 
          border: '1px solid #4CAF50',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
            {players.filter(p => p.paymentStatus === 'paid').length}
          </div>
          <div style={{ color: '#fff' }}>Fully Paid</div>
        </div>
        <div style={{ 
          padding: '15px', 
          background: 'rgba(255, 152, 0, 0.1)', 
          borderRadius: '8px', 
          border: '1px solid #FF9800',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9800' }}>
            {players.filter(p => p.paymentStatus === 'partial').length}
          </div>
          <div style={{ color: '#fff' }}>Partial Payment</div>
        </div>
        <div style={{ 
          padding: '15px', 
          background: 'rgba(244, 67, 54, 0.1)', 
          borderRadius: '8px', 
          border: '1px solid #f44336',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>
            {players.filter(p => p.paymentStatus === 'overdue').length}
          </div>
          <div style={{ color: '#fff' }}>Overdue</div>
        </div>
        <div style={{ 
          padding: '15px', 
          background: 'rgba(102, 102, 102, 0.1)', 
          borderRadius: '8px', 
          border: '1px solid #666',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#666' }}>
            ${players.reduce((sum, p) => sum + Math.max(0, p.currentBalance), 0).toFixed(2)}
          </div>
          <div style={{ color: '#fff' }}>Total Outstanding</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '15px', 
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #444',
              background: '#222',
              color: '#fff'
            }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid #444',
            background: '#222',
            color: '#fff',
            minWidth: '150px'
          }}
        >
          <option value="all">All Status</option>
          <option value="paid">Fully Paid</option>
          <option value="partial">Partial Payment</option>
          <option value="overdue">Overdue</option>
        </select>
        <button
          onClick={() => {/* Export functionality */}}
          style={{
            padding: '10px 15px',
            borderRadius: '6px',
            border: 'none',
            background: '#4CAF50',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaDownload /> Export
        </button>
      </div>

      {/* Players List */}
      <div style={{ display: 'grid', gap: '15px' }}>
        {filteredPlayers.map((player) => (
          <div key={player._id} style={{
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                <span style={{ 
                  color: getStatusColor(player.paymentStatus),
                  fontSize: '18px'
                }}>
                  {getStatusIcon(player.paymentStatus)}
                </span>
                <h4 style={{ color: '#fff', margin: 0 }}>
                  {player.firstName} {player.lastName}
                </h4>
              </div>
              <div style={{ color: '#ccc', fontSize: '14px' }}>
                {player.email} • {player.phone || 'No phone'}
              </div>
            </div>
            
            <div style={{ textAlign: 'center', minWidth: '120px' }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold',
                color: player.currentBalance > 0 ? '#f44336' : '#4CAF50'
              }}>
                ${player.currentBalance.toFixed(2)}
              </div>
              <div style={{ color: '#ccc', fontSize: '12px' }}>
                {player.currentBalance > 0 ? 'Owed' : 'Paid'}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setSelectedPlayer(player);
                  setShowPaymentModal(true);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  background: '#4CAF50',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <FaPlus /> Payment
              </button>
              <button
                onClick={() => {
                  setSelectedPlayer(player);
                  setShowPenaltyModal(true);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  background: '#f44336',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <FaExclamationTriangle /> Penalty
              </button>
              <button
                onClick={() => {
                  setSelectedPlayer(player);
                  setShowDetailsModal(true);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #666',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <FaEye /> Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPlayer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div style={{
            background: '#333',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            margin: 'auto'
          }}>
            <h3 style={{ color: '#fff', marginBottom: '20px' }}>
              Add Payment - {selectedPlayer.firstName} {selectedPlayer.lastName}
            </h3>
            
            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>
                  Payment Type
                </label>
                <select
                  value={paymentData.paymentType}
                  onChange={(e) => {
                    const type = e.target.value;
                    let defaultAmount = 0;
                    if (type === 'registration_fee') defaultAmount = feeConfig.registrationFee;
                    else if (type === 'weekly_dues') defaultAmount = feeConfig.weeklyDues;
                    else if (type === 'participation_fee') defaultAmount = feeConfig.registrationFee + (feeConfig.weeklyDues * feeConfig.totalWeeks);
                    
                    setPaymentData(prev => ({ 
                      ...prev, 
                      paymentType: type,
                      amount: defaultAmount
                    }));
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #444',
                    background: '#222',
                    color: '#fff'
                  }}
                >
                  <option value="registration_fee">Registration Fee (${feeConfig.registrationFee})</option>
                  <option value="weekly_dues">Weekly Dues (${feeConfig.weeklyDues})</option>
                  <option value="participation_fee">Participation Fee (${feeConfig.registrationFee + (feeConfig.weeklyDues * feeConfig.totalWeeks)})</option>
                  <option value="penalty">Penalty Payment</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>
                  Amount ($)
                </label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #444',
                    background: '#222',
                    color: '#fff'
                  }}
                  step="0.01"
                />
              </div>
              
              <div>
                <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>
                  Payment Method
                </label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #444',
                    background: '#222',
                    color: '#fff'
                  }}
                >
                  <option value="cash">Cash</option>
                  <option value="venmo">Venmo</option>
                  <option value="credit_card">Credit/Debit Card</option>
                  <option value="check">Check</option>
                </select>
              </div>
              
              <div>
                <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={paymentData.date}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, date: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #444',
                    background: '#222',
                    color: '#fff'
                  }}
                />
              </div>
              
              <div>
                <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>
                  Notes
                </label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #444',
                    background: '#222',
                    color: '#fff',
                    minHeight: '60px',
                    resize: 'vertical'
                  }}
                  placeholder="Optional notes about this payment..."
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={handleAddPayment}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#4CAF50',
                  color: '#fff',
                  cursor: 'pointer',
                  flex: '1'
                }}
              >
                Add Payment
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: '1px solid #666',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  flex: '1'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Penalty Modal */}
      {showPenaltyModal && selectedPlayer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div style={{
            background: '#333',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            margin: 'auto'
          }}>
            <h3 style={{ color: '#fff', marginBottom: '20px' }}>
              Add Penalty - {selectedPlayer.firstName} {selectedPlayer.lastName}
            </h3>
            
            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>
                  Strike Level
                </label>
                <select
                  value={penaltyData.strikeLevel}
                  onChange={(e) => {
                    const level = e.target.value;
                    setPenaltyData(prev => ({ 
                      ...prev, 
                      strikeLevel: level,
                      amount: level === '1' ? feeConfig.penaltyStructure.strike1 :
                              level === '2' ? feeConfig.penaltyStructure.strike2 :
                              level === '3' ? feeConfig.penaltyStructure.strike3 : 0
                    }));
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #444',
                    background: '#222',
                    color: '#fff'
                  }}
                >
                  <option value="1">Strike 1 - ${feeConfig.penaltyStructure.strike1} fine</option>
                  <option value="2">Strike 2 - ${feeConfig.penaltyStructure.strike2} fine</option>
                  <option value="3">
                    Strike 3 - {feeConfig.penaltyStructure.strike3 > 0 ? `$${feeConfig.penaltyStructure.strike3} fine` : 'Removal'}
                  </option>
                </select>
              </div>
              
              <div>
                <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>
                  Fine Amount ($)
                </label>
                <input
                  type="number"
                  value={penaltyData.amount}
                  onChange={(e) => setPenaltyData(prev => ({ ...prev, amount: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #444',
                    background: '#222',
                    color: '#fff'
                  }}
                  step="0.01"
                />
              </div>
              
              <div>
                <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>
                  Reason
                </label>
                <input
                  type="text"
                  value={penaltyData.reason}
                  onChange={(e) => setPenaltyData(prev => ({ ...prev, reason: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #444',
                    background: '#222',
                    color: '#fff'
                  }}
                  placeholder="Reason for penalty..."
                />
              </div>
              
              <div>
                <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={penaltyData.date}
                  onChange={(e) => setPenaltyData(prev => ({ ...prev, date: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #444',
                    background: '#222',
                    color: '#fff'
                  }}
                />
              </div>
              
              <div>
                <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>
                  Notes
                </label>
                <textarea
                  value={penaltyData.notes}
                  onChange={(e) => setPenaltyData(prev => ({ ...prev, notes: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #444',
                    background: '#222',
                    color: '#fff',
                    minHeight: '60px',
                    resize: 'vertical'
                  }}
                  placeholder="Additional details about the penalty..."
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={handleAddPenalty}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#f44336',
                  color: '#fff',
                  cursor: 'pointer',
                  flex: '1'
                }}
              >
                Add Penalty
              </button>
              <button
                onClick={() => setShowPenaltyModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: '1px solid #666',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  flex: '1'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPlayer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div style={{
            background: '#333',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            margin: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', margin: 0 }}>
                Payment Details - {selectedPlayer.firstName} {selectedPlayer.lastName}
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            
            {/* Player Info */}
            <div style={{ marginBottom: '20px', padding: '15px', background: '#222', borderRadius: '6px' }}>
              <h4 style={{ color: '#fff', marginBottom: '10px' }}>Player Information</h4>
              <div style={{ color: '#ccc', fontSize: '14px' }}>
                <div>Email: {selectedPlayer.email}</div>
                <div>Phone: {selectedPlayer.phone || 'Not provided'}</div>
                <div>Current Balance: <span style={{ color: selectedPlayer.currentBalance > 0 ? '#f44336' : '#4CAF50', fontWeight: 'bold' }}>
                  ${selectedPlayer.currentBalance.toFixed(2)}
                </span></div>
                <div>Payment Status: <span style={{ color: getStatusColor(selectedPlayer.paymentStatus) }}>
                  {selectedPlayer.paymentStatus.toUpperCase()}
                </span></div>
              </div>
            </div>
            
            {/* Payment History */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#fff', marginBottom: '10px' }}>Payment History</h4>
              {console.log('🔍 Details Modal - selectedPlayer:', selectedPlayer)}
              {console.log('🔍 Details Modal - paymentHistory:', selectedPlayer.paymentHistory)}
              {selectedPlayer.paymentHistory && selectedPlayer.paymentHistory.length > 0 ? (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {selectedPlayer.paymentHistory.map((payment, index) => (
                    <div key={index} style={{
                      padding: '10px',
                      marginBottom: '8px',
                      background: '#222',
                      borderRadius: '4px',
                      border: '1px solid #444'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ color: '#fff', fontWeight: 'bold' }}>
                          ${payment.amount} - {payment.paymentType.replace('_', ' ').toUpperCase()}
                        </div>
                        <div style={{ color: '#ccc', fontSize: '12px' }}>
                          {new Date(payment.date || payment.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ color: '#ccc', fontSize: '12px', marginTop: '5px' }}>
                        Method: {payment.paymentMethod} • {payment.notes && `Notes: ${payment.notes}`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#ccc', fontStyle: 'italic' }}>No payment history found.</div>
              )}
            </div>
            
            {/* Penalties */}
            <div>
              <h4 style={{ color: '#fff', marginBottom: '10px' }}>Penalties</h4>
              {selectedPlayer.penalties && selectedPlayer.penalties.length > 0 ? (
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {selectedPlayer.penalties.map((penalty, index) => (
                    <div key={index} style={{
                      padding: '10px',
                      marginBottom: '8px',
                      background: '#222',
                      borderRadius: '4px',
                      border: '1px solid #f44336'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ color: '#f44336', fontWeight: 'bold' }}>
                          ${penalty.amount} - {penalty.reason}
                        </div>
                        <div style={{ color: '#ccc', fontSize: '12px' }}>
                          {new Date(penalty.date || penalty.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ color: '#ccc', fontSize: '12px', marginTop: '5px' }}>
                        Strike Level: {penalty.strikeLevel} • {penalty.notes && `Notes: ${penalty.notes}`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#ccc', fontStyle: 'italic' }}>No penalties found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
