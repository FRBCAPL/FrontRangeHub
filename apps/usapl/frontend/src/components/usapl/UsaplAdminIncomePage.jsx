import React, { useEffect, useRef, useState } from 'react';
import {
  centsToDollars,
  chartDollarsToCents,
  dollarsToCents,
  incomeSplitOptionKey,
  parsePositiveInt,
} from '../../data/usaplIncomeProjection.js';
import { explainMissingIncomeChart } from '../../data/usaplIncomeChartNeed.js';
import { oneMatchTeamDuesCents } from '../../data/usaplIncomeTeamSize.js';
import {
  deleteUsaplIncomeSplit,
  listUsaplIncomeSplitOptions,
  projectUsaplLeagueIncome,
  saveUsaplIncomeSplit,
} from '../../services/usaplIncomeProjection.js';
import UsaplAdminIncomeForm from './UsaplAdminIncomeForm.jsx';
import UsaplAdminIncomePayout from './UsaplAdminIncomePayout.jsx';
import UsaplAdminIncomeResult from './UsaplAdminIncomeResult.jsx';
import UsaplAdminIncomeSplitEditor from './UsaplAdminIncomeSplitEditor.jsx';
import UsaplAdminSubnav from './UsaplAdminSubnav.jsx';

export default function UsaplAdminIncomePage() {
  const [splitOptions, setSplitOptions] = useState([]);
  const [teams, setTeams] = useState('12');
  const [playersPerTeam, setPlayersPerTeam] = useState('5');
  const [weeks, setWeeks] = useState('16');
  const [dues, setDues] = useState('10');
  const [chartDues, setChartDues] = useState('10');
  const [chartPlayers, setChartPlayers] = useState('5');
  const [playType, setPlayType] = useState('single');
  const [chartPlayType, setChartPlayType] = useState('single');
  const [prize, setPrize] = useState('');
  const [csi, setCsi] = useState('');
  const [lo, setLo] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [splitMessage, setSplitMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const projectSeq = useRef(0);

  const applyChartRow = (row) => {
    setDues(String(Number(row.dues_cents) / 100));
    setPlayType(row.play_type);
    if (row.players) setPlayersPerTeam(String(row.players));
  };

  const reloadAmounts = async () => {
    const options = await listUsaplIncomeSplitOptions();
    setSplitOptions(options);
    return options;
  };

  useEffect(() => {
    try {
      localStorage.removeItem('usapl_income_splits_v1');
    } catch {
      /* ignore */
    }
    reloadAmounts()
      .then((options) => {
        if (!options.length) setSetupOpen(true);
      })
      .catch((err) => setError(err?.message || 'Could not load income projection.'));
  }, []);

  useEffect(() => {
    if (!splitOptions.length) return;
    const key = incomeSplitOptionKey(Math.round(Number(dues) * 100), playType, playersPerTeam);
    const match = splitOptions.some((row) => (
      incomeSplitOptionKey(row.dues_cents, row.play_type, row.players) === key
    ));
    if (!match) applyChartRow(splitOptions[0]);
  }, [splitOptions]);

  useEffect(() => {
    const teamCount = parsePositiveInt(teams);
    const playerCount = parsePositiveInt(playersPerTeam);
    const weekCount = parsePositiveInt(weeks);
    const duesCents = dollarsToCents(dues);
    if (!teamCount || !playerCount || !weekCount || !duesCents || !splitOptions.length) {
      setResult(null);
      return undefined;
    }
    const seq = ++projectSeq.current;
    const timer = window.setTimeout(async () => {
      try {
        const data = await projectUsaplLeagueIncome({
          teams: teamCount,
          players: playerCount,
          weeks: weekCount,
          playerDuesCents: duesCents,
          playType,
        });
        if (seq !== projectSeq.current) return;
        setResult(data);
        setError('');
      } catch (err) {
        if (seq !== projectSeq.current) return;
        setResult(null);
        const message = String(err?.message || '');
        if (/no split rule|no private chart/i.test(message)) {
          setError(explainMissingIncomeChart({
            players: playerCount,
            duesCents,
            playType,
            saved: splitOptions,
          }));
        } else {
          setError(message || 'Could not project income.');
        }
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [teams, weeks, dues, playersPerTeam, playType, splitOptions]);

  const applySplitPick = (row) => {
    setChartDues(String(Number(row.dues_cents) / 100));
    setChartPlayType(row.play_type);
    if (row.players) setChartPlayers(String(row.players));
    setPrize('');
    setCsi('');
    setLo('');
  };

  const handleSaveSplit = async (event) => {
    event.preventDefault();
    const prizeCents = chartDollarsToCents(prize);
    const csiCents = chartDollarsToCents(csi);
    const loCents = chartDollarsToCents(lo);
    const duesCents = dollarsToCents(chartDues);
    const players = parsePositiveInt(chartPlayers);
    const oneMatchDues = oneMatchTeamDuesCents(duesCents, players);
    if (!duesCents || !players || prizeCents == null || csiCents == null || loCents == null) {
      setSplitMessage('Enter dues, players, and the three dollar amounts from your sheet.');
      return;
    }
    if (prizeCents + csiCents + loCents !== oneMatchDues) {
      setSplitMessage(`Prize, CSI, and league operator must add up to ${centsToDollars(oneMatchDues)} for one team, one match.`);
      return;
    }
    setBusy(true);
    try {
      await saveUsaplIncomeSplit({
        playerDuesCents: duesCents,
        players,
        playType: chartPlayType,
        prizeDollars: prizeCents / 100,
        csiDollars: csiCents / 100,
        loDollars: loCents / 100,
      });
      await reloadAmounts();
      applyChartRow({
        dues_cents: duesCents,
        play_type: chartPlayType,
        players,
      });
      setPrize('');
      setCsi('');
      setLo('');
      setSplitMessage('');
      setError('');
      setSetupOpen(false);
    } catch (err) {
      setSplitMessage(err?.message || 'Could not save that private row.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveSplit = async () => {
    const duesCents = dollarsToCents(chartDues);
    const players = parsePositiveInt(chartPlayers);
    if (!duesCents || !players) return;
    setBusy(true);
    try {
      await deleteUsaplIncomeSplit(duesCents, chartPlayType, players);
      await reloadAmounts();
      setPrize('');
      setCsi('');
      setLo('');
      setSplitMessage('Removed that private row.');
    } catch (err) {
      setSplitMessage(err?.message || 'Could not remove that row.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="usapl-page usapl-income-page">
      <UsaplAdminSubnav />
      <h1>Income</h1>
      {error ? <div className="usapl-error">{error}</div> : null}
      <UsaplAdminIncomeForm
        teams={teams}
        playersPerTeam={playersPerTeam}
        weeks={weeks}
        dues={dues}
        playType={playType}
        splitOptions={splitOptions}
        onTeams={setTeams}
        onWeeks={setWeeks}
        onPickSaved={applyChartRow}
        onOpenSetup={() => {
          setSplitMessage('');
          setSetupOpen(true);
        }}
      />
      <UsaplAdminIncomeResult result={result} />
      {result ? (
        <UsaplAdminIncomePayout
          prizeCents={result.prize_cents}
          grossCents={result.gross_cents}
          teams={result.teams}
          weeks={result.weeks}
        />
      ) : null}
      {setupOpen ? (
        <div
          className="usapl-modal-backdrop"
          role="presentation"
          onClick={() => splitOptions.length && setSetupOpen(false)}
        >
          <UsaplAdminIncomeSplitEditor
            playerDues={chartDues}
            playersPerTeam={chartPlayers}
            playType={chartPlayType}
            prize={prize}
            csi={csi}
            lo={lo}
            savedSplits={splitOptions}
            message={splitMessage}
            busy={busy}
            onClose={() => setSetupOpen(false)}
            onPlayerDues={setChartDues}
            onPlayersPerTeam={setChartPlayers}
            onPlayType={setChartPlayType}
            onPrize={setPrize}
            onCsi={setCsi}
            onLo={setLo}
            onPick={applySplitPick}
            onSave={handleSaveSplit}
            onRemove={handleRemoveSplit}
          />
        </div>
      ) : null}
    </div>
  );
}
