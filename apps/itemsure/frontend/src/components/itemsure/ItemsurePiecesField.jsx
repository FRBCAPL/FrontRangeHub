import React, { useId, useRef, useState } from 'react';
import { checkPieces } from '../../utils/itemsureItemContent.js';
import { pluralUnit } from '../../utils/itemsureItemLook.js';
import { pieceWord } from '../../utils/itemsurePieceWord.js';

const COMMON = [6, 12, 15, 18, 24, 30];

/**
 * "One case has 24 bottles": tap a common number, or "Other" to type one. Tapping the picked
 * number again clears it. value is text. `about` is the item name and category, used to say
 * "bottles" or "napkins" instead of "items". `fallback` ({ pieces, from }) is what a blank uses.
 */
export default function ItemsurePiecesField({ unitName, value, onChange, disabled = false, hint = '', about = '', fallback = null }) {
  const id = useId();
  const inputRef = useRef(null);
  const text = String(value ?? '').trim();
  const isCommon = COMMON.some((n) => String(n) === text);
  const [other, setOther] = useState(() => text !== '' && !isCommon);
  const showOther = other || (text !== '' && !isCommon);
  const word = pieceWord(about);
  const own = checkPieces(text).pieces ?? null;
  const shown = own ?? fallback?.pieces ?? null;
  const units = pluralUnit(unitName);

  const pick = (n) => {
    setOther(false);
    onChange(text === String(n) ? '' : String(n));
  };
  const openOther = () => {
    setOther(true);
    if (isCommon) onChange('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className="isu-pieces" role="group" aria-labelledby={`${id}-q`}>
      <p className="isu-pieces-sentence" id={`${id}-q`}>
        One {unitName} has <strong className={own === null ? 'is-blank' : ''}>{shown ?? '___'}</strong> {shown === 1 ? word.one : word.many}
        {own === null && fallback ? <span className="isu-muted isu-small"> (from {fallback.from})</span> : null}
      </p>
      <div className="isu-size-presets">
        {COMMON.map((n) => (
          <button key={n} type="button" className={`isu-chip${text === String(n) ? ' is-active' : ''}`} aria-pressed={text === String(n)} disabled={disabled} onClick={() => pick(n)}>
            {n}
          </button>
        ))}
        <button type="button" className={`isu-chip${showOther ? ' is-active' : ''}`} aria-pressed={showOther} disabled={disabled} onClick={openOther}>
          Other
        </button>
      </div>
      {showOther ? (
        <label className="isu-pieces-other">
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            min="1"
            step="any"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. 500"
          />
          <span>{word.many} in one {unitName}</span>
        </label>
      ) : null}
      {shown ? <p className="isu-pieces-example">So 2 {units} = {shown * 2} {word.many}.</p> : null}
      {hint ? <p className="isu-hint">{hint}</p> : null}
    </div>
  );
}
