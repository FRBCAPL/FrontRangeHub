import React, { useState } from 'react';

const HIDDEN_KEY = 'itemsure.levelsHelp.hidden';

function readHidden() {
  try {
    return window.localStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

function writeHidden(hidden) {
  try {
    if (hidden) window.localStorage.setItem(HIDDEN_KEY, '1');
    else window.localStorage.removeItem(HIDDEN_KEY);
  } catch {
    /* private browsing: the choice just isn't remembered */
  }
}

/** Plain-language explanation of "Warn me at" and "Fill up to", with a worked example. Can be hidden. */
export default function ItemsureLevelsHelp() {
  const [hidden, setHidden] = useState(readHidden);
  const toggle = (next) => {
    setHidden(next);
    writeHidden(next);
  };

  if (hidden) {
    return (
      <button type="button" className="isu-link isu-levels-help-open" onClick={() => toggle(false)}>
        How warning levels work
      </button>
    );
  }

  return (
    <section className="isu-card isu-levels-help" aria-label="How warning levels work">
      <div className="isu-card-head">
        <h2>How warning levels work</h2>
        <button type="button" className="isu-link" onClick={() => toggle(true)}>Hide</button>
      </div>
      <dl className="isu-levels-help-terms">
        <div>
          <dt>Warn me at</dt>
          <dd>When the amount drops to this number or below, the item shows as <strong>Running low</strong>.</dd>
        </div>
        <div>
          <dt>Fill up to</dt>
          <dd>How many you want after restocking. The shopping list tops you back up to this.</dd>
        </div>
      </dl>
      <p className="isu-small"><strong>Example:</strong> lemons at the Bar, warn me at 10, fill up to 40.</p>
      <ul className="isu-levels-help-example">
        <li><span className="isu-badge isu-status--danger">Running low</span> 10 or fewer</li>
        <li><span className="isu-badge isu-status--warn">Needs topping up</span> 11 to 39</li>
        <li><span className="isu-badge isu-status--ok">Full</span> exactly 40</li>
        <li><span className="isu-badge isu-status--ok">More than full</span> more than 40</li>
      </ul>
      <p className="isu-muted isu-small">
        Each place can have its own numbers. Either one can be left blank. Without &ldquo;Fill up to&rdquo; nothing goes on the shopping list;
        without &ldquo;Warn me at&rdquo; the item never shows as running low.
      </p>
    </section>
  );
}
