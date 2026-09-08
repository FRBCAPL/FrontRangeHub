import React from 'react';
import { USAPL_INFO_TOC } from '../../data/usaplInfo.js';

function blurbLines(text) {
  return String(text || '')
    .replace(/\\n/g, '\n')
    .split(/\r?\n/);
}

function Blurb({ text }) {
  return (
    <span className="usapl-info-topic-blurb">
      {blurbLines(text).map((line, index) => (
        <span key={`${index}-${line}`} className="usapl-info-topic-line">
          {line || '\u00a0'}
        </span>
      ))}
    </span>
  );
}

function onCardKey(event, id, onOpen) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onOpen(id);
  }
}

export default function UsaplInfoButtons({ onOpen }) {
  return (
    <div className="usapl-info-topics">
      {USAPL_INFO_TOC.map((item) => (
        <div
          key={item.id}
          role="button"
          tabIndex={0}
          className={`usapl-info-topic${item.id === 'faq' ? ' is-wide' : ''}`}
          onClick={() => onOpen(item.id)}
          onKeyDown={(event) => onCardKey(event, item.id, onOpen)}
        >
          <span className="usapl-info-topic-name">{item.label}</span>
          <Blurb text={item.blurb} />
          <span className="usapl-info-topic-open">Open</span>
        </div>
      ))}
    </div>
  );
}
