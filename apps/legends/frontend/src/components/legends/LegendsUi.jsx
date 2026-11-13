import React from 'react';
import { Link } from 'react-router-dom';

export function ButtonLink({ to, children, variant = 'primary', size = 'md' }) {
  return (
    <Link to={to} className={`lg-btn lg-btn--${variant} lg-btn--${size}`}>
      {children}
    </Link>
  );
}

export function Eyebrow({ children, className = '' }) {
  return <p className={`lg-eyebrow ${className}`}>{children}</p>;
}

export function SectionHeading({ id, eyebrow, title }) {
  return (
    <div>
      {eyebrow ? <Eyebrow className="lg-eyebrow--above">{eyebrow}</Eyebrow> : null}
      <h2 id={id} className="lg-display lg-display--section">
        {title}
      </h2>
    </div>
  );
}

export function PageIntro({ eyebrow, title, children }) {
  return (
    <>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="lg-display lg-display--page">{title}</h1>
      {children}
    </>
  );
}

export function MoreLink() {
  return (
    <span className="lg-more">
      Learn more <span aria-hidden="true">→</span>
    </span>
  );
}
