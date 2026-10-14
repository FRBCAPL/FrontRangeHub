import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NO_DAY, dayBehind, divisionsByDay, nameWithoutDay } from './duezyDivisionDays.js';

const divs = [
  { id: 'a', name: 'Thursday 9-Ball', play_day: 'Thursday' },
  { id: 'b', name: 'Tuesday 8-Ball A', play_day: 'Tuesday' },
  { id: 'c', name: 'Tuesday 8-Ball B', play_day: 'Tuesday' },
  { id: 'd', name: 'Floaters', play_day: null },
  { id: 'e', name: 'Monday Ladies', play_day: 'Monday' },
];

test('groups divisions by night in week order, no-night last', () => {
  const groups = divisionsByDay(divs);
  assert.deepEqual(groups.map((g) => g.key), ['Monday', 'Tuesday', 'Thursday', NO_DAY]);
  assert.deepEqual(groups[1].divisions.map((d) => d.id), ['b', 'c']);
  assert.equal(groups[1].label, 'Tuesdays');
  assert.equal(groups[1].short, 'Tue');
  assert.equal(groups[3].label, 'Other nights');
  assert.deepEqual(divisionsByDay([]), []);
});

test('drops the night from a division name on its night pill', () => {
  assert.equal(nameWithoutDay('Tuesday 8-Ball', 'Tuesday'), '8-Ball');
  assert.equal(nameWithoutDay('Tues 8-Ball', 'Tuesday'), 'Tues 8-Ball');
  assert.equal(nameWithoutDay('Tue. 8-Ball', 'Tuesday'), '8-Ball');
  assert.equal(nameWithoutDay('Tuesdays - Open', 'Tuesday'), 'Open');
  assert.equal(nameWithoutDay('Tuesday', 'Tuesday'), 'Tuesday');
  assert.equal(nameWithoutDay('8-Ball Tuesday', 'Tuesday'), '8-Ball Tuesday');
  assert.equal(nameWithoutDay('Floaters', NO_DAY), 'Floaters');
});

test('night badge adds up the late teams of its divisions', () => {
  const [, tue] = divisionsByDay(divs);
  assert.equal(dayBehind(tue, { b: 2, c: 3, a: 9 }), 5);
  assert.equal(dayBehind(tue), 0);
});
