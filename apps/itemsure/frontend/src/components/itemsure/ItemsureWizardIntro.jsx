import React from 'react';

/** Heading and one plain sentence at the top of each Add / Edit item step. */
export default function ItemsureWizardIntro({ title, children }) {
  return (
    <header className="isu-wizard-intro">
      <h2 className="isu-wizard-title">{title}</h2>
      {children ? <p className="isu-muted">{children}</p> : null}
    </header>
  );
}
