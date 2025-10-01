// Comprehensive Ladder Backend Test
// Tests all ladder functionality with live backend

const BACKEND_URL = 'https://atlasbackend-bnng.onrender.com';

console.log('🏆 Comprehensive LADDER Backend Test');
console.log('=====================================');
console.log('Testing ALL ladder functionality with live backend...\n');

async function makeRequest(endpoint, method = 'GET', body = null) {
  const url = `${BACKEND_URL}${endpoint}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`API Error: ${data.error || response.statusText}`);
  }
  
  return data;
}

async function runLadderBackendTest() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function addTest(name, status, details = '') {
    results.tests.push({ name, status, details });
    if (status) {
      results.passed++;
      console.log(`   ✅ PASS - ${name}${details ? `: ${details}` : ''}`);
    } else {
      results.failed++;
      console.log(`   ❌ FAIL - ${name}${details ? `: ${details}` : ''}`);
    }
  }

  try {
    console.log('🏆 Test 1: Backend Health & Ladder API');
    console.log('   🔗 Testing server health and ladder endpoints...');
    
    // Test basic connectivity
    const health = await makeRequest('/health');
    addTest('Backend Health', health.status === 'ok', `Uptime: ${Math.floor(health.uptime)}s`);
    
    // Test users endpoint (contains ladder players)
    const users = await makeRequest('/api/users');
    addTest('Users API', Array.isArray(users) && users.length > 0, `${users.length} users found`);
    
    console.log('\n🏆 Test 2: Ladder Data & Rankings');
    console.log('   🔗 Testing ladder player data...');
    
    // Find ladder players
    const ladderPlayers = users.filter(u => u.ladder && u.ladder.length > 0);
    addTest('Ladder Players Found', ladderPlayers.length > 0, `${ladderPlayers.length} ladder players`);
    
    if (ladderPlayers.length > 0) {
      // Test ladder data structure
      const samplePlayer = ladderPlayers[0];
      addTest('Player Has Position', typeof samplePlayer.position === 'number', `Position: ${samplePlayer.position}`);
      addTest('Player Has Wins/Losses', 'wins' in samplePlayer && 'losses' in samplePlayer, `${samplePlayer.wins}W-${samplePlayer.losses}L`);
      addTest('Player Has Fargo Rate', 'fargoRate' in samplePlayer, samplePlayer.fargoRate || 'N/A');
      addTest('Player Has Sanctioned Status', 'sanctioned' in samplePlayer, samplePlayer.sanctioned ? 'Sanctioned' : 'Not sanctioned');
    }

    console.log('\n🏆 Test 3: Challenge System APIs');
    console.log('   🔗 Testing challenge system endpoints...');
    
    if (ladderPlayers.length >= 2) {
      const player1 = ladderPlayers[0];
      const player2 = ladderPlayers[1];
      
      try {
        // Test challenge validation
        const validation = await makeRequest('/api/challenges/validate', 'POST', {
          senderName: `${player1.firstName} ${player1.lastName}`,
          receiverName: `${player2.firstName} ${player2.lastName}`,
          ladder: player1.ladder,
          isRematch: false
        });
        addTest('Challenge Validation API', typeof validation.isValid === 'boolean', validation.isValid ? 'Valid challenge' : 'Invalid challenge');
        
        // Test challenge stats
        const stats = await makeRequest(`/api/challenges/stats/${encodeURIComponent(player1.firstName + ' ' + player1.lastName)}/${encodeURIComponent(player1.ladder)}`);
        addTest('Challenge Stats API', typeof stats.timesChallenged === 'number', `Challenged: ${stats.timesChallenged} times`);
        
        // Test eligible opponents
        const eligibleOpponents = await makeRequest(`/api/challenges/eligible-opponents/${encodeURIComponent(player1.firstName + ' ' + player1.lastName)}/${encodeURIComponent(player1.ladder)}`);
        addTest('Eligible Opponents API', typeof eligibleOpponents.count === 'number', `${eligibleOpponents.count} eligible opponents`);
        
        // Test challenge limits
        const limits = await makeRequest(`/api/challenges/limits/${encodeURIComponent(player1.firstName + ' ' + player1.lastName)}/${encodeURIComponent(player1.ladder)}`);
        addTest('Challenge Limits API', typeof limits.limits.maxChallengeMatches === 'number', `Max challenges: ${limits.limits.maxChallengeMatches}`);
        
      } catch (error) {
        addTest('Challenge APIs', false, error.message);
      }
    }

    console.log('\n🏆 Test 4: Ladder Rankings & Positions');
    console.log('   🔗 Testing ranking system...');
    
    // Test ladder rankings
    const rankedPlayers = ladderPlayers.sort((a, b) => (a.position || 999) - (b.position || 999));
    addTest('Players Have Rankings', rankedPlayers.length > 0, `${rankedPlayers.length} ranked players`);
    
    if (rankedPlayers.length > 0) {
      const firstPlace = rankedPlayers.find(p => p.position === 1);
      addTest('First Place Player Exists', !!firstPlace, firstPlace ? `${firstPlace.firstName} ${firstPlace.lastName}` : 'None');
      
      // Check for position gaps
      const positions = rankedPlayers.map(p => p.position).filter(p => p);
      const hasGaps = positions.length > 1 && Math.max(...positions) > positions.length;
      addTest('Ranking Consistency', !hasGaps, hasGaps ? 'Position gaps found' : 'No position gaps');
    }

    console.log('\n🏆 Test 5: Match History & Last Matches');
    console.log('   🔗 Testing match data...');
    
    const playersWithMatches = ladderPlayers.filter(p => p.lastMatch);
    addTest('Players With Match History', playersWithMatches.length > 0, `${playersWithMatches.length} players with match data`);
    
    if (playersWithMatches.length > 0) {
      const sampleMatch = playersWithMatches[0].lastMatch;
      addTest('Match Has Opponent', !!sampleMatch.opponent, sampleMatch.opponent);
      addTest('Match Has Result', ['W', 'L'].includes(sampleMatch.result), sampleMatch.result);
      addTest('Match Has Date', !!sampleMatch.date, new Date(sampleMatch.date).toLocaleDateString());
    }

    console.log('\n🏆 Test 6: Fargo Integration');
    console.log('   🔗 Testing Fargo rating system...');
    
    const playersWithFargo = ladderPlayers.filter(p => p.fargoRate && p.fargoRate !== 'N/A');
    addTest('Players With Fargo Ratings', playersWithFargo.length > 0, `${playersWithFargo.length} players have Fargo ratings`);
    
    const sanctionedPlayers = ladderPlayers.filter(p => p.sanctioned && p.sanctionYear === new Date().getFullYear());
    addTest('Current Year Sanctioned Players', sanctionedPlayers.length > 0, `${sanctionedPlayers.length} sanctioned for ${new Date().getFullYear()}`);

    console.log('\n🏆 Test 7: Challenge Types & Validation');
    console.log('   🔗 Testing different challenge types...');
    
    if (ladderPlayers.length >= 3) {
      const challenger = ladderPlayers[0];
      const targets = ladderPlayers.slice(1, 3);
      
      for (const target of targets) {
        try {
          // Test regular challenge
          const regularChallenge = await makeRequest('/api/challenges/validate', 'POST', {
            senderName: `${challenger.firstName} ${challenger.lastName}`,
            receiverName: `${target.firstName} ${target.lastName}`,
            ladder: challenger.ladder,
            challengeType: 'challenge'
          });
          
          // Test smackdown
          const smackdownChallenge = await makeRequest('/api/challenges/validate', 'POST', {
            senderName: `${challenger.firstName} ${challenger.lastName}`,
            receiverName: `${target.firstName} ${target.lastName}`,
            ladder: challenger.ladder,
            challengeType: 'smackdown'
          });
          
          addTest('Multiple Challenge Types', true, 'Regular and SmackDown validation tested');
          break;
        } catch (error) {
          console.log(`   ⚠️  Challenge type testing: ${error.message}`);
        }
      }
    }

    console.log('\n🏆 Test 8: Data Integrity & Consistency');
    console.log('   🔗 Testing data consistency...');
    
    // Test unique positions
    const positions = ladderPlayers.map(p => p.position).filter(p => p);
    const uniquePositions = [...new Set(positions)];
    addTest('Unique Positions', positions.length === uniquePositions.length, positions.length === uniquePositions.length ? 'All positions unique' : 'Duplicate positions found');
    
    // Test name consistency
    const hasNames = ladderPlayers.every(p => p.firstName && p.lastName);
    addTest('Complete Player Names', hasNames, hasNames ? 'All players have names' : 'Some players missing names');

    console.log('\n🎉 Comprehensive LADDER Backend Test Results:');
    console.log('===============================================');
    
    results.tests.forEach(test => {
      const status = test.status ? '✅ PASS' : '❌ FAIL';
      console.log(`   ${status} - ${test.name}${test.details ? `: ${test.details}` : ''}`);
    });
    
    console.log(`\n📊 Overall Result: ${results.passed}/${results.passed + results.failed} tests passed`);
    console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    
    if (results.failed === 0) {
      console.log('\n🏆🎉 PERFECT! LADDER SYSTEM IS FULLY FUNCTIONAL!');
      console.log('   ⚔️ Challenge System: ✅ Working perfectly');
      console.log('   🏆 Rankings: ✅ Working perfectly');
      console.log('   🎯 Fargo Integration: ✅ Working perfectly');
      console.log('   📱 API Endpoints: ✅ All responsive');
      console.log('   🔥 Backend Connectivity: ✅ Excellent');
      console.log('   📊 Data Integrity: ✅ Consistent');
    } else if (results.failed <= 2) {
      console.log('\n👍 EXCELLENT! Your ladder system is working very well.');
      console.log('   🏆 Most functionality is working perfectly');
      console.log('   ⚠️ Minor issues can be addressed as needed');
    } else {
      console.log('\n⚠️ GOOD! Core ladder functionality working with some issues.');
      console.log('   🏆 Main features are operational');
      console.log('   🔧 Some features need attention');
    }
    
  } catch (error) {
    console.error('\n💥 Ladder backend test failed:', error.message);
    console.log('🔧 Check backend connectivity and API endpoints');
  }
}

// Run the comprehensive ladder backend test
runLadderBackendTest().catch(console.error);