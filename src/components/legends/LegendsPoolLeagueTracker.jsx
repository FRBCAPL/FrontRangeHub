import React, { useState, useEffect } from 'react';
import './LegendsPoolLeagueTracker.css';

const LegendsPoolLeagueTracker = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(true);
  const [activeTab, setActiveTab] = useState('teams');
  const [teams, setTeams] = useState([]);
  const [tables, setTables] = useState([]);
  const [matches, setMatches] = useState([]);
  const [inactiveTeams, setInactiveTeams] = useState([]);
  const [showAddTeamForm, setShowAddTeamForm] = useState(false);
  const [showEditTeamForm, setShowEditTeamForm] = useState(false);
  const [showAddTableForm, setShowAddTableForm] = useState(false);
  const [showAddMatchForm, setShowAddMatchForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [parsedRosterData, setParsedRosterData] = useState(null);
  const [showScheduleParser, setShowScheduleParser] = useState(false);
  const [showRosterParser, setShowRosterParser] = useState(false);
  const [teamMatches, setTeamMatches] = useState([]);
  const [showTeamVerification, setShowTeamVerification] = useState(false);

  // Check if already authenticated on component mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('legends-tracker-auth');
    if (savedAuth === 'authenticated') {
      setIsAuthenticated(true);
      setShowPasswordForm(false);
      migrateData(); // Migrate data from old keys to new keys
      loadData();
    }
  }, []);

  // Migrate data from old localStorage keys to new ones
  const migrateData = () => {
    try {
      // Check if we have data in the old keys but not in the new keys
      const oldTeams = localStorage.getItem('legends-teams');
      const oldTables = localStorage.getItem('legends-tables');
      const oldMatches = localStorage.getItem('legends-matches');
      
      const newTeams = localStorage.getItem('legends-teams-main');
      const newTables = localStorage.getItem('legends-tables-main');
      const newMatches = localStorage.getItem('legends-matches-main');
      
      // If we have old data but no new data, copy it over
      if (oldTeams && !newTeams) {
        localStorage.setItem('legends-teams-main', oldTeams);
        console.log('Migrated teams data');
      }
      if (oldTables && !newTables) {
        localStorage.setItem('legends-tables-main', oldTables);
        console.log('Migrated tables data');
      }
      if (oldMatches && !newMatches) {
        localStorage.setItem('legends-matches-main', oldMatches);
        console.log('Migrated matches data');
      }
    } catch (error) {
      console.error('Error migrating data:', error);
    }
  };

  // Handle password submission
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === 'lbcleagues') {
      setIsAuthenticated(true);
      setShowPasswordForm(false);
      localStorage.setItem('legends-tracker-auth', 'authenticated');
      loadData();
    } else {
      alert('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  // Handle logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setShowPasswordForm(true);
    setPassword('');
    localStorage.removeItem('legends-tracker-auth');
  };

  // Load data from MongoDB via API
  const loadData = async () => {
    try {
      console.log('🔄 Loading data from MongoDB...');
      
      // Try to load from database first
      const [teamsResponse, tablesResponse, matchesResponse, inactiveTeamsResponse] = await Promise.all([
        fetch('http://localhost:8080/api/legends/teams'),
        fetch('http://localhost:8080/api/legends/tables'),
        fetch('http://localhost:8080/api/legends/matches'),
        fetch('http://localhost:8080/api/legends/inactive-teams')
      ]);
      
      if (teamsResponse.ok && tablesResponse.ok && matchesResponse.ok && inactiveTeamsResponse.ok) {
        const teamsData = await teamsResponse.json();
        const tablesData = await tablesResponse.json();
        const matchesData = await matchesResponse.json();
        const inactiveTeamsData = await inactiveTeamsResponse.json();
        
        setTeams(teamsData);
        setTables(tablesData);
        setMatches(matchesData);
        setInactiveTeams(inactiveTeamsData);
        
        console.log('✅ Loaded data from MongoDB:', { 
          teams: teamsData.length, 
          tables: tablesData.length, 
          matches: matchesData.length,
          inactiveTeams: inactiveTeamsData.length
        });
        
        // Debug: Check if teams have players
        teamsData.forEach(team => {
          console.log(`🔍 Team: ${team.name}, Players: ${team.players?.length || 0}`, team.players);
        });
      } else {
        console.log('⚠️ Database not available, using localStorage fallback');
        // Fallback to localStorage
        const savedTeams = localStorage.getItem('legends-teams');
        const savedTables = localStorage.getItem('legends-tables');
        const savedMatches = localStorage.getItem('legends-matches');
        
        if (savedTeams) setTeams(JSON.parse(savedTeams));
        if (savedTables) setTables(JSON.parse(savedTables));
        if (savedMatches) setMatches(JSON.parse(savedMatches));
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      // Fallback to localStorage
      const savedTeams = localStorage.getItem('legends-teams');
      const savedTables = localStorage.getItem('legends-tables');
      const savedMatches = localStorage.getItem('legends-matches');
      
      if (savedTeams) setTeams(JSON.parse(savedTeams));
      if (savedTables) setTables(JSON.parse(savedTables));
      if (savedMatches) setMatches(JSON.parse(savedMatches));
    }
  };

  // Save data to MongoDB via API
  const saveData = async () => {
    try {
      // Save to localStorage as backup
      localStorage.setItem('legends-teams', JSON.stringify(teams));
      localStorage.setItem('legends-tables', JSON.stringify(tables));
      localStorage.setItem('legends-matches', JSON.stringify(matches));
      
      console.log('💾 Data saved to localStorage as backup');
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }
  };

  // Team management
  const handleAddTeam = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const teamData = {
      name: formData.get('team-name'),
      captain: formData.get('team-captain'),
      players: formData.get('team-players').split(',').map(p => p.trim()).filter(p => p),
      contact: formData.get('team-contact'),
      location: formData.get('team-location') || 'Legends Brews & Cues',
      playDay: formData.get('team-play-day'),
      league: formData.get('team-league') || 'Unknown',
      division: formData.get('team-division') || 'Unknown',
      doublePlay: formData.get('team-double-play') === 'on'
    };
    
    try {
      console.log('🔄 Adding team to database:', teamData);
      const response = await fetch('http://localhost:8080/api/legends/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(teamData)
      });
      
      if (response.ok) {
        // Reload all data to get updated state
        await loadData();
        setShowAddTeamForm(false);
        e.target.reset();
        console.log('✅ Team added to database');
      } else {
        throw new Error('Failed to save team to database');
      }
    } catch (error) {
      console.error('❌ Error adding team:', error);
      // Fallback to local state
      const localTeamData = { ...teamData, id: Date.now() };
      setTeams([...teams, localTeamData]);
      setShowAddTeamForm(false);
      e.target.reset();
      alert('Team added locally (database unavailable)');
    }
  };

  const handleEditTeam = (team) => {
    setEditingTeam(team);
    setShowEditTeamForm(true);
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updatedTeam = {
      name: formData.get('edit-team-name'),
      captain: formData.get('edit-team-captain'),
      players: formData.get('edit-team-players').split(',').map(p => p.trim()).filter(p => p),
      contact: formData.get('edit-team-contact'),
      location: formData.get('edit-team-location'),
      playDay: formData.get('edit-team-play-day'),
      league: formData.get('edit-team-league') || 'Unknown',
      division: formData.get('edit-team-division') || 'Unknown',
      doublePlay: formData.get('edit-team-double-play') === 'on'
    };
    
    try {
      console.log('🔄 Updating team in database:', editingTeam._id, updatedTeam);
      const response = await fetch(`http://localhost:8080/api/legends/teams/${editingTeam._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedTeam)
      });
      
      if (response.ok) {
        // Reload all data to get updated state
        await loadData();
        setShowEditTeamForm(false);
        setEditingTeam(null);
        console.log('✅ Team updated in database');
      } else {
        throw new Error('Failed to update team in database');
      }
    } catch (error) {
      console.error('❌ Error updating team:', error);
      // Fallback to local state
      const localUpdatedTeam = { ...updatedTeam, _id: editingTeam._id };
      setTeams(teams.map(t => t._id === editingTeam._id ? localUpdatedTeam : t));
      setShowEditTeamForm(false);
      setEditingTeam(null);
      alert('Team updated locally (database unavailable)');
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (window.confirm('Are you sure you want to deactivate this team? It will be moved to inactive teams and can be restored later.')) {
      try {
        console.log('🔄 Soft deleting team from database:', teamId);
        const response = await fetch(`http://localhost:8080/api/legends/teams/${teamId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          // Reload all data to get updated state
          await loadData();
          console.log('✅ Team moved to inactive teams');
          alert('Team has been deactivated and moved to inactive teams. You can restore it later if needed.');
        } else {
          throw new Error('Failed to deactivate team from database');
        }
      } catch (error) {
        console.error('❌ Error deactivating team:', error);
        // Fallback to local state
        setTeams(teams.filter(t => t._id !== teamId));
        setMatches(matches.filter(m => m.team1Id !== teamId && m.team2Id !== teamId));
        alert('Team deactivated locally (database unavailable)');
      }
    }
  };

  // Team modal management
  const openTeamModal = (team) => {
    console.log('🔍 Opening team modal for:', team);
    console.log('🔍 Team players:', team.players);
    console.log('🔍 Players length:', team.players?.length || 0);
    setSelectedTeam(team);
    setShowTeamModal(true);
  };

  const closeTeamModal = () => {
    setSelectedTeam(null);
    setShowTeamModal(false);
  };

  // Inactive Teams management
  const handleRestoreTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to restore this team to active status?')) {
      return;
    }
    
    try {
      console.log('🔄 Restoring team:', teamId);
      const response = await fetch(`http://localhost:8080/api/legends/inactive-teams/${teamId}/restore`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Reload all data to get updated state
        await loadData();
        console.log('✅ Team restored successfully');
        alert('Team has been restored to active status!');
      } else {
        throw new Error('Failed to restore team');
      }
    } catch (error) {
      console.error('❌ Error restoring team:', error);
      alert('Failed to restore team: ' + error.message);
    }
  };

  const handlePermanentDelete = async (teamId) => {
    if (!window.confirm('Are you sure you want to permanently delete this team? This action cannot be undone.')) {
      return;
    }
    
    try {
      console.log('🗑️ Permanently deleting team:', teamId);
      const response = await fetch(`http://localhost:8080/api/legends/inactive-teams/${teamId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Reload all data to get updated state
        await loadData();
        console.log('✅ Team permanently deleted');
        alert('Team has been permanently deleted.');
      } else {
        throw new Error('Failed to permanently delete team');
      }
    } catch (error) {
      console.error('❌ Error permanently deleting team:', error);
      alert('Failed to permanently delete team: ' + error.message);
    }
  };

  // Table management
  const handleAddTable = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const tableData = {
      number: parseInt(formData.get('table-number')),
      location: formData.get('table-location'),
      condition: formData.get('table-condition')
    };
    
    try {
      console.log('🔄 Adding table to database:', tableData);
      const response = await fetch('http://localhost:8080/api/legends/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tableData)
      });
      
      if (response.ok) {
        const savedTable = await response.json();
        setTables([...tables, savedTable]);
        setShowAddTableForm(false);
        e.target.reset();
        console.log('✅ Table added to database:', savedTable);
      } else {
        throw new Error('Failed to save table to database');
      }
    } catch (error) {
      console.error('❌ Error adding table:', error);
      // Fallback to local state
      const localTableData = { ...tableData, id: Date.now() };
      setTables([...tables, localTableData]);
      setShowAddTableForm(false);
      e.target.reset();
      alert('Table added locally (database unavailable)');
    }
  };

  const handleDeleteTable = async (tableId) => {
    if (window.confirm('Are you sure you want to delete this table?')) {
      try {
        console.log('🔄 Deleting table from database:', tableId);
        const response = await fetch(`/api/legends/tables/${tableId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          setTables(tables.filter(t => t._id !== tableId));
          console.log('✅ Table deleted from database');
        } else {
          throw new Error('Failed to delete table from database');
        }
      } catch (error) {
        console.error('❌ Error deleting table:', error);
        // Fallback to local state
        setTables(tables.filter(t => t._id !== tableId));
        alert('Table deleted locally (database unavailable)');
      }
    }
  };

  // Match management
  const handleAddMatch = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const matchData = {
      team1: formData.get('match-team1'),
      team2: formData.get('match-team2'),
      table: parseInt(formData.get('match-table')),
      date: formData.get('match-date'),
      time: formData.get('match-time'),
      status: 'scheduled'
    };
    
    try {
      console.log('🔄 Adding match to database:', matchData);
      const response = await fetch('http://localhost:8080/api/legends/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(matchData)
      });
      
      if (response.ok) {
        // Reload all data to get updated state
        await loadData();
        setShowAddMatchForm(false);
        e.target.reset();
        console.log('✅ Match added to database');
      } else {
        throw new Error('Failed to save match to database');
      }
    } catch (error) {
      console.error('❌ Error adding match:', error);
      // Fallback to local state
      const localMatchData = { ...matchData, id: Date.now() };
      setMatches([...matches, localMatchData]);
      setShowAddMatchForm(false);
      e.target.reset();
      alert('Match added locally (database unavailable)');
    }
  };

  const handleDeleteMatch = async (matchId) => {
    if (window.confirm('Are you sure you want to delete this match?')) {
      try {
        console.log('🔄 Deleting match from database:', matchId);
        const response = await fetch(`http://localhost:8080/api/legends/matches/${matchId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          // Reload all data to get updated state
          await loadData();
          console.log('✅ Match deleted from database');
        } else {
          throw new Error('Failed to delete match from database');
        }
      } catch (error) {
        console.error('❌ Error deleting match:', error);
        // Fallback to local state
        setMatches(matches.filter(m => m._id !== matchId));
        alert('Match deleted locally (database unavailable)');
      }
    }
  };

  const handleDeleteAllMatches = async () => {
    if (window.confirm(`Are you sure you want to delete ALL ${matches.length} matches?`)) {
      try {
        console.log('🔄 Deleting all matches from database...');
        
        // Delete all matches in parallel
        const deletePromises = matches.map(match => 
          fetch(`http://localhost:8080/api/legends/matches/${match._id}`, { method: 'DELETE' })
        );
        
        const results = await Promise.all(deletePromises);
        const failedDeletes = results.filter(result => !result.ok);
        
        if (failedDeletes.length > 0) {
          console.warn(`⚠️ ${failedDeletes.length} matches failed to delete from database`);
          alert(`Warning: ${failedDeletes.length} matches could not be deleted from database`);
        }
        
        // Reload all data to get updated state
        await loadData();
        console.log('✅ All matches deleted from database');
        alert(`Successfully deleted ${matches.length} matches`);
      } catch (error) {
        console.error('❌ Error deleting all matches:', error);
        // Fallback to local state
        setMatches([]);
        alert('All matches deleted locally (database unavailable)');
      }
    }
  };

  // Save data to localStorage as backup whenever state changes
  useEffect(() => {
    saveData();
  }, [teams, tables, matches]);

  // APA Sync functions
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const scheduleText = formData.get('schedule-text');
    
    if (!scheduleText.trim()) {
      alert('Please enter schedule text');
      return;
    }
    
    try {
      console.log('🔄 Parsing schedule text...');
      const response = await fetch('http://localhost:8080/api/legends/schedule/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scheduleText })
      });
      
      if (response.ok) {
        const parsedData = await response.json();
        setParsedData(parsedData);
        console.log('✅ Schedule parsed successfully:', parsedData);
      } else {
        throw new Error('Failed to parse schedule');
      }
    } catch (error) {
      console.error('❌ Error parsing schedule:', error);
      alert('Error parsing schedule. Please check the format and try again.');
    }
  };

  const handleRosterSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const rosterText = formData.get('roster-text');
    
    if (!rosterText.trim()) {
      alert('Please enter roster text');
      return;
    }
    
    try {
      console.log('🔄 Parsing roster text...');
      const response = await fetch('http://localhost:8080/api/legends/roster/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rosterText })
      });
      
      if (response.ok) {
        const data = await response.json();
        setParsedRosterData(data);
        
        // Find potential matches with existing teams
        const matches = findTeamMatches(data.teams);
        setTeamMatches(matches);
        setShowTeamVerification(true);
        
        console.log('✅ Roster parsed successfully:', data);
        console.log('🔍 Team matches found:', matches);
      } else {
        throw new Error('Failed to parse roster');
      }
    } catch (error) {
      console.error('❌ Error parsing roster:', error);
      alert('Error parsing roster. Please check the format and try again.');
    }
  };

  const findTeamMatches = (rosterTeams) => {
    const matches = [];
    
    rosterTeams.forEach(rosterTeam => {
      // Find existing teams that might match
      const potentialMatches = teams.filter(existingTeam => {
        // Check for exact name match
        if (existingTeam.name.toLowerCase() === rosterTeam.name.toLowerCase()) {
          return true;
        }
        
        // Check for similar names (fuzzy matching)
        const similarity = calculateSimilarity(existingTeam.name.toLowerCase(), rosterTeam.name.toLowerCase());
        if (similarity > 0.7) {
          return true;
        }
        
        // Check for team number match
        if (existingTeam.teamNumber === rosterTeam.teamNumber) {
          return true;
        }
        
        return false;
      });
      
      if (potentialMatches.length > 0) {
        matches.push({
          rosterTeam,
          potentialMatches,
          needsVerification: true
        });
      }
    });
    
    return matches;
  };

  const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const handleConfirmTeamMatches = async () => {
    try {
      console.log('🔄 Confirming team matches...');
      
      // Get selected matches from the form
      const selectedMatches = [];
      teamMatches.forEach((match, index) => {
        const selectedTeamId = document.querySelector(`input[name="team-match-${index}"]:checked`)?.value;
        if (selectedTeamId) {
          selectedMatches.push({
            rosterTeam: match.rosterTeam,
            existingTeamId: selectedTeamId
          });
        }
      });
      
      if (selectedMatches.length === 0) {
        alert('Please select at least one team match to confirm');
        return;
      }
      
      // Import players for each selected match
      for (const match of selectedMatches) {
        console.log(`🔄 Importing players for team: ${match.rosterTeam.name}`);
        
        const response = await fetch(`http://localhost:8080/api/legends/teams/${match.existingTeamId}/players`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ players: match.rosterTeam.players })
        });
        
        if (response.ok) {
          console.log(`✅ Successfully imported players for ${match.rosterTeam.name}`);
        } else {
          const error = await response.json();
          console.error(`❌ Failed to import players for ${match.rosterTeam.name}:`, error);
        }
      }
      
      // Refresh data and close modal
      await loadData();
      setShowTeamVerification(false);
      alert(`Successfully imported players for ${selectedMatches.length} team(s)!`);
      
    } catch (error) {
      console.error('❌ Error confirming team matches:', error);
      alert('Error importing players. Please try again.');
    }
  };

  const importParsedData = async () => {
    if (!parsedData) {
      alert('No parsed data to import');
      return;
    }
    
    try {
      console.log('🔄 Importing parsed data to database...');
      
      // Import teams
      if (parsedData.teams && parsedData.teams.length > 0) {
        console.log('🔄 Importing teams...');
        for (const team of parsedData.teams) {
          const cleanTeam = { ...team };
          delete cleanTeam.id; // Remove id to let MongoDB generate _id
          cleanTeam.source = 'APA Schedule Parser';
          
          const response = await fetch('http://localhost:8080/api/legends/teams', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(cleanTeam)
          });
          
          if (response.ok) {
            const savedTeam = await response.json();
            console.log('✅ Team imported:', savedTeam.name);
          } else {
            console.error('❌ Failed to import team:', team.name);
          }
        }
      }
      
      // Import matches
      if (parsedData.schedules && parsedData.schedules.length > 0) {
        console.log('🔄 Importing matches...');
        for (const match of parsedData.schedules) {
          const cleanMatch = { ...match };
          delete cleanMatch.id; // Remove id to let MongoDB generate _id
          cleanMatch.table = cleanMatch.table === 'TBD' ? 1 : parseInt(cleanMatch.table);
          cleanMatch.date = new Date(cleanMatch.date);
          cleanMatch.source = 'APA Schedule Parser';
          
          const response = await fetch('http://localhost:8080/api/legends/matches', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(cleanMatch)
          });
          
          if (response.ok) {
            console.log('✅ Match imported:', `${match.team1} vs ${match.team2}`);
          } else {
            console.error('❌ Failed to import match:', `${match.team1} vs ${match.team2}`);
          }
        }
      }
      
      // Reload data to show imported items
      await loadData();
      alert('Data imported successfully!');
      
    } catch (error) {
      console.error('❌ Error importing data:', error);
      alert('Error importing data. Please try again.');
    }
  };

  const exportParsedData = () => {
    if (!parsedData) {
      alert('No parsed data to export');
      return;
    }
    
    const dataStr = JSON.stringify(parsedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'legends-schedule-data.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter matches to show only Legends teams
  const legendsMatches = matches.filter(match => {
    const legendsTeam = teams.find(t => t.name === match.team1 || t.name === match.team2);
    return legendsTeam && legendsTeam.location && legendsTeam.location.toLowerCase().includes('legends');
  });

  // Show password form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="legends-tracker">
        <div className="password-container">
          <div className="password-form">
            <div className="password-header">
              <h1>🏠 Legends Pool League Tracker</h1>
              <p>Enter password to access</p>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label htmlFor="password">Password:</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button type="submit">Access Tracker</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="legends-tracker">
      <div className="tracker-header">
        <h1>🏠 Legends Pool League Tracker</h1>
        <p>Track teams, tables, and matches at Legends Brews & Cues</p>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="tracker-nav">
        <button 
          className={`nav-tab ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          Teams
        </button>
        <button 
          className={`nav-tab ${activeTab === 'tables' ? 'active' : ''}`}
          onClick={() => setActiveTab('tables')}
        >
          Tables
        </button>
        <button 
          className={`nav-tab ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          Matches
        </button>
        <button 
          className={`nav-tab ${activeTab === 'apa-sync' ? 'active' : ''}`}
          onClick={() => setActiveTab('apa-sync')}
        >
          APA Sync
        </button>
        <button 
          className={`nav-tab ${activeTab === 'inactive-teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('inactive-teams')}
        >
          Inactive Teams
        </button>
      </div>

      {/* Teams Tab */}
      {activeTab === 'teams' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>Teams</h2>
            <button 
              className="add-btn"
              onClick={() => setShowAddTeamForm(true)}
            >
              + Add Team
            </button>
          </div>

          {showAddTeamForm && (
            <div className="form-container">
              <h3>Add New Team</h3>
              <form onSubmit={handleAddTeam}>
                <div className="form-group">
                  <label>Team Name:</label>
                  <input type="text" name="team-name" required />
                </div>
                <div className="form-group">
                  <label>Captain:</label>
                  <input type="text" name="team-captain" required />
                </div>
                <div className="form-group">
                  <label>Players (comma-separated):</label>
                  <textarea name="team-players" rows="3" placeholder="Player 1, Player 2, Player 3..." />
                </div>
                <div className="form-group">
                  <label>Contact Info:</label>
                  <input type="text" name="team-contact" placeholder="Phone or email" />
                </div>
                <div className="form-group">
                  <label>Play Day:</label>
                  <select name="team-play-day" required>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>League:</label>
                  <input type="text" name="team-league" placeholder="e.g., APA, BCA, Local League" />
                </div>
                <div className="form-group">
                  <label>Division:</label>
                  <input type="text" name="team-division" placeholder="e.g., Division A, 8-Ball, 9-Ball" />
                </div>
                <div className="form-group">
                  <label>
                    <input type="checkbox" name="team-double-play" />
                    Double Play Team (requires 2 tables)
                  </label>
                </div>
                <div className="form-actions">
                  <button type="submit">Add Team</button>
                  <button type="button" onClick={() => setShowAddTeamForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {showEditTeamForm && editingTeam && (
            <div className="form-container">
              <h3>Edit Team</h3>
              <form onSubmit={handleUpdateTeam}>
                <div className="form-group">
                  <label>Team Name:</label>
                  <input type="text" name="edit-team-name" defaultValue={editingTeam.name} required />
                </div>
                <div className="form-group">
                  <label>Captain:</label>
                  <input type="text" name="edit-team-captain" defaultValue={editingTeam.captain} required />
                </div>
                <div className="form-group">
                  <label>Players (comma-separated):</label>
                  <textarea name="edit-team-players" rows="3" defaultValue={editingTeam.players.join(', ')} />
                </div>
                <div className="form-group">
                  <label>Contact Info:</label>
                  <input type="text" name="edit-team-contact" defaultValue={editingTeam.contact} />
                </div>
                <div className="form-group">
                  <label>Location:</label>
                  <input type="text" name="edit-team-location" defaultValue={editingTeam.location || ''} />
                </div>
                <div className="form-group">
                  <label>Play Day:</label>
                  <select name="edit-team-play-day" required>
                    <option value="Monday" selected={editingTeam.playDay === 'Monday'}>Monday</option>
                    <option value="Tuesday" selected={editingTeam.playDay === 'Tuesday'}>Tuesday</option>
                    <option value="Wednesday" selected={editingTeam.playDay === 'Wednesday'}>Wednesday</option>
                    <option value="Thursday" selected={editingTeam.playDay === 'Thursday'}>Thursday</option>
                    <option value="Friday" selected={editingTeam.playDay === 'Friday'}>Friday</option>
                    <option value="Saturday" selected={editingTeam.playDay === 'Saturday'}>Saturday</option>
                    <option value="Sunday" selected={editingTeam.playDay === 'Sunday'}>Sunday</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>League:</label>
                  <input type="text" name="edit-team-league" defaultValue={editingTeam.league || ''} placeholder="e.g., APA, BCA, Local League" />
                </div>
                <div className="form-group">
                  <label>Division:</label>
                  <input type="text" name="edit-team-division" defaultValue={editingTeam.division || ''} placeholder="e.g., Division A, 8-Ball, 9-Ball" />
                </div>
                <div className="form-group">
                  <label>
                    <input type="checkbox" name="edit-team-double-play" defaultChecked={editingTeam.doublePlay} />
                    Double Play Team (requires 2 tables)
                  </label>
                </div>
                <div className="form-actions">
                  <button type="submit">Update Team</button>
                  <button type="button" onClick={() => setShowEditTeamForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="teams-grid">
            {teams.length === 0 ? (
              <div className="empty-state">
                <h3>No teams yet</h3>
                <p>Add your first team to get started!</p>
              </div>
            ) : (
              teams.map(team => (
                <div key={team._id || team.id} className="team-card compact">
                  <div className="team-header" onClick={() => openTeamModal(team)}>
                    <div className="team-title">
                      <h3>{team.name} {team.location && team.location.toLowerCase().includes('legends') ? '🏠' : ''}</h3>
                        <div className="team-summary">
                          <span className="captain">👤 {team.captain}</span>
                          <span className="play-day">📅 {team.playDay || 'Monday'}</span>
                          <span className="league">🏢 {team.league || 'Unknown'}{team.division && team.division !== 'Unknown' ? ` - ${team.division}` : ''}</span>
                          {team.doublePlay && <span className="double-play-badge">🪑 2 Tables</span>}
                        </div>
                    </div>
                    <div className="team-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="edit-btn" onClick={() => handleEditTeam(team)} title="Edit team">✏️</button>
                      <button className="delete-btn" onClick={() => handleDeleteTeam(team._id || team.id)} title="Delete team">🗑️</button>
                      <button className="info-btn" title="View details">ℹ️</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tables Tab */}
      {activeTab === 'tables' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>Tables</h2>
            <button 
              className="add-btn"
              onClick={() => setShowAddTableForm(true)}
            >
              + Add Table
            </button>
          </div>

          {showAddTableForm && (
            <div className="form-container">
              <h3>Add New Table</h3>
              <form onSubmit={handleAddTable}>
                <div className="form-group">
                  <label>Table Number:</label>
                  <input type="number" name="table-number" required />
                </div>
                <div className="form-group">
                  <label>Location:</label>
                  <input type="text" name="table-location" placeholder="e.g., Legends Brews & Cues" />
                </div>
                <div className="form-group">
                  <label>Condition:</label>
                  <select name="table-condition">
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button type="submit">Add Table</button>
                  <button type="button" onClick={() => setShowAddTableForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="tables-grid">
            {tables.length === 0 ? (
              <div className="empty-state">
                <h3>No tables yet</h3>
                <p>Add your first table to get started!</p>
              </div>
            ) : (
              tables.map(table => (
                <div key={table._id || table.id} className="table-card">
                  <div className="table-header">
                    <h3>Table {table.number}</h3>
                    <button className="delete-btn" onClick={() => handleDeleteTable(table._id || table.id)} title="Delete table">🗑️</button>
                  </div>
                  <div className="table-info">
                    <strong>Location:</strong> {table.location || 'Unknown'}
                  </div>
                  <div className="table-info">
                    <strong>Condition:</strong> {table.condition}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Matches Tab */}
      {activeTab === 'matches' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>Matches</h2>
            <div className="header-buttons">
              <button 
                className="add-btn"
                onClick={() => setShowAddMatchForm(true)}
              >
                + Schedule Match
              </button>
              {matches.length > 0 && (
                <button 
                  className="delete-all-btn"
                  onClick={handleDeleteAllMatches}
                >
                  🗑️ Delete All
                </button>
              )}
            </div>
          </div>

          {showAddMatchForm && (
            <div className="form-container">
              <h3>Schedule New Match</h3>
              <form onSubmit={handleAddMatch}>
                <div className="form-group">
                  <label>Team 1:</label>
                  <select name="match-team1" required>
                    <option value="">Select Team 1</option>
                    {teams.map(team => (
                      <option key={team._id || team.id} value={team.name}>{team.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Team 2:</label>
                  <select name="match-team2" required>
                    <option value="">Select Team 2</option>
                    {teams.map(team => (
                      <option key={team._id || team.id} value={team.name}>{team.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Table:</label>
                  <select name="match-table" required>
                    <option value="">Select Table</option>
                    {tables.map(table => (
                      <option key={table.id} value={table.number}>Table {table.number}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Date:</label>
                  <input type="date" name="match-date" required />
                </div>
                <div className="form-group">
                  <label>Time:</label>
                  <input type="time" name="match-time" required />
                </div>
                <div className="form-actions">
                  <button type="submit">Schedule Match</button>
                  <button type="button" onClick={() => setShowAddMatchForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="matches-list">
            {legendsMatches.length === 0 ? (
              <div className="empty-state">
                <h3>No Legends matches scheduled</h3>
                <p>Your Legends teams don't have any matches yet!</p>
              </div>
            ) : (
              legendsMatches.map(match => {
                const legendsTeam = teams.find(t => t.name === match.team1 || t.name === match.team2);
                const opponentTeam = match.team1 === legendsTeam?.name ? match.team2 : match.team1;
                const isHomeGame = match.team1 === legendsTeam?.name;
                const isDoublePlayMatch = legendsTeam?.doublePlay;

                return (
                  <div key={match._id || match.id} className={`match-card ${isHomeGame ? 'home-game' : 'away-game'}`}>
                    <div className="match-teams">
                      <div className="team-header">
                        <h3>{legendsTeam?.name} 🏠 vs {opponentTeam}</h3>
                        <button className="delete-btn" onClick={() => handleDeleteMatch(match._id || match.id)} title="Delete match">🗑️</button>
                      </div>
                      <div className="match-info">
                        <strong>Opponent:</strong> {opponentTeam}
                      </div>
                      <div className="match-info">
                        <strong>Game Type:</strong> {isHomeGame ? '🏠 Home Game' : '✈️ Away Game'}
                      </div>
                      <div className="match-info">
                        <strong>Table:</strong> {match.table}
                      </div>
                      {isDoublePlayMatch && (
                        <div className="match-info double-play-info">
                          <strong>⚠️ Double Play:</strong> 2 tables needed
                        </div>
                      )}
                      <div className="match-info">
                        <strong>Location:</strong> Legends
                      </div>
                    </div>
                    <div className="match-details">
                      <div className="match-time">{new Date(match.date).toLocaleDateString()} at {match.time}</div>
                      <div className="match-status">{match.status}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* APA Sync Tab */}
      {activeTab === 'apa-sync' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>APA Schedule Parser</h2>
            <button 
              className="add-btn"
              onClick={() => setShowScheduleParser(!showScheduleParser)}
            >
              {showScheduleParser ? 'Hide Parser' : 'Show Parser'}
            </button>
          </div>

          {showScheduleParser && (
            <div className="form-container">
              <h3>Parse APA Schedule</h3>
              <p>Paste the APA print schedule text below to automatically extract team and match information.</p>
              
              <form onSubmit={handleScheduleSubmit}>
                <div className="form-group">
                  <label>Schedule Text:</label>
                  <textarea 
                    name="schedule-text" 
                    rows="10" 
                    placeholder="Paste the APA schedule text here..."
                    required
                  />
                </div>
                <div className="form-actions">
                  <button type="submit">Parse Schedule</button>
                </div>
              </form>

              {parsedData && (
                <div className="sync-results">
                  <h3>Parse Results</h3>
                  <div className="results-summary">
                    <p><strong>Teams Found:</strong> {parsedData.teams?.length || 0}</p>
                    <p><strong>Matches Found:</strong> {parsedData.schedules?.length || 0}</p>
                    {parsedData.errors && parsedData.errors.length > 0 && (
                      <p><strong>Errors:</strong> {parsedData.errors.length}</p>
                    )}
                  </div>
                  
                  {parsedData.teams && parsedData.teams.length > 0 && (
                    <div className="results-section">
                      <h4>Legends Teams:</h4>
                      <ul>
                        {parsedData.teams.map((team, index) => (
                          <li key={index}>
                            <strong>{team.name}</strong> - {team.captain} ({team.location})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {parsedData.schedules && parsedData.schedules.length > 0 && (
                    <div className="results-section">
                      <h4>Legends Matches:</h4>
                      <ul>
                        {parsedData.schedules.slice(0, 5).map((match, index) => (
                          <li key={index}>
                            <strong>{match.team1}</strong> vs <strong>{match.team2}</strong> 
                            - {new Date(match.date).toLocaleDateString()} at Table {match.table}
                          </li>
                        ))}
                        {parsedData.schedules.length > 5 && (
                          <li>... and {parsedData.schedules.length - 5} more matches</li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <div className="import-actions">
                    <button 
                      className="import-btn"
                      onClick={importParsedData}
                    >
                      Import to Database
                    </button>
                    <button 
                      className="export-btn"
                      onClick={exportParsedData}
                    >
                      Export JSON
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Roster Parser Section */}
          <div className="section-header">
            <h2>APA Roster Parser</h2>
            <button 
              className="add-btn"
              onClick={() => setShowRosterParser(!showRosterParser)}
            >
              {showRosterParser ? 'Hide Roster Parser' : 'Show Roster Parser'}
            </button>
          </div>

          {showRosterParser && (
            <div className="form-container">
              <h3>Parse APA Roster</h3>
              <p>Paste the APA roster text below to extract team rosters and match them to existing teams.</p>
              
              <form onSubmit={handleRosterSubmit}>
                <div className="form-group">
                  <label>Roster Text:</label>
                  <textarea 
                    name="roster-text" 
                    rows="15" 
                    placeholder="Paste the APA roster text here..."
                    required
                  />
                </div>
                <div className="form-actions">
                  <button type="submit">Parse Roster</button>
                </div>
              </form>

              {parsedRosterData && (
                <div className="sync-results">
                  <h3>Roster Parse Results</h3>
                  <div className="results-summary">
                    <p><strong>Teams Found:</strong> {parsedRosterData.teams?.length || 0}</p>
                    <p><strong>Total Players:</strong> {parsedRosterData.teams?.reduce((total, team) => total + (team.players?.length || 0), 0) || 0}</p>
                    {parsedRosterData.errors && parsedRosterData.errors.length > 0 && (
                      <p><strong>Errors:</strong> {parsedRosterData.errors.length}</p>
                    )}
                  </div>
                  
                  {parsedRosterData.teams && parsedRosterData.teams.length > 0 && (
                    <div className="results-section">
                      <h4>Teams with Rosters:</h4>
                      <ul>
                        {parsedRosterData.teams.map((team, index) => (
                          <li key={index}>
                            <strong>{team.name}</strong> ({team.teamNumber}) - {team.players?.length || 0} players
                            <ul>
                              {team.players?.slice(0, 3).map((player, pIndex) => (
                                <li key={pIndex}>
                                  {player.name} (Skill: {player.skillLevel})
                                </li>
                              ))}
                              {team.players && team.players.length > 3 && (
                                <li>... and {team.players.length - 3} more players</li>
                              )}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Team Verification Modal */}
              {showTeamVerification && teamMatches.length > 0 && (
                <div className="modal-overlay">
                  <div className="modal-content team-verification-modal">
                    <div className="modal-header">
                      <h3>Team Verification Required</h3>
                      <button 
                        className="close-btn"
                        onClick={() => setShowTeamVerification(false)}
                      >
                        ×
                      </button>
                    </div>
                    <div className="modal-body">
                      <p>We found potential matches between roster teams and existing teams. Please verify the correct matches:</p>
                      
                      {teamMatches.map((match, index) => (
                        <div key={index} className="team-match-section">
                          <h4>Roster Team: {match.rosterTeam.name} ({match.rosterTeam.teamNumber})</h4>
                          <p><strong>Players:</strong> {match.rosterTeam.players?.length || 0}</p>
                          
                          <div className="potential-matches">
                            <h5>Potential Matches:</h5>
                            {match.potentialMatches.map((existingTeam, tIndex) => (
                              <div key={tIndex} className="match-option">
                                <label>
                                  <input 
                                    type="radio" 
                                    name={`team-match-${index}`}
                                    value={existingTeam._id || existingTeam.id}
                                  />
                                  <strong>{existingTeam.name}</strong> 
                                  {existingTeam.teamNumber && ` (${existingTeam.teamNumber})`}
                                  <br />
                                  <small>Captain: {existingTeam.captain} | Location: {existingTeam.location}</small>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="modal-footer">
                      <button 
                        className="cancel-btn"
                        onClick={() => setShowTeamVerification(false)}
                      >
                        Cancel
                      </button>
                      <button 
                        className="confirm-btn"
                        onClick={handleConfirmTeamMatches}
                      >
                        Confirm Matches
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="setup-info">
            <h3>Setup Required</h3>
            <p>This feature parses APA schedule and roster text to automatically extract team and match information for Legends teams.</p>
            <p><strong>Instructions:</strong></p>
            <ol>
              <li>Go to your APA league page and click "Print Schedule" for schedules</li>
              <li>Go to your APA league page and copy roster information for player data</li>
              <li>Paste the text into the appropriate parser above</li>
              <li>Click "Parse" to extract Legends teams, matches, and players</li>
              <li>Review the results and verify team matches</li>
              <li>Click "Import to Database" to save</li>
            </ol>
          </div>
        </div>
      )}

      {/* Inactive Teams Tab */}
      {activeTab === 'inactive-teams' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>Inactive Teams</h2>
            <p>Teams that have been deactivated but can be restored</p>
          </div>
          
          <div className="teams-grid">
            {inactiveTeams.length === 0 ? (
              <div className="no-data">
                <p>No inactive teams found</p>
              </div>
            ) : (
              inactiveTeams.map(team => (
                <div key={team._id || team.id} className="team-card inactive">
                  <div className="team-header">
                    <h3>{team.name} {team.location && team.location.toLowerCase().includes('legends') ? '🏠' : ''}</h3>
                    <div className="team-actions">
                      <button className="restore-btn" onClick={() => handleRestoreTeam(team._id || team.id)} title="Restore team">↩️</button>
                      <button className="delete-btn" onClick={() => handlePermanentDelete(team._id || team.id)} title="Permanently delete">🗑️</button>
                    </div>
                  </div>
                  <div className="team-info">
                    <strong>Captain:</strong> {team.captain}
                  </div>
                  <div className="team-info">
                    <strong>Location:</strong> {team.location || 'Unknown'}
                  </div>
                  <div className="team-info">
                    <strong>Players:</strong> {team.players.join(', ')}
                  </div>
                  <div className="team-info">
                    <strong>Contact:</strong> {team.contact}
                  </div>
                  <div className="team-info">
                    <strong>Play Day:</strong> {team.playDay || 'Monday'}
                  </div>
                  <div className="team-info">
                    <strong>Division:</strong> {team.division || 'Unknown'}
                  </div>
                  <div className="team-info">
                    <strong>Total Players:</strong> {team.players.length}
                  </div>
                  <div className="team-info">
                    <strong>Double Play:</strong> {team.doublePlay ? 'Yes (2 tables needed)' : 'No'}
                  </div>
                  <div className="team-info inactive-info">
                    <strong>Deactivated:</strong> {new Date(team.deletedAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Team Details Modal */}
      {showTeamModal && selectedTeam && (
        <div className="modal-overlay" onClick={closeTeamModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTeam.name} {selectedTeam.location && selectedTeam.location.toLowerCase().includes('legends') ? '🏠' : ''}</h2>
              <button className="close-btn" onClick={closeTeamModal}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="team-details-grid">
                <div className="detail-section">
                  <h3>👤 Team Information</h3>
                  <div className="detail-row">
                    <div className="detail-item">
                      <strong>Captain:</strong> {selectedTeam.captain}
                    </div>
                    <div className="detail-item">
                      <strong>Play Day:</strong> {selectedTeam.playDay || 'Monday'}
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-item">
                      <strong>League:</strong> {selectedTeam.league || 'Unknown'}{selectedTeam.division && selectedTeam.division !== 'Unknown' ? ` - ${selectedTeam.division}` : ''}
                    </div>
                    <div className="detail-item">
                      <strong>Location:</strong> {selectedTeam.location || 'Unknown'}
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-item">
                      <strong>Double Play:</strong> {selectedTeam.doublePlay ? 'Yes (2 tables needed)' : 'No'}
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>👥 Players ({selectedTeam.players.length})</h3>
                  {selectedTeam.players.length > 0 ? (
                    <div className="players-list">
                      {selectedTeam.players.map((player, index) => (
                        <div key={index} className="player-item">
                          {index + 1}. {player}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-players">No players listed</div>
                  )}
                </div>

                <div className="detail-section">
                  <h3>📞 Additional Information</h3>
                  <div className="detail-row">
                    <div className="detail-item">
                      <strong>Contact:</strong> {selectedTeam.contact || 'No contact info'}
                    </div>
                    {selectedTeam.teamNumber && (
                      <div className="detail-item">
                        <strong>Team Number:</strong> {selectedTeam.teamNumber}
                      </div>
                    )}
                  </div>
                  {selectedTeam.source && (
                    <div className="detail-item">
                      <strong>Source:</strong> {selectedTeam.source}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="edit-btn" onClick={() => {
                closeTeamModal();
                handleEditTeam(selectedTeam);
              }}>
                ✏️ Edit Team
              </button>
              <button className="delete-btn" onClick={() => {
                closeTeamModal();
                handleDeleteTeam(selectedTeam._id || selectedTeam.id);
              }}>
                🗑️ Delete Team
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegendsPoolLeagueTracker;
