import React from 'react';
import TableDecisionCard from './TableDecisionCard';
import styles from './SimplePoolGame.module.css';
import { FOOT_POCKET_BOTTOM, FOOT_POCKET_TOP, pocketLabelShort } from './onePocketLogic';

/** Breaker picks a foot-corner target pocket before the opening break (CSI 5-3). */
export default function OnePocketChoice({ breakerName, onChoose }) {
  return (
    <TableDecisionCard>
      <h3>Choose your pocket</h3>
      <p>
        {breakerName}, pick one foot-corner pocket for this game.
        Your opponent takes the other.
      </p>
      <div className={styles.pushOutButtons}>
        <button
          type="button"
          className={styles.pushOutChoiceButton}
          onClick={() => onChoose(FOOT_POCKET_TOP)}
        >
          {pocketLabelShort(FOOT_POCKET_TOP)}
        </button>
        <button
          type="button"
          className={styles.pushOutChoiceButton}
          onClick={() => onChoose(FOOT_POCKET_BOTTOM)}
        >
          {pocketLabelShort(FOOT_POCKET_BOTTOM)}
        </button>
      </div>
    </TableDecisionCard>
  );
}
