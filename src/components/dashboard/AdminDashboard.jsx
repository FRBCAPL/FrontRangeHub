import React, { useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import { useNavigate } from "react-router-dom";
import styles from './AdminDashboard.module.css';
import userSearchStyles from './AdminUserSearch.module.css';
import UnenteredMatchesModal from "./UnenteredMatchesModal";
import MatchManager from "./MatchManager";
import GoogleSheetsBackupConfig from "./GoogleSheetsBackupConfig.jsx";
import LocationManagement from "./LocationManagement.jsx";
import PaymentConfiguration from "./PaymentConfiguration.jsx";
import PaymentTracker from "./PaymentTracker.jsx";
import LeagueManagement from "./LeagueManagement.jsx";
import LadderApplicationsManager from "../admin/LadderApplicationsManager.jsx";
import SimplifiedAdminDashboard from "../admin/SimplifiedAdminDashboard.jsx";
import unifiedAdminService from '../../services/unifiedAdminService.js';
import { 
  FaSyncAlt, 
  FaCheckCircle, 
  FaExclamationCircle, 
  FaUsers, 
  FaCalendarAlt, 
  FaChartBar,
  FaPlus,
  FaUserPlus,
  FaCog,
  FaClipboardList,
  FaArrowRight,
  FaInfoCircle,
  FaPlay,
  FaPause,
  FaTrash,
  FaSearch,
  FaGoogle,
  FaMapMarkerAlt,
  FaEdit,
  FaUserCog,
  FaLink,
  FaUnlink,
  FaEye,
  FaBan,
  FaCheck
} from 'react-icons/fa';
import { BACKEND_URL } from '../../config.js';

const apiKey = import.meta.env.VITE_STREAM_API_KEY;
const adminUserId = "frbcaplgmailcom";

// ============================================================================
// ADMIN WORKFLOW COMPONENTS
// ============================================================================

// --- Step-by-Step Division Creation Workflow ---
function DivisionCreationWorkflow({ backendUrl, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [divisionData, setDivisionData] = useState({
    name: '',
    description: '',
    scheduleUrl: '',
    standingsUrl: '',
    seasonStart: '',
    phase1Weeks: 6,
    phase2Weeks: 4,
    totalWeeks: 10
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const steps = [
    {
      id: 1,
      title: "Create Division in CSI LMS",
      description: "First, create the division in the CSI LMS software",
      instructions: [
        "1. Log into CSI LMS at https://lms.fargorate.com",
        "2. Navigate to League Management",
        "3. Create a new division with your desired name",
        "4. Set up the division settings and rules",
        "5. Make sure the division is active and ready for players"
      ],
      completed: false
    },
    {
      id: 2,
      title: "Get Division URLs",
      description: "Copy the schedule and standings URLs from CSI LMS",
             instructions: [
         "1. In CSI LMS, go to the division you just created",
         "2. Click on the 'Reports' link in the navigation",
         "3. Click the 'Schedule' button",
         "4. Copy the URL from the schedule report page",
         "5. Click the 'Teams' button",
         "6. Copy the URL from the teams report page",
         "7. Both URLs should look like: https://lms.fargorate.com/PublicReport/LeagueReports?..."
       ],
      completed: false
    },
    {
      id: 3,
      title: "Configure Phase Settings",
      description: "Set up the division's phase structure and session dates",
      instructions: [
        "1. Set the total number of weeks for the session",
        "2. Configure how many weeks Phase 1 should last",
        "3. Phase 2 weeks will be calculated automatically",
        "4. Set the session start date",
        "5. Review the calculated phase dates"
      ],
      completed: false
    },
    {
      id: 4,
      title: "Add Division to App",
      description: "Create the division in your app with the URLs",
      instructions: [
        "1. Enter the division name (exactly as in CSI LMS)",
        "2. Add a description (optional)",
        "3. Paste the schedule URL from CSI LMS",
        "4. Paste the standings URL from CSI LMS", 
        "5. Click 'Create Division'"
      ],
      completed: false
    },
    {
      id: 5,
      title: "Test Data Sync",
      description: "Verify the division is working correctly",
      instructions: [
        "1. Click 'Update Schedule' to sync match data",
        "2. Click 'Update Standings' to sync player rankings",
        "3. Verify data appears correctly in the app",
        "4. Test the division in the main dashboard"
      ],
      completed: false
    }
  ];

  const handleInputChange = (field, value) => {
    setDivisionData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateDivision = async () => {
    setLoading(true);
    setResult('');
    
    try {
      // First create the division
      const res = await fetch(`${backendUrl}/api/seasons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: divisionData.name,
          division: divisionData.name,
          description: divisionData.description,
          scheduleUrl: divisionData.scheduleUrl,
          standingsUrl: divisionData.standingsUrl,
          seasonStart: divisionData.seasonStart
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        // Then save the phase configuration
        try {
          const divisionRes = await fetch(`${backendUrl}/admin/divisions`);
          if (divisionRes.ok) {
            const divisions = await divisionRes.json();
            const newDivision = divisions.find(d => d.name === divisionData.name);
            
            if (newDivision) {
              await fetch(`${backendUrl}/api/division-config/${newDivision._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  phase1Weeks: divisionData.phase1Weeks,
                  phase2Weeks: divisionData.phase2Weeks,
                  totalWeeks: divisionData.totalWeeks,
                  currentSession: {
                    name: `${divisionData.name} Session`,
                    startDate: divisionData.seasonStart,
                    endDate: null,
                    isActive: true
                  }
                })
              });
            }
          }
        } catch (configError) {
          console.error('Error saving phase configuration:', configError);
          // Don't fail the whole operation if phase config fails
        }
        
        setResult("✅ Division created successfully with phase configuration!");
        setCurrentStep(5);
        if (onComplete) onComplete();
      } else {
        setResult("❌ " + (data.error || "Failed to create division."));
      }
    } catch (err) {
      setResult("❌ Failed to create division: " + err.message);
    }
    setLoading(false);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className={styles.workflowStep}>
            <div className={styles.stepInstructions}>
              {steps[0].instructions.map((instruction, index) => (
                <div key={index} className={styles.instructionItem}>
                  {instruction}
                </div>
              ))}
            </div>
            <div className={styles.stepActions}>
              <button 
                className={styles.workflowButton}
                onClick={() => setCurrentStep(2)}
              >
                <FaArrowRight /> I've Created the Division in CSI LMS
              </button>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className={styles.workflowStep}>
            <div className={styles.stepInstructions}>
              {steps[1].instructions.map((instruction, index) => (
                <div key={index} className={styles.instructionItem}>
                  {instruction}
                </div>
              ))}
            </div>
            <div className={styles.stepActions}>
              <button 
                className={styles.workflowButton}
                onClick={() => setCurrentStep(3)}
              >
                <FaArrowRight /> I Have the URLs Ready
              </button>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className={styles.workflowStep}>
            <div className={styles.stepInstructions}>
              {steps[2].instructions.map((instruction, index) => (
                <div key={index} className={styles.instructionItem}>
                  {instruction}
                </div>
              ))}
            </div>
            <div className={styles.divisionForm}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                <div>
                  <label style={{ color: '#fff', display: 'block', marginBottom: '5px', fontSize: '14px' }}>Total Weeks</label>
                  <input
                    type="number"
                    value={divisionData.totalWeeks}
                    onChange={(e) => {
                      const totalWeeks = Number(e.target.value);
                      const phase1Weeks = divisionData.phase1Weeks;
                      const phase2Weeks = Math.max(1, totalWeeks - phase1Weeks);
                      
                      handleInputChange('totalWeeks', totalWeeks);
                      handleInputChange('phase2Weeks', phase2Weeks);
                    }}
                    className={styles.workflowInput}
                    min="2"
                    max="40"
                  />
                </div>
                <div>
                  <label style={{ color: '#fff', display: 'block', marginBottom: '5px', fontSize: '14px' }}>Phase 1 Weeks</label>
                  <input
                    type="number"
                    value={divisionData.phase1Weeks}
                    onChange={(e) => {
                      const phase1Weeks = Number(e.target.value);
                      handleInputChange('phase1Weeks', phase1Weeks);
                      // Auto-calculate Phase 2 if Total Weeks is set
                      if (divisionData.totalWeeks) {
                        const phase2Weeks = Math.max(1, divisionData.totalWeeks - phase1Weeks);
                        handleInputChange('phase2Weeks', phase2Weeks);
                      }
                    }}
                    className={styles.workflowInput}
                    min="1"
                    max="20"
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                <div>
                  <label style={{ color: '#fff', display: 'block', marginBottom: '5px', fontSize: '14px' }}>Phase 2 Weeks</label>
                  <input
                    type="number"
                    value={divisionData.phase2Weeks}
                    onChange={(e) => {
                      const phase2Weeks = Number(e.target.value);
                      handleInputChange('phase2Weeks', phase2Weeks);
                      // Auto-calculate Total Weeks
                      const totalWeeks = divisionData.phase1Weeks + phase2Weeks;
                      handleInputChange('totalWeeks', totalWeeks);
                    }}
                    className={styles.workflowInput}
                    min="1"
                    max="20"
                  />
                </div>
                <div>
                  <label style={{ color: '#fff', display: 'block', marginBottom: '5px', fontSize: '14px' }}>Session Start Date</label>
                  <input
                    type="date"
                    value={divisionData.seasonStart}
                    onChange={(e) => handleInputChange('seasonStart', e.target.value)}
                    className={styles.workflowInput}
                  />
                </div>
              </div>
              
              {/* Phase Date Calculator */}
              {divisionData.seasonStart && (
                <div style={{ 
                  marginTop: '15px', 
                  padding: '15px', 
                  background: 'rgba(76, 175, 80, 0.1)', 
                  borderRadius: '6px',
                  border: '1px solid #4CAF50'
                }}>
                  <div style={{ color: '#4CAF50', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <FaInfoCircle />
                      <strong>Calculated Session Dates:</strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
                      <div>
                        <strong>Phase 1:</strong><br />
                        {(() => {
                          const startDate = new Date(divisionData.seasonStart);
                          return startDate.toLocaleDateString('en-US', { 
                            month: '2-digit', 
                            day: '2-digit', 
                            year: 'numeric'
                          });
                        })()} to {(() => {
                          const startDate = new Date(divisionData.seasonStart);
                          const phase1End = new Date(startDate);
                          phase1End.setDate(startDate.getDate() + (divisionData.phase1Weeks * 6) - 1);
                          return phase1End.toLocaleDateString('en-US', { 
                            month: '2-digit', 
                            day: '2-digit', 
                            year: 'numeric'
                          });
                        })()}
                      </div>
                      <div>
                        <strong>Phase 2:</strong><br />
                        {(() => {
                          const startDate = new Date(divisionData.seasonStart);
                          const phase2Start = new Date(startDate);
                          phase2Start.setDate(startDate.getDate() + (divisionData.phase1Weeks * 6));
                          return phase2Start.toLocaleDateString('en-US', { 
                            month: '2-digit', 
                            day: '2-digit', 
                            year: 'numeric'
                          });
                        })()} to {(() => {
                          const startDate = new Date(divisionData.seasonStart);
                          const sessionEnd = new Date(startDate);
                          sessionEnd.setDate(startDate.getDate() + (divisionData.phase1Weeks * 6) + (divisionData.phase2Weeks * 6) - 1);
                          return sessionEnd.toLocaleDateString('en-US', { 
                            month: '2-digit', 
                            day: '2-digit', 
                            year: 'numeric'
                          });
                        })()}
                      </div>
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.8 }}>
                      Total Session Length: {divisionData.totalWeeks} weeks ({divisionData.phase1Weeks} weeks Phase 1 + {divisionData.phase2Weeks} weeks Phase 2)
                    </div>
                  </div>
                </div>
              )}
              
              <button 
                className={styles.workflowButton}
                onClick={() => setCurrentStep(4)}
                disabled={!divisionData.seasonStart}
              >
                <FaArrowRight /> Continue to Division Setup
              </button>
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className={styles.workflowStep}>
            <div className={styles.stepInstructions}>
              {steps[3].instructions.map((instruction, index) => (
                <div key={index} className={styles.instructionItem}>
                  {instruction}
                </div>
              ))}
            </div>
            <div className={styles.divisionForm}>
              <input
                type="text"
                placeholder="Division Name (exactly as in CSI LMS)"
                value={divisionData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={styles.workflowInput}
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={divisionData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={styles.workflowInput}
              />
              <input
                type="url"
                placeholder="Schedule URL from CSI LMS"
                value={divisionData.scheduleUrl}
                onChange={(e) => handleInputChange('scheduleUrl', e.target.value)}
                className={styles.workflowInput}
              />
              <input
                type="url"
                placeholder="Standings URL from CSI LMS"
                value={divisionData.standingsUrl}
                onChange={(e) => handleInputChange('standingsUrl', e.target.value)}
                className={styles.workflowInput}
              />
              <button 
                className={styles.workflowButton}
                onClick={handleCreateDivision}
                disabled={loading || !divisionData.name || !divisionData.scheduleUrl || !divisionData.standingsUrl}
              >
                {loading ? 'Creating...' : 'Create Division'}
              </button>
            </div>
            {result && <div className={styles.workflowResult}>{result}</div>}
          </div>
        );
      
      case 5:
        return (
          <div className={styles.workflowStep}>
            <div className={styles.stepInstructions}>
              {steps[4].instructions.map((instruction, index) => (
                <div key={index} className={styles.instructionItem}>
                  {instruction}
                </div>
              ))}
            </div>
            <div className={styles.stepActions}>
              <DataSyncTools backendUrl={backendUrl} divisionName={divisionData.name} />
              <button 
                className={styles.workflowButton}
                onClick={() => {
                  setCurrentStep(1);
                  setDivisionData({ name: '', description: '', scheduleUrl: '', standingsUrl: '', seasonStart: '', phase1Weeks: 6, phase2Weeks: 4, totalWeeks: 10 });
                  setResult('');
                }}
              >
                <FaPlus /> Create Another Division
              </button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={styles.workflowContainer}>
      <div className={styles.workflowHeader}>
        <h3><FaPlus /> Create New Division</h3>
        <div className={styles.workflowProgress}>
          Step {currentStep} of {steps.length}
        </div>
      </div>
      
      <div className={styles.workflowSteps}>
        {steps.map((step, index) => (
          <div 
            key={step.id} 
            className={`${styles.workflowStepIndicator} ${
              currentStep > step.id ? styles.completed : 
              currentStep === step.id ? styles.active : styles.pending
            }`}
          >
            <div className={styles.stepNumber}>{step.id}</div>
            <div className={styles.stepInfo}>
              <div className={styles.stepTitle}>{step.title}</div>
              <div className={styles.stepDescription}>{step.description}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className={styles.workflowContent}>
        {renderStepContent()}
      </div>
    </div>
  );
}

// --- Data Sync Tools Component ---
function DataSyncTools({ backendUrl, divisionName }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const handleSync = async (type) => {
    setLoading(true);
    setResult('');
    
    try {
      const endpoint = type === 'schedule' ? '/admin/update-schedule' : '/admin/update-standings';
      const res = await fetch(`${backendUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ division: divisionName })
      });
      
      const data = await res.json();
      if (res.ok) {
        setResult(`✅ ${type === 'schedule' ? 'Schedule' : 'Standings'} updated successfully!`);
      } else {
        setResult(`❌ Failed to update ${type}: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setResult(`❌ Failed to update ${type}: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div className={styles.dataSyncTools}>
      <button 
        className={styles.syncButton}
        onClick={() => handleSync('schedule')}
        disabled={loading}
      >
        <FaSyncAlt /> Update Schedule
      </button>
      <button 
        className={styles.syncButton}
        onClick={() => handleSync('standings')}
        disabled={loading}
      >
        <FaSyncAlt /> Update Standings
      </button>
      {result && <div className={styles.syncResult}>{result}</div>}
    </div>
  );
}

// --- Player Management Workflow ---
function PlayerManagementWorkflow({ backendUrl }) {
  const [activeTab, setActiveTab] = useState('approve');
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPendingRegistrations();
    fetchPendingPayments();
  }, []);

  const fetchPendingRegistrations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/users/pending-registrations`);
      if (response.ok) {
        const data = await response.json();
        setPendingRegistrations(data.sort((a, b) => new Date(a.registrationDate) - new Date(b.registrationDate)));
      }
    } catch (error) {
      console.error('Error fetching pending registrations:', error);
    }
    setLoading(false);
  };

  const fetchPendingPayments = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/users/pending-payment`);
      if (response.ok) {
        const data = await response.json();
        setPendingPayments(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching pending payments:', error);
    }
  };

  const handleConfirmPayment = async (userId, paymentMethod, paymentNotes) => {
    try {
      const response = await fetch(`${backendUrl}/api/users/${userId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: paymentMethod || 'Admin Confirmed',
          paymentNotes: paymentNotes || ''
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Payment confirmed! PIN: ${result.user.pin}`);
        fetchPendingPayments();
      } else {
        alert('Failed to confirm payment');
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Error confirming payment');
    }
  };

  const handleApprove = async (registrationId, division) => {
    try {
      const response = await fetch(`${backendUrl}/api/users/admin/approve-registration/${registrationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedBy: 'Admin',
          paymentInfo: {
            hasPaid: true,
            paymentDate: new Date(),
            paymentMethod: 'Cash',
            paymentNotes: 'Approved by admin'
          },
          division: division
        })
      });
      
      if (response.ok) {
        fetchPendingRegistrations();
      } else {
        alert('Failed to approve registration');
      }
    } catch (error) {
      console.error('Error approving registration:', error);
      alert('Error approving registration');
    }
  };

  const handleReject = async (registrationId, reason) => {
    try {
      const response = await fetch(`${backendUrl}/api/users/admin/reject-registration/${registrationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejectedBy: 'Admin',
          notes: reason
        })
      });
      
      if (response.ok) {
        fetchPendingRegistrations();
      } else {
        alert('Failed to reject registration');
      }
    } catch (error) {
      console.error('Error rejecting registration:', error);
      alert('Error rejecting registration');
    }
  };

  return (
    <div className={styles.playerManagementContainer}>
      <div className={styles.tabHeader}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'approve' ? styles.active : ''}`}
          onClick={() => setActiveTab('approve')}
        >
          <FaUserPlus /> Approve New Players ({pendingRegistrations.length})
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'payments' ? styles.active : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <FaCheckCircle /> Pending Payments ({pendingPayments.length})
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'manage' ? styles.active : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          <FaUsers /> Manage Existing Players
        </button>
      </div>
      
      <div className={styles.tabContent}>
        {activeTab === 'approve' && (
          <div className={styles.approvalSection}>
            {loading ? (
              <div className={styles.loadingMessage}>Loading pending registrations...</div>
            ) : pendingRegistrations.length === 0 ? (
              <div className={styles.emptyState}>
                <FaCheckCircle /> No pending registrations
              </div>
            ) : (
              <div className={styles.registrationList}>
                {pendingRegistrations.map((registration, index) => (
                  <div key={registration._id} className={styles.registrationCard}>
                    <div className={styles.registrationHeader}>
                      <span className={styles.registrationNumber}>#{index + 1}</span>
                      <h4>{registration.firstName} {registration.lastName}</h4>
                    </div>
                    <div className={styles.registrationDetails}>
                      <p><strong>Email:</strong> {registration.email}</p>
                      <p><strong>Phone:</strong> {registration.phone}</p>
                      <p><strong>Registered:</strong> {new Date(registration.registrationDate).toLocaleDateString()}</p>
                    </div>
                    <div className={styles.registrationActions}>
                      <select 
                        id={`division-${registration._id}`}
                        className={styles.divisionSelect}
                      >
                        <option value="">Select Division</option>
                        <option value="FRBCAPL TEST">FRBCAPL TEST</option>
                        <option value="Singles Test">Singles Test</option>
                        <option value="Waiting List">Waiting List</option>
                      </select>
                      <button 
                        className={styles.approveButton}
                        onClick={() => {
                          const division = document.getElementById(`division-${registration._id}`).value;
                          if (!division) {
                            alert('Please select a division before approving.');
                            return;
                          }
                          handleApprove(registration._id, division);
                        }}
                      >
                        <FaCheckCircle /> Approve
                      </button>
                      <button 
                        className={styles.rejectButton}
                        onClick={() => {
                          const reason = prompt('Enter rejection reason (optional):');
                          if (reason !== null) {
                            handleReject(registration._id, reason);
                          }
                        }}
                      >
                        <FaTrash /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'payments' && (
          <div className={styles.paymentSection}>
            {pendingPayments.length === 0 ? (
              <div className={styles.emptyState}>
                <FaCheckCircle /> No pending payments
              </div>
            ) : (
              <div className={styles.paymentList}>
                {pendingPayments.map((user, index) => (
                  <div key={user._id} className={styles.paymentCard}>
                    <div className={styles.paymentHeader}>
                      <span className={styles.paymentNumber}>#{index + 1}</span>
                      <h4>{user.firstName} {user.lastName}</h4>
                    </div>
                    <div className={styles.paymentDetails}>
                      <p><strong>Email:</strong> {user.email}</p>
                      <p><strong>Registered:</strong> {new Date(user.registrationDate).toLocaleDateString()}</p>
                      <p><strong>Status:</strong> <span className={styles.pendingStatus}>Payment Pending</span></p>
                    </div>
                                         <div className={styles.paymentActions}>
                       <select 
                         id={`payment-method-${user._id}`}
                         className={styles.paymentMethodSelect}
                       >
                         <option value="Cash">Cash</option>
                         <option value="Venmo">Venmo</option>
                         <option value="Cash App">Cash App</option>
                         <option value="PayPal">PayPal</option>
                         <option value="Credit Card">Credit Card</option>
                         <option value="Apple Pay">Apple Pay</option>
                         <option value="Google Pay">Google Pay</option>
                         <option value="Check">Check</option>
                         <option value="Admin Confirmed">Admin Confirmed</option>
                       </select>
                      <button 
                        className={styles.confirmPaymentButton}
                        onClick={() => {
                          const paymentMethod = document.getElementById(`payment-method-${user._id}`).value;
                          const paymentNotes = prompt('Payment notes (optional):');
                          if (paymentNotes !== null) {
                            handleConfirmPayment(user._id, paymentMethod, paymentNotes);
                          }
                        }}
                      >
                        <FaCheckCircle /> Confirm Payment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'manage' && (
          <div className={styles.manageSection}>
            <AdminUserSearch backendUrl={backendUrl} />
          </div>
        )}
      </div>
    </div>
  );
}

// --- Edit Player Modal ---
function EditPlayerModal({ player, onSave, onClose }) {
  const [formData, setFormData] = useState({
    firstName: player.firstName || '',
    lastName: player.lastName || '',
    email: player.email || '',
    phone: player.phone || '',
    textNumber: player.textNumber || '',
    emergencyContactName: player.emergencyContactName || '',
    emergencyContactPhone: player.emergencyContactPhone || '',
    locations: player.locations || '',
    notes: player.notes || ''
  });

  const handleInputChange = (field, value) => {
    let formattedValue = value;
    
    // Format phone numbers to (xxx) xxx-xxxx
    if (field === 'phone' || field === 'textNumber' || field === 'emergencyContactPhone') {
      // Remove all non-digits
      const digitsOnly = value.replace(/\D/g, '');
      
      // Format based on length
      if (digitsOnly.length <= 3) {
        formattedValue = `(${digitsOnly}`;
      } else if (digitsOnly.length <= 6) {
        formattedValue = `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3)}`;
      } else if (digitsOnly.length <= 10) {
        formattedValue = `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
      } else {
        formattedValue = `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: formattedValue
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...player,
      ...formData
    });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Edit Player: {player.firstName} {player.lastName}</h3>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>First Name:</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                required
              />
            </div>
            <div className={styles.formField}>
              <label>Last Name:</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                required
              />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Email:</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>
                         <div className={styles.formField}>
               <label>Phone:</label>
               <input
                 type="tel"
                 value={formData.phone}
                 onChange={(e) => handleInputChange('phone', e.target.value)}
                 placeholder="(555) 123-4567"
               />
             </div>
          </div>
          <div className={styles.formRow}>
                         <div className={styles.formField}>
               <label>Text Number:</label>
               <input
                 type="tel"
                 value={formData.textNumber}
                 onChange={(e) => handleInputChange('textNumber', e.target.value)}
                 placeholder="(555) 123-4567"
               />
             </div>
            <div className={styles.formField}>
              <label>Emergency Contact Name:</label>
              <input
                type="text"
                value={formData.emergencyContactName}
                onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
              />
            </div>
          </div>
          <div className={styles.formRow}>
                         <div className={styles.formField}>
               <label>Emergency Contact Phone:</label>
               <input
                 type="tel"
                 value={formData.emergencyContactPhone}
                 onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                 placeholder="(555) 123-4567"
               />
             </div>
            <div className={styles.formField}>
              <label>Playing Locations:</label>
              <input
                type="text"
                value={formData.locations}
                onChange={(e) => handleInputChange('locations', e.target.value)}
              />
            </div>
          </div>
          <div className={styles.formField}>
            <label>Notes:</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows="3"
            />
          </div>
          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" className={styles.saveButton}>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Admin User Search (simplified) ---
function AdminUserSearch({ backendUrl }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [selectedDivisions, setSelectedDivisions] = useState({});
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetch(`${backendUrl}/admin/divisions`)
      .then(res => res.json())
      .then(data => setDivisions(data.map(d => d.name)))
      .catch(() => setDivisions([]));
  }, [backendUrl]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const res = await fetch(`${backendUrl}/admin/search-users?query=${encodeURIComponent(query)}`);
      const users = await res.json();
      setResults(users);
      // Reset selected divisions for new search
      setSelectedDivisions({});
    } catch {
      setResults([]);
      alert("Search failed");
    }
  };

  const handleAdd = async (userId, division) => {
    try {
      await fetch(`${backendUrl}/admin/user/${userId}/add-division`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ division })
      });
      handleSearch({ preventDefault: () => {} });
    } catch {
      alert("Failed to add user to division");
    }
  };

  const handleRemove = async (userId, division) => {
    try {
      await fetch(`${backendUrl}/admin/user/${userId}/remove-division`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ division })
      });
      handleSearch({ preventDefault: () => {} });
    } catch {
      alert("Failed to remove user from division");
    }
  };

  const handleDivisionChange = (userId, division) => {
    setSelectedDivisions(prev => ({
      ...prev,
      [userId]: division
    }));
  };

  const handleShowAllPlayers = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/users`);
      const users = await res.json();
      setResults(users);
      setQuery("");
    } catch (error) {
      setResults([]);
      alert("Failed to load all players");
    }
  };

  const handleEditPlayer = (player) => {
    setEditingPlayer(player);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedPlayer) => {
    try {
      const res = await fetch(`${backendUrl}/api/users/${updatedPlayer._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPlayer)
      });
      
      if (res.ok) {
        const result = await res.json();
        
        // Refresh the results to show updated data
        if (query.trim()) {
          handleSearch({ preventDefault: () => {} });
        } else {
          handleShowAllPlayers();
        }
        setShowEditModal(false);
        setEditingPlayer(null);
        alert('✅ Player updated successfully!');
      } else {
        const errorData = await res.json();
        alert(`Failed to update player: ${errorData.message || errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Failed to update unified player: ${error.message}`);
    }
  };

  return (
    <div className={styles.userSearchContainer}>
      <form onSubmit={handleSearch} className={styles.searchForm}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={styles.searchInput}
        />
        <button type="submit" className={styles.searchButton}>
          <FaSearch /> Search
        </button>
      </form>
      <button onClick={handleShowAllPlayers} className={styles.searchButton} style={{ marginLeft: '10px' }}>
        <FaUsers /> Show All Players
      </button>
      
      {results.length > 0 && (
        <div className={styles.resultsSummary}>
          <div className={styles.summaryCard}>
            <h4>📊 Player Summary</h4>
            <div className={styles.summaryStats}>
              <div className={styles.summaryStat}>
                <span className={styles.statNumber}>{results.length}</span>
                <span className={styles.statLabel}>Total Players</span>
              </div>
              <div className={styles.summaryStat}>
                <span className={styles.statNumber}>{results.filter(u => u.isLeaguePlayer).length}</span>
                <span className={styles.statLabel}>League Players</span>
              </div>
              <div className={styles.summaryStat}>
                <span className={styles.statNumber}>{results.filter(u => u.isLadderPlayer).length}</span>
                <span className={styles.statLabel}>Ladder Players</span>
              </div>
              <div className={styles.summaryStat}>
                <span className={styles.statNumber}>{results.filter(u => u.system === 'both').length}</span>
                <span className={styles.statLabel}>Both Systems</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {results.length > 0 && (
        <div className={styles.searchResults}>
          {results.map((user) => (
            <div key={user._id} className={styles.userCard}>
              <div className={styles.userInfo}>
                <div className={styles.userHeader}>
                  <h4 className={styles.userName}>
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user.name || user.email || 'Unknown User'
                    }
                  </h4>
                  <div className={styles.systemBadges}>
                    {user.system === 'league' && (
                      <span className={styles.leagueBadge}>🏆 League</span>
                    )}
                    {user.system === 'ladder' && (
                      <span className={styles.ladderBadge}>🏁 Ladder</span>
                    )}
                    {user.system === 'both' && (
                      <div className={styles.bothBadges}>
                        <span className={styles.leagueBadge}>🏆 League</span>
                        <span className={styles.ladderBadge}>🏁 Ladder</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.userContactInfo}>
                  <p className={styles.userEmail}><strong>Email:</strong> {user.email}</p>
                  <p className={styles.userPhone}><strong>Phone:</strong> {user.phone || 'Not provided'}</p>
                  {user.textNumber && (
                    <p className={styles.userTextNumber}><strong>Text:</strong> {user.textNumber}</p>
                  )}
                </div>
                <div className={styles.userDetails}>
                  <p><strong>Current Divisions:</strong> {user.divisions?.join(', ') || 'None'}</p>
                  {user.locations && (
                    <p><strong>Playing Locations:</strong> {user.locations}</p>
                  )}
                  {user.availability && (
                    <div className={styles.userAvailability}>
                      <p><strong>Availability:</strong></p>
                      <div className={styles.availabilityGrid}>
                        {Object.entries(user.availability).map(([day, times]) => (
                          times && times.length > 0 && (
                            <div key={day} className={styles.availabilityDay}>
                              <span className={styles.dayLabel}>{day}:</span>
                              <span className={styles.timeSlots}>{times.join(', ')}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                  {user.emergencyContactName && (
                    <p><strong>Emergency Contact:</strong> {user.emergencyContactName} ({user.emergencyContactPhone})</p>
                  )}
                  {user.notes && (
                    <p><strong>Notes:</strong> {user.notes}</p>
                  )}
                  {user.system === 'ladder' && (
                    <div className={styles.ladderInfo}>
                      <p><strong>Ladder:</strong> {user.ladderName}</p>
                      <p><strong>Position:</strong> #{user.position}</p>
                      <p><strong>Fargo Rate:</strong> {user.fargoRate}</p>
                      <p><strong>Status:</strong> {user.isActive ? 'Active' : 'Inactive'}</p>
                    </div>
                  )}
                  {user.system === 'both' && user.ladderInfo && (
                    <div className={styles.ladderInfo}>
                      <p><strong>Ladder:</strong> {user.ladderInfo.ladderName}</p>
                      <p><strong>Position:</strong> #{user.ladderInfo.position}</p>
                      <p><strong>Fargo Rate:</strong> {user.ladderInfo.fargoRate}</p>
                      <p><strong>Status:</strong> {user.ladderInfo.isActive ? 'Active' : 'Inactive'}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.userActions}>
                <button
                  onClick={() => handleEditPlayer(user)}
                  className={styles.editButton}
                >
                  <FaEdit /> Edit Player
                </button>
                <select
                  value={selectedDivisions[user._id] || ""}
                  onChange={(e) => handleDivisionChange(user._id, e.target.value)}
                  className={styles.divisionSelect}
                >
                  <option value="">Select Division</option>
                  {divisions.map(div => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleAdd(user._id, selectedDivisions[user._id])}
                  disabled={!selectedDivisions[user._id]}
                  className={styles.addButton}
                >
                  <FaPlus /> Add to Division
                </button>
                {user.divisions?.map(div => (
                  <button
                    key={div}
                    onClick={() => handleRemove(user._id, div)}
                    className={styles.removeButton}
                  >
                    <FaTrash /> Remove from {div}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showEditModal && editingPlayer && (
        <EditPlayerModal
          player={editingPlayer}
          onSave={handleSaveEdit}
          onClose={() => {
            setShowEditModal(false);
            setEditingPlayer(null);
          }}
        />
      )}
    </div>
  );
}

// --- Match Management Section ---
function MatchManagementSection({ backendUrl }) {
  const [divisions, setDivisions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("");

  useEffect(() => {
    fetch(`${backendUrl}/admin/divisions`)
      .then(res => res.json())
      .then(data => {
        const divs = data.map(d => d.name);
        setDivisions(divs);
        setSelectedDivision(divs[0] || "");
      })
      .catch(() => setDivisions([]));
  }, [backendUrl]);

  return (
    <div className={styles.matchManagementContainer}>
      <div className={styles.sectionHeader}>
        <h3><FaCalendarAlt /> Match Management</h3>
        <select 
          value={selectedDivision} 
          onChange={e => setSelectedDivision(e.target.value)}
          className={styles.divisionSelect}
        >
          {divisions.map(d => (<option key={d} value={d}>{d}</option>))}
        </select>
      </div>
      
      {selectedDivision && (
        <MatchManager 
          division={selectedDivision} 
          isAdmin={true} 
        />
      )}
    </div>
  );
}

// --- System Status & Monitoring ---
function SystemStatusSection({ backendUrl }) {
  const [showUnenteredModal, setShowUnenteredModal] = useState(false);
  const [systemStats, setSystemStats] = useState({});

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      const [usersRes, divisionsRes] = await Promise.all([
        fetch(`${backendUrl}/api/users`),
        fetch(`${backendUrl}/admin/divisions`)
      ]);
      
      const users = await usersRes.json();
      const divisions = await divisionsRes.json();
      
      setSystemStats({
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
        pendingRegistrations: users.filter(u => !u.isApproved).length,
        totalDivisions: divisions.length
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  return (
    <div className={styles.systemStatusContainer}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{systemStats.totalUsers || 0}</div>
          <div className={styles.statLabel}>Total Users</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{systemStats.activeUsers || 0}</div>
          <div className={styles.statLabel}>Active Users</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{systemStats.pendingRegistrations || 0}</div>
          <div className={styles.statLabel}>Pending Approvals</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{systemStats.totalDivisions || 0}</div>
          <div className={styles.statLabel}>Divisions</div>
        </div>
      </div>
      
      <div className={styles.systemActions}>
        <button 
          className={styles.systemButton}
          onClick={() => setShowUnenteredModal(true)}
        >
          <FaClipboardList /> View Unentered LMS Matches
        </button>
        <button 
          className={styles.systemButton}
          onClick={fetchSystemStats}
        >
          <FaSyncAlt /> Refresh Stats
        </button>
      </div>
      
      <UnenteredMatchesModal 
        open={showUnenteredModal} 
        onClose={() => setShowUnenteredModal(false)} 
      />
    </div>
  );
}

// --- Unified Users Workflow ---
function UnifiedUsersWorkflow({ backendUrl }) {
  const [activeTab, setActiveTab] = useState('view'); // 'view', 'add', 'edit'
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [backendUrl]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const users = await unifiedAdminService.getAllUsers();
      setUsers(users);
    } catch (err) {
      setError('Failed to fetch users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const users = await unifiedAdminService.searchUsers(searchQuery);
      setUsers(users);
    } catch (err) {
      setError('Search failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (userData) => {
    setLoading(true);
    try {
      const newUser = await unifiedAdminService.addUser(userData);
      setUsers(prev => [...prev, newUser]);
      alert('User added successfully!');
      setActiveTab('view'); // Return to view after adding
    } catch (err) {
      setError('Failed to add user: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedUser) => {
    setLoading(true);
    try {
      const updatedUserData = await unifiedAdminService.updateUser(updatedUser._id, updatedUser);
      setUsers(prev => prev.map(u => u._id === updatedUser._id ? updatedUserData : u));
      alert('User updated successfully!');
      setShowEditModal(false);
      setEditingUser(null);
    } catch (err) {
      setError('Failed to update user: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }
    setLoading(true);
    try {
      await unifiedAdminService.deleteUser(userId);
      setUsers(prev => prev.filter(u => u._id !== userId));
      alert('User deleted successfully!');
    } catch (err) {
      setError('Failed to delete user: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDivision = async (userId, division) => {
    setLoading(true);
    try {
      await unifiedAdminService.addUserDivision(userId, division);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, divisions: [...u.divisions, division] } : u));
      alert('Division added to user successfully!');
    } catch (err) {
      setError('Failed to add division to user: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDivision = async (userId, division) => {
    setLoading(true);
    try {
      await unifiedAdminService.removeUserDivision(userId, division);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, divisions: u.divisions.filter(d => d !== division) } : u));
      alert('Division removed from user successfully!');
    } catch (err) {
      setError('Failed to remove division from user: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.unifiedUsersContainer}>
      <div className={styles.tabHeader}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'view' ? styles.active : ''}`}
          onClick={() => setActiveTab('view')}
        >
          <FaUsers /> View All Users ({users.length})
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'add' ? styles.active : ''}`}
          onClick={() => setActiveTab('add')}
        >
          <FaUserPlus /> Add New User
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'edit' ? styles.active : ''}`}
          onClick={() => setActiveTab('edit')}
        >
          <FaUserCog /> Edit User
        </button>
      </div>
      
      <div className={styles.tabContent}>
        {activeTab === 'view' && (
          <div className={styles.viewUsersSection}>
            <form onSubmit={handleSearch} className={styles.searchForm}>
              <input
                type="text"
                placeholder="Search users by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              <button type="submit" className={styles.searchButton}>
                <FaSearch /> Search
              </button>
            </form>
            {loading ? (
              <div className={styles.loadingMessage}>Loading users...</div>
            ) : error ? (
              <div className={styles.errorMessage}>{error}</div>
            ) : users.length === 0 ? (
              <div className={styles.emptyState}>
                <FaUsers /> No users found. Add one to get started!
              </div>
            ) : (
              <div className={styles.userList}>
                {users.map((user) => (
                  <div key={user._id} className={styles.userCard}>
                    <div className={styles.userHeader}>
                      <h4 className={styles.userName}>
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user.name || user.email || 'Unknown User'
                        }
                      </h4>
                      <div className={styles.systemBadges}>
                        {user.system === 'league' && (
                          <span className={styles.leagueBadge}>🏆 League</span>
                        )}
                        {user.system === 'ladder' && (
                          <span className={styles.ladderBadge}>🏁 Ladder</span>
                        )}
                        {user.system === 'both' && (
                          <div className={styles.bothBadges}>
                            <span className={styles.leagueBadge}>🏆 League</span>
                            <span className={styles.ladderBadge}>🏁 Ladder</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.userContactInfo}>
                      <p className={styles.userEmail}><strong>Email:</strong> {user.email}</p>
                      <p className={styles.userPhone}><strong>Phone:</strong> {user.phone || 'Not provided'}</p>
                      {user.textNumber && (
                        <p className={styles.userTextNumber}><strong>Text:</strong> {user.textNumber}</p>
                      )}
                    </div>
                    <div className={styles.userDetails}>
                      <p><strong>Current Divisions:</strong> {user.divisions?.join(', ') || 'None'}</p>
                      {user.locations && (
                        <p><strong>Playing Locations:</strong> {user.locations}</p>
                      )}
                      {user.availability && (
                        <div className={styles.userAvailability}>
                          <p><strong>Availability:</strong></p>
                          <div className={styles.availabilityGrid}>
                            {Object.entries(user.availability).map(([day, times]) => (
                              times && times.length > 0 && (
                                <div key={day} className={styles.availabilityDay}>
                                  <span className={styles.dayLabel}>{day}:</span>
                                  <span className={styles.timeSlots}>{times.join(', ')}</span>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                      {user.emergencyContactName && (
                        <p><strong>Emergency Contact:</strong> {user.emergencyContactName} ({user.emergencyContactPhone})</p>
                      )}
                      {user.notes && (
                        <p><strong>Notes:</strong> {user.notes}</p>
                      )}
                      {user.system === 'ladder' && (
                        <div className={styles.ladderInfo}>
                          <p><strong>Ladder:</strong> {user.ladderName}</p>
                          <p><strong>Position:</strong> #{user.position}</p>
                          <p><strong>Fargo Rate:</strong> {user.fargoRate}</p>
                          <p><strong>Status:</strong> {user.isActive ? 'Active' : 'Inactive'}</p>
                        </div>
                      )}
                      {user.system === 'both' && user.ladderInfo && (
                        <div className={styles.ladderInfo}>
                          <p><strong>Ladder:</strong> {user.ladderInfo.ladderName}</p>
                          <p><strong>Position:</strong> #{user.ladderInfo.position}</p>
                          <p><strong>Fargo Rate:</strong> {user.ladderInfo.fargoRate}</p>
                          <p><strong>Status:</strong> {user.ladderInfo.isActive ? 'Active' : 'Inactive'}</p>
                        </div>
                      )}
                    </div>
                    <div className={styles.userActions}>
                      <button 
                        onClick={() => handleEditUser(user)}
                        className={styles.editButton}
                      >
                        <FaEdit /> Edit User
                      </button>
                      <select
                        value={user.system || ''}
                        onChange={(e) => {
                          const newSystem = e.target.value;
                          if (newSystem === 'league') {
                            handleRemoveDivision(user._id, 'ladder');
                            handleRemoveDivision(user._id, 'both');
                          } else if (newSystem === 'ladder') {
                            handleRemoveDivision(user._id, 'league');
                            handleRemoveDivision(user._id, 'both');
                          } else { // 'both' or ''
                            handleRemoveDivision(user._id, 'league');
                            handleRemoveDivision(user._id, 'ladder');
                          }
                          handleAddDivision(user._id, newSystem);
                        }}
                        className={styles.systemSelect}
                      >
                        <option value="">Select System</option>
                        <option value="league">League Only</option>
                        <option value="ladder">Ladder Only</option>
                        <option value="both">Both Systems</option>
                      </select>
                      <button 
                        onClick={() => handleDeleteUser(user._id)}
                        className={styles.deleteButton}
                      >
                        <FaTrash /> Delete User
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'add' && (
          <div className={styles.addUserSection}>
            <h3>Add New User</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = {
                firstName: document.getElementById('add-firstName').value,
                lastName: document.getElementById('add-lastName').value,
                email: document.getElementById('add-email').value,
                phone: document.getElementById('add-phone').value,
                textNumber: document.getElementById('add-textNumber').value,
                emergencyContactName: document.getElementById('add-emergencyContactName').value,
                emergencyContactPhone: document.getElementById('add-emergencyContactPhone').value,
                locations: document.getElementById('add-locations').value,
                notes: document.getElementById('add-notes').value,
                system: document.getElementById('add-system').value,
                isActive: true, // New users are active by default
                isApproved: true, // New users are approved by default
                isLeaguePlayer: false,
                isLadderPlayer: false,
                ladderName: '',
                position: '',
                fargoRate: '',
                availability: {},
                divisions: [],
                paymentInfo: {
                  hasPaid: false,
                  paymentDate: null,
                  paymentMethod: '',
                  paymentNotes: ''
                }
              };
              handleAddUser(formData);
            }} className={styles.addUserForm}>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>First Name:</label>
                  <input
                    type="text"
                    id="add-firstName"
                    required
                  />
                </div>
                <div className={styles.formField}>
                  <label>Last Name:</label>
                  <input
                    type="text"
                    id="add-lastName"
                    required
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Email:</label>
                  <input
                    type="email"
                    id="add-email"
                    required
                  />
                </div>
                <div className={styles.formField}>
                  <label>Phone:</label>
                  <input
                    type="tel"
                    id="add-phone"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Text Number:</label>
                  <input
                    type="tel"
                    id="add-textNumber"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className={styles.formField}>
                  <label>Emergency Contact Name:</label>
                  <input
                    type="text"
                    id="add-emergencyContactName"
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Emergency Contact Phone:</label>
                  <input
                    type="tel"
                    id="add-emergencyContactPhone"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className={styles.formField}>
                  <label>Playing Locations:</label>
                  <input
                    type="text"
                    id="add-locations"
                  />
                </div>
              </div>
              <div className={styles.formField}>
                <label>Notes:</label>
                <textarea
                  id="add-notes"
                  rows="3"
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>System:</label>
                  <select
                    id="add-system"
                    required
                  >
                    <option value="">Select System</option>
                    <option value="league">League Only</option>
                    <option value="ladder">Ladder Only</option>
                    <option value="both">Both Systems</option>
                  </select>
                </div>
              </div>
              <button type="submit" className={styles.addUserButton}>
                {loading ? 'Adding...' : 'Add User'}
              </button>
              {error && <div className={styles.errorMessage}>{error}</div>}
            </form>
          </div>
        )}

        {activeTab === 'edit' && editingUser && (
          <EditPlayerModal // Reusing EditPlayerModal for now, as it handles most fields
            player={editingUser}
            onSave={handleSaveEdit}
            onClose={() => {
              setShowEditModal(false);
              setEditingUser(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN ADMIN DASHBOARD
// ============================================================================

export default function AdminDashboard({ userToken }) {
  const [chatClient, setChatClient] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const navigate = useNavigate();

  useEffect(() => {
    const client = new StreamChat(apiKey);
    client.connectUser(
      {
        id: adminUserId,
        name: "Admin",
      },
      client.devToken(adminUserId)
    );
    setChatClient(client);
    return () => client.disconnectUser();
  }, []);

  useEffect(() => {
    if (!chatClient) return;
    const fetchChannels = async () => {
      try {
        const response = await chatClient.queryChannels({});
        setChannels(response);
      } catch (err) {
        console.error("Error fetching channels:", err);
      }
    };
    fetchChannels();
  }, [chatClient]);

  useEffect(() => {
    if (!selectedChannel) return;
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const response = await selectedChannel.getMessages();
        setMessages(response.messages);
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
      setLoading(false);
    };
    fetchMessages();
  }, [selectedChannel]);

  const showBanner = (type, message) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 5000);
  };

  if (!chatClient) return <div>Loading admin dashboard...</div>;

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className={styles.overviewSection}>
            <h2>Welcome to Admin Dashboard</h2>
            <p>Select a section below to manage your league:</p>
            
            <div className={styles.quickActions}>
              <button 
                className={styles.quickActionButton}
                onClick={() => setActiveSection('divisions')}
              >
                <FaPlus /> Create New Division
              </button>
              <button 
                className={styles.quickActionButton}
                onClick={() => setActiveSection('players')}
              >
                <FaUserPlus /> Manage Players
              </button>
              <button 
                className={styles.quickActionButton}
                onClick={() => setActiveSection('matches')}
              >
                <FaCalendarAlt /> Match Management
              </button>
              <button 
                className={styles.quickActionButton}
                onClick={() => setActiveSection('system')}
              >
                <FaCog /> System Status
              </button>
              
        <button 
          className={styles.quickActionButton}
          onClick={() => setActiveSection('ladder-applications')}
        >
          🏆 Pending Applications
        </button>
        
        <button 
          className={styles.quickActionButton}
          onClick={() => setActiveSection('simplified-admin')}
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}
        >
          🎯 Simplified Admin Dashboard
        </button>
            </div>
          </div>
        );
      
      case 'divisions':
        return <DivisionCreationWorkflow backendUrl={BACKEND_URL} onComplete={() => showBanner('success', 'Division created successfully!')} />;
      
      case 'players':
        return <PlayerManagementWorkflow backendUrl={BACKEND_URL} />;
      
      case 'matches':
        return <MatchManagementSection backendUrl={BACKEND_URL} />;
      
      case 'system':
        return <SystemStatusSection backendUrl={BACKEND_URL} />;
      
      case 'backup':
        return <GoogleSheetsBackupConfig backendUrl={BACKEND_URL} />;
      
             case 'locations':
         return <LocationManagement backendUrl={BACKEND_URL} />;
       
             case 'payments':
        return <PaymentConfiguration />;
      
             case 'payment-tracker':
        return <PaymentTracker />;
      
             case 'league-management':
        return <LeagueManagement />;
      
      case 'unified-users':
        return <UnifiedUsersWorkflow backendUrl={BACKEND_URL} />;
      
      case 'ladder-applications':
        return <LadderApplicationsManager onClose={() => setActiveSection('overview')} userToken={userToken} />;
      
      case 'simplified-admin':
        return <SimplifiedAdminDashboard />;
      
      default:
        return null;
    }
  };

  return (
    <div className={styles.adminDashboardRoot}>
      {/* Navigation Header */}
      <div className={styles.adminDashboardNav}>
        <div className={styles.navLeft}>
          <button onClick={() => { navigate('/'); window.location.reload(); }}>
            🏠 User Dashboard
          </button>
          <button onClick={() => navigate('/chat')}>💬 Back to Chat</button>
        </div>
        <div className={styles.navRight}>
          <button onClick={() => { localStorage.clear(); navigate('/'); window.location.reload(); }}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.adminDashboardMainColumn}>
        {/* Banner for feedback */}
        {banner && (
          <div className={`${styles.banner} ${styles[banner.type]}`}>
            {banner.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />} 
            {banner.message}
          </div>
        )}

        {/* Section Navigation */}
        <div className={styles.sectionNavigation}>
          <button 
            className={`${styles.sectionButton} ${activeSection === 'overview' ? styles.active : ''}`}
            onClick={() => setActiveSection('overview')}
          >
            📊 Overview
          </button>
          <button 
            className={`${styles.sectionButton} ${activeSection === 'divisions' ? styles.active : ''}`}
            onClick={() => setActiveSection('divisions')}
          >
            <FaPlus /> Divisions
          </button>
          <button 
            className={`${styles.sectionButton} ${activeSection === 'players' ? styles.active : ''}`}
            onClick={() => setActiveSection('players')}
          >
            <FaUsers /> Players
          </button>
          <button 
            className={`${styles.sectionButton} ${activeSection === 'matches' ? styles.active : ''}`}
            onClick={() => setActiveSection('matches')}
          >
            <FaCalendarAlt /> Matches
          </button>
          <button 
            className={`${styles.sectionButton} ${activeSection === 'system' ? styles.active : ''}`}
            onClick={() => setActiveSection('system')}
          >
            <FaCog /> System
          </button>
          <button 
            className={`${styles.sectionButton} ${activeSection === 'backup' ? styles.active : ''}`}
            onClick={() => setActiveSection('backup')}
          >
            <FaGoogle /> Backup
          </button>
                     <button 
             className={`${styles.sectionButton} ${activeSection === 'locations' ? styles.active : ''}`}
             onClick={() => setActiveSection('locations')}
           >
             <FaMapMarkerAlt /> Locations
           </button>
           <button 
             className={`${styles.sectionButton} ${activeSection === 'payments' ? styles.active : ''}`}
             onClick={() => setActiveSection('payments')}
           >
             💳 Payments
           </button>
           <button 
             className={`${styles.sectionButton} ${activeSection === 'payment-tracker' ? styles.active : ''}`}
             onClick={() => setActiveSection('payment-tracker')}
           >
             💰 Payment Tracker
           </button>
           <button 
             className={`${styles.sectionButton} ${activeSection === 'league-management' ? styles.active : ''}`}
             onClick={() => setActiveSection('league-management')}
           >
             📅 League Management
           </button>
           <button 
             className={`${styles.sectionButton} ${activeSection === 'unified-users' ? styles.active : ''}`}
             onClick={() => setActiveSection('unified-users')}
           >
             👥 Unified Users
           </button>
           
        <button 
          className={`${styles.sectionButton} ${activeSection === 'ladder-applications' ? styles.active : ''}`}
          onClick={() => setActiveSection('ladder-applications')}
        >
          🏆 Pending Applications
        </button>
        </div>

        {/* Active Section Content */}
        <div className={styles.sectionContent}>
          {renderActiveSection()}
        </div>
      </div>
    </div>
  );
}
