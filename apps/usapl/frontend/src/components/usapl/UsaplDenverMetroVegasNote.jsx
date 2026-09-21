import React from 'react';
import { DENVER_METRO_VEGAS_NOTE } from '../../data/usaplDenverMetroCash.js';
import UsaplMetroText from './UsaplMetroText.jsx';

export default function UsaplDenverMetroVegasNote() {
  const note = DENVER_METRO_VEGAS_NOTE;
  return (
    <aside className="usapl-metro-vegas">
      <UsaplMetroText as="p" className="usapl-metro-vegas-title" text={note.title} />
      <UsaplMetroText className="usapl-metro-vegas-body" text={note.body} />
      <UsaplMetroText className="usapl-metro-vegas-aside" text={note.aside} />
    </aside>
  );
}
