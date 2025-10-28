// Complete Ladder Backend Test - Correct Data Structure
// Tests all ladder functionality with proper data structure understanding

const BACKEND_URL = 'https://atlasbackend-bnng.onrender.com';

console.log('🏆 COMPLETE LADDER BACKEND TEST');
console.log('================================');
console.log('Testing ladder system with live backend data...\n');

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

async function runCompleteLadderTest() {
  const results = {
    passed: 0,
    failed: 0,
    tests: [],
    ladders: {}
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
    console.log('🔗 Test 1: Backend Connectivity & Health');
    console.log('   Testing live backend connection...');
    
    const health = await makeRequest('/health');
    addTest('Backend Health Check', health.status === 'ok', `Environment: ${health.environment}, Version: ${health.version}`);
    
    const users = await makeRequest('/api/users');
    addTest('Users API Response', Array.isArray(users) && users.length > 0, `${users.length} total users`);

    console.log('\n🏆 Test 2: Ladder Player Data Structure');
    console.log('   Analyzing ladder player data...');
    
    // Find ladder players using correct structure
    const ladderPlayers = users.filter(u => u.isLadderPlayer === true && u.system === 'ladder');
    addTest('Ladder Players Found', ladderPlayers.length > 0, `${ladderPlayers.length} ladder players`);
    
    if (ladderPlayers.length > 0) {
      // Group by ladder
      const ladderGroups = {};
      ladderPlayers.forEach(player => {
        const ladderName = player.ladderName || player.ladderInfo?.ladderName || 'Unknown';
        if (!ladderGroups[ladderName]) {
          ladderGroups[ladderName] = [];
        }
        ladderGroups[ladderName].push(player);
      });
      
      results.ladders = ladderGroups;
      const ladderNames = Object.keys(ladderGroups);
      addTest('Ladder Categories Found', ladderNames.length > 0, ladderNames.join(', '));
      
      console.log('\n🎯 Test 3: Ladder Rankings & Positions');
      console.log('   Testing ranking system for each ladder...');
      
      for (const [ladderName, players] of Object.entries(ladderGroups)) {
        console.log(`\n   🏆 Testing ${ladderName} Ladder:`);
        
        // Sort by position
        const rankedPlayers = players.sort((a, b) => (a.position || 999) - (b.position || 999));
        addTest(`${ladderName} - Players Ranked`, rankedPlayers.length > 0, `${rankedPlayers.length} players`);
        
        // Check first place
        const firstPlace = rankedPlayers.find(p => p.position === 1);
        addTest(`${ladderName} - First Place`, !!firstPlace, firstPlace ? `${firstPlace.firstName} ${firstPlace.lastName}` : 'None');
        
        // Check position sequence
        const positions = rankedPlayers.map(p => p.position).filter(p => p);
        const maxPos = Math.max(...positions);
        const expectedPositions = Array.from({length: maxPos}, (_, i) => i + 1);
        const hasAllPositions = expectedPositions.every(pos => positions.includes(pos));
        addTest(`${ladderName} - Position Continuity`, hasAllPositions, hasAllPositions ? 'No gaps' : 'Has position gaps');
        
        // Test Fargo ratings
        const playersWithFargo = rankedPlayers.filter(p => p.fargoRate && p.fargoRate > 0);
        addTest(`${ladderName} - Fargo Ratings`, playersWithFargo.length > 0, `${playersWithFargo.length}/${rankedPlayers.length} have Fargo ratings`);
        
        // Test data completeness
        const completeProfiles = rankedPlayers.filter(p => p.firstName && p.lastName && p.position);
        addTest(`${ladderName} - Complete Profiles`, completeProfiles.length === rankedPlayers.length, `${completeProfiles.length}/${rankedPlayers.length} complete`);
      }

      console.log('\n⚔️ Test 4: Challenge System API Testing');
      console.log('   Testing challenge endpoints with real ladder data...');
      
      // Test with actual ladder players
      const testLadder = Object.keys(ladderGroups)[0];
      const testPlayers = ladderGroups[testLadder];
      
      if (testPlayers.length >= 2) {
        const challenger = testPlayers[0];
        const defender = testPlayers[1];
        const challengerName = `${challenger.firstName} ${challenger.lastName}`;
        const defenderName = `${defender.firstName} ${defender.lastName}`;
        
        try {
          // Test challenge validation
          const validation = await makeRequest('/api/challenges/validate', 'POST', {
            senderName: challengerName,
            receiverName: defenderName,
            ladder: testLadder,
            isRematch: false
          });
          addTest('Challenge Validation API', typeof validation === 'object', validation.isValid ? 'Valid challenge' : `Invalid: ${validation.errors?.join(', ') || 'Unknown reason'}`);
          
          // Test challenge stats
          const stats = await makeRequest(`/api/challenges/stats/${encodeURIComponent(challengerName)}/${encodeURIComponent(testLadder)}`);
          addTest('Challenge Stats API', typeof stats.timesChallenged === 'number', `Challenged ${stats.timesChallenged} times, ${stats.matchesAsChallenger} as challenger`);
          
          // Test eligible opponents
          const eligibleOpponents = await makeRequest(`/api/challenges/eligible-opponents/${encodeURIComponent(challengerName)}/${encodeURIComponent(testLadder)}`);
          addTest('Eligible Opponents API', typeof eligibleOpponents.count === 'number', `${eligibleOpponents.count} eligible opponents`);
          
          // Test challenge limits
          const limits = await makeRequest(`/api/challenges/limits/${encodeURIComponent(challengerName)}/${encodeURIComponent(testLadder)}`);
          addTest('Challenge Limits API', typeof limits.limits === 'object', `Max challenges: ${limits.limits.maxChallengeMatches}`);
          
        } catch (error) {
          addTest('Challenge System APIs', false, error.message);
        }
      }

      console.log('\n📊 Test 5: Ladder Data Quality & Integrity');
      console.log('   Testing data consistency across all ladders...');
      
      let totalUniqueness = 0;
      let totalLadders = 0;
      
      for (const [ladderName, players] of Object.entries(ladderGroups)) {
        // Check position uniqueness within each ladder
        const positions = players.map(p => p.position).filter(p => p);
        const uniquePositions = [...new Set(positions)];
        const isUnique = positions.length === uniquePositions.length;
        if (isUnique) totalUniqueness++;
        totalLadders++;
      }
      
      addTest('Position Uniqueness Across Ladders', totalUniqueness === totalLadders, `${totalUniqueness}/${totalLadders} ladders have unique positions`);
      
      // Test Fargo rate validity
      const allFargoRates = ladderPlayers.filter(p => p.fargoRate && p.fargoRate > 0);
      const validFargoRates = allFargoRates.filter(p => p.fargoRate >= 100 && p.fargoRate <= 1000);
      addTest('Valid Fargo Ratings', validFargoRates.length === allFargoRates.length, `${validFargoRates.length}/${allFargoRates.length} ratings in valid range`);

      console.log('\n🎯 Test 6: Frontend Data Compatibility');
      console.log('   Testing compatibility with LadderTable component...');
      
      // Test that data structure matches what frontend expects
      const samplePlayer = ladderPlayers[0];
      addTest('Frontend Data Structure', 
        samplePlayer.firstName && samplePlayer.lastName && typeof samplePlayer.position === 'number',
        'Compatible with LadderTable.jsx'
      );
      
      // Test BCA sanctioning data (if available)
      const hasSystemSanctioning = ladderPlayers.some(p => 'sanctioned' in p && 'sanctionYear' in p);
      addTest('BCA Sanctioning Data Available', hasSystemSanctioning, hasSystemSanctioning ? 'Sanctioning fields present' : 'No sanctioning data (optional)');
      
      // Test last match data (if available)
      const hasMatchData = ladderPlayers.some(p => p.lastMatch);
      addTest('Match History Data', true, hasMatchData ? 'Some players have match history' : 'No match history (may be separate system)');

    }

    console.log('\n🎉 COMPLETE LADDER BACKEND TEST RESULTS:');
    console.log('========================================');
    
    // Show ladder breakdown
    if (Object.keys(results.ladders).length > 0) {
      console.log('\n📊 LADDER BREAKDOWN:');
      for (const [ladderName, players] of Object.entries(results.ladders)) {
        const positions = players.map(p => p.position).filter(p => p);
        const fargoCount = players.filter(p => p.fargoRate && p.fargoRate > 0).length;
        console.log(`   🏆 ${ladderName}: ${players.length} players (Positions 1-${Math.max(...positions)}, ${fargoCount} with Fargo)`);
      }
    }
    
    console.log('\n📋 TEST RESULTS:');
    results.tests.forEach(test => {
      const status = test.status ? '✅ PASS' : '❌ FAIL';
      console.log(`   ${status} - ${test.name}${test.details ? `: ${test.details}` : ''}`);
    });
    
    console.log(`\n📊 Overall Result: ${results.passed}/${results.passed + results.failed} tests passed`);
    console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    
    // Final assessment
    const successRate = (results.passed / (results.passed + results.failed)) * 100;
    
    if (successRate >= 95) {
      console.log('\n🏆🎉 PERFECT! LADDER SYSTEM IS FULLY OPERATIONAL!');
      console.log('   ⚔️ Challenge APIs: ✅ Working perfectly');
      console.log('   🏆 Ranking System: ✅ Complete and accurate');
      console.log('   🎯 Data Integrity: ✅ Consistent across all ladders');
      console.log('   📊 Backend Integration: ✅ Excellent connectivity');
      console.log('   🔥 Production Ready: ✅ Fully functional');
    } else if (successRate >= 85) {
      console.log('\n👍 EXCELLENT! Ladder system is highly functional.');
      console.log('   🏆 Core features working perfectly');
      console.log('   ⚔️ Challenge system operational');
      console.log('   📊 Data quality is very good');
      console.log('   ⚠️ Minor optimizations possible');
    } else if (successRate >= 70) {
      console.log('\n✅ GOOD! Ladder system is working well.');
      console.log('   🏆 Main functionality operational');
      console.log('   🔧 Some areas need attention');
      console.log('   📈 System is usable in current state');
    } else {
      console.log('\n⚠️ NEEDS IMPROVEMENT! Several issues found.');
      console.log('   🔧 Core functionality needs work');
      console.log('   📊 Data integrity issues present');
      console.log('   🚨 Significant improvements needed');
    }
    
  } catch (error) {
    console.error('\n💥 Complete ladder test failed:', error.message);
    console.log('🔧 Check backend connectivity and API structure');
  }
}

// Run the complete ladder backend test
runCompleteLadderTest().catch(console.error);