import React from 'react';

/** One line of rule text; wrap words in **double asterisks** to make them bold. */
function RuleLine({ line }) {
  const parts = String(line).split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

/** Rule body: `\n` starts a new line, `**text**` is bold. */
export default function BreakAndRunRuleText({ text }) {
  const lines = String(text || '').split(/\r?\n/);
  return lines.map((line, i) => (
    <React.Fragment key={i}>
      {i > 0 ? <br /> : null}
      <RuleLine line={line} />
    </React.Fragment>
  ));
}
