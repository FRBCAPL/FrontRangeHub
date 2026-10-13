import { createContext, useContext } from 'react';

/**
 * Set only inside the public demo: { history, me }. Components that would read from the database
 * (activity log, a team's payment history) use this instead when it's present.
 */
export const DuezyDemoContext = createContext(null);

export const useDuezyDemo = () => useContext(DuezyDemoContext);
