import { createContext, useContext } from 'react';
import { seasonTerms } from '../utils/duezyTerms.js';

/** The open league's Season / Session wording, provided by the league page; "season" everywhere else. */
export const SeasonTermsContext = createContext(seasonTerms(null));

export default function useSeasonTerms() {
  return useContext(SeasonTermsContext);
}
