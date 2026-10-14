import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignDivisions,
  duplicateNames,
  guessColumns,
  isHeadingRow,
  matchDivision,
  parseRosterText,
  rowsToTeams,
  teamToLine,
  textToRows,
} from './duezyRoster.js';

test('cells copied from Excel or Google Sheets (tabs) are split into columns', () => {
  const teams = parseRosterText('Sharks\tBobby King\t(719) 555-0123\tAna\tLee\nCue Balls\t\tana@email.com');
  assert.deepEqual(teams, [
    { name: 'Sharks', captain: 'Bobby King', contact: '719-555-0123', players: ['Ana', 'Lee'], division: null },
    { name: 'Cue Balls', captain: null, contact: 'ana@email.com', players: [], division: null },
  ]);
});

test('a heading row is skipped and used to place columns', () => {
  const text = 'Captain,Team Name,Division,Email,Phone,Player 2,Player 3\nBobby,Sharks,Tue 8-Ball,b@x.com,7195550123,Ana,\nKim,Rails,Thu,,,,';
  assert.deepEqual(parseRosterText(text), [
    { name: 'Sharks', captain: 'Bobby', contact: 'b@x.com', players: ['Ana'], division: 'Tue 8-Ball' },
    { name: 'Rails', captain: 'Kim', contact: null, players: [], division: 'Thu' },
  ]);
});

test('quoted CSV cells keep their commas; a players cell can hold a list', () => {
  const rows = textToRows('Team,Players\n"Smith, Jones & Co","Ana, Lee; Sam"');
  assert.deepEqual(rows[1], ['Smith, Jones & Co', 'Ana, Lee; Sam']);
  assert.deepEqual(parseRosterText('Team,Players\n"Smith, Jones & Co","Ana, Lee; Sam"')[0].players, ['Ana', 'Lee', 'Sam']);
});

test('data rows are not mistaken for headings', () => {
  assert.equal(isHeadingRow(['Sharks', 'Bobby', '719-555-0123']), false);
  assert.equal(isHeadingRow(['Team', 'Captain']), true);
  assert.equal(isHeadingRow(['Teams']), true);
  assert.equal(isHeadingRow(['Team Rocket', 'jo@x.com']), false);
});

test('no headings: columns guessed from the data', () => {
  const rows = [['Sharks', 'Bobby', 'Ana', '719-555-0123'], ['Rails', 'Kim', '', 'kim@x.com']];
  const guess = guessColumns(rows);
  assert.equal(guess.hasHeadings, false);
  assert.deepEqual(guess.kinds, ['name', 'captain', 'players', 'contact']);
  assert.equal(rowsToTeams(rows, guess.kinds)[0].contact, '719-555-0123');
});

test('a sheet without a team column uses the first player column (individual leagues)', () => {
  assert.deepEqual(guessColumns([['Player', 'Phone'], ['Ana', '303-555-0101']]).kinds, ['name', 'contact']);
});

test('the captain is not repeated as a player; blanks rows are dropped', () => {
  const teams = rowsToTeams([['Sharks', 'Bobby', 'Bobby', 'Ana'], ['', 'x']], ['name', 'captain', 'players', 'players']);
  assert.deepEqual(teams.map((t) => [t.name, t.players]), [['Sharks', ['Ana']]]);
});

test('division names match loosely', () => {
  const divisions = [{ id: 'a', name: 'Tuesday 8-Ball' }, { id: 'b', name: 'Thursday Darts Division' }];
  assert.equal(matchDivision('tuesday 8 ball', divisions), 'a');
  assert.equal(matchDivision('Thursday Darts', divisions), 'b');
  assert.equal(matchDivision('Friday', divisions), null);
  assert.equal(matchDivision('', divisions), null);
});

test('teams are sent to the division named in their row', () => {
  const divisions = [{ id: 'a', name: 'Tuesday' }, { id: 'b', name: 'Thursday' }];
  const { teams, unmatched } = assignDivisions(
    [{ name: 'Sharks', division: 'tuesday' }, { name: 'Rails', division: 'Friday' }, { name: 'Jets', division: null }],
    divisions
  );
  assert.deepEqual(teams.map((t) => t.division_id || null), ['a', null, null]);
  assert.deepEqual(unmatched, ['Friday']);
  assert.equal(assignDivisions([{ name: 'X', division: 'Tuesday' }], [divisions[0]]).teams[0].division_id, undefined);
});

test('duplicate names within the list and against existing teams', () => {
  const dupes = duplicateNames([{ name: 'Sharks' }, { name: 'sharks' }, { name: 'Rails' }, { name: 'Jets' }], ['JETS']);
  assert.deepEqual([...dupes].sort(), ['jets', 'sharks']);
});

test('a team written back to a line reads the same', () => {
  const team = { name: 'Sharks', captain: null, contact: '719-555-0123', players: ['Ana', 'Lee'], division: null };
  assert.equal(teamToLine(team), 'Sharks, , 719-555-0123, Ana, Lee');
  assert.deepEqual(parseRosterText(teamToLine(team))[0], team);
  assert.equal(teamToLine({ name: 'Rails', captain: 'Kim', players: [] }), 'Rails, Kim');
});
