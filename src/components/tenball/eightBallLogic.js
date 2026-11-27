/** CSI / BCA-style 8-ball helpers (solids 1–7, stripes 9–15, money ball 8). */

export const GROUP_SOLIDS = 'solids';
export const GROUP_STRIPES = 'stripes';

export function isSolid(id) {
  return id >= 1 && id <= 7;
}

export function isStripe(id) {
  return id >= 9 && id <= 15;
}

export function groupForBall(id) {
  if (isSolid(id)) return GROUP_SOLIDS;
  if (isStripe(id)) return GROUP_STRIPES;
  return null;
}

export function oppositeGroup(group) {
  if (group === GROUP_SOLIDS) return GROUP_STRIPES;
  if (group === GROUP_STRIPES) return GROUP_SOLIDS;
  return null;
}

export function groupLabel(group) {
  if (group === GROUP_SOLIDS) return 'Solids';
  if (group === GROUP_STRIPES) return 'Stripes';
  return 'Open';
}

export function liveGroupBalls(balls, group) {
  return (balls || []).filter((ball) => (
    ball.visible && !ball.pocketed && groupForBall(ball.id) === group
  ));
}

export function tableIsOpen(groups) {
  return !groups?.[1] && !groups?.[2];
}

export function playerClearedGroup(balls, group) {
  if (!group) return false;
  return liveGroupBalls(balls, group).length === 0;
}

export function isOnEight(balls, groups, player) {
  const group = groups?.[player];
  return Boolean(group && playerClearedGroup(balls, group));
}

/** Balls the shooter may legally hit first. */
export function legalObjectBallIds(balls, groups, player, { isBreak = false } = {}) {
  const live = (balls || []).filter((ball) => ball.visible && !ball.pocketed);
  if (isBreak) return live.map((ball) => ball.id);

  if (tableIsOpen(groups)) {
    return live.filter((ball) => ball.id !== 8).map((ball) => ball.id);
  }

  const group = groups?.[player];
  if (!group) return live.filter((ball) => ball.id !== 8).map((ball) => ball.id);

  if (playerClearedGroup(balls, group)) {
    return live.some((ball) => ball.id === 8) ? [8] : [];
  }

  return liveGroupBalls(balls, group).map((ball) => ball.id);
}

/**
 * After a legal (non-foul) shot on an open table, assign groups from the first
 * group ball pocketed this shot. 8-ball alone never assigns.
 */
export function assignGroupsFromShot(groups, pocketedIds, shooter) {
  if (!tableIsOpen(groups)) return groups;
  const groupBall = (pocketedIds || []).find((id) => groupForBall(id));
  if (!groupBall) return groups;
  const shooterGroup = groupForBall(groupBall);
  return {
    1: shooter === 1 ? shooterGroup : oppositeGroup(shooterGroup),
    2: shooter === 2 ? shooterGroup : oppositeGroup(shooterGroup)
  };
}

/** True when the shooter pocketed at least one of their (or open-table) group balls. */
export function shotContinuesInEight(pocketedIds, groupsBefore, shooter) {
  const groupBalls = (pocketedIds || []).filter((id) => id !== 8 && groupForBall(id));
  if (groupBalls.length === 0) return false;
  if (tableIsOpen(groupsBefore)) return true;
  const group = groupsBefore?.[shooter];
  if (!group) return true;
  return groupBalls.some((id) => groupForBall(id) === group);
}

/** Result when the 8 is pocketed this shot. */
export function eightPocketOutcome({
  balls,
  groups,
  shooter,
  foul,
  calledPocket,
  eightPocketId,
  isBreakShot
}) {
  if (isBreakShot) {
    return { type: 'spot' }; // 8 on the break is spotted; breaker continues if otherwise legal
  }

  const onEight = isOnEight(balls, groups, shooter);
  if (!onEight) {
    return { type: 'loss', reason: 'early-eight' };
  }
  if (foul === 'scratch') {
    return { type: 'loss', reason: 'scratch-on-eight' };
  }
  if (foul) {
    return { type: 'loss', reason: 'foul-on-eight' };
  }
  if (calledPocket && eightPocketId && calledPocket !== eightPocketId) {
    return { type: 'loss', reason: 'wrong-pocket' };
  }
  // Require a called pocket when shooting the 8.
  if (!calledPocket) {
    return { type: 'loss', reason: 'no-call' };
  }
  return { type: 'win' };
}
