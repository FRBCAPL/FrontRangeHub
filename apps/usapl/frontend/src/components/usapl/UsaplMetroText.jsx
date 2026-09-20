import React, { Fragment } from 'react';
import { usaplMetroLines } from '../../data/usaplDenverMetroCash.js';

export default function UsaplMetroText({ text, as: Tag = 'p', className }) {
  const lines = usaplMetroLines(text);
  return (
    <Tag className={className}>
      {lines.map((line, index) => (
        <Fragment key={`${index}-${line}`}>
          {index > 0 ? <br /> : null}
          {line}
        </Fragment>
      ))}
    </Tag>
  );
}
