import React, { createContext, useContext, useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import {
  CASE_NUMBER,
  ESTATEIT_PATH,
  isOpenEstateCase,
  normalizeEstateCaseNumber
} from '@shared/utils/estateInventoryConstants.js';

const EstateCaseContext = createContext({
  caseNumber: CASE_NUMBER
});

export function useEstateCase() {
  return useContext(EstateCaseContext);
}

/**
 * Reads :caseNumber from the route, validates allowlist, provides to children.
 */
export function EstateCaseProvider({ children }) {
  const { caseNumber: raw } = useParams();
  const caseNumber = normalizeEstateCaseNumber(raw);

  const value = useMemo(() => ({ caseNumber }), [caseNumber]);

  if (!isOpenEstateCase(caseNumber)) {
    return <Navigate to={ESTATEIT_PATH} replace state={{ unknownCase: raw || '' }} />;
  }

  return (
    <EstateCaseContext.Provider value={value}>{children}</EstateCaseContext.Provider>
  );
}

export default EstateCaseContext;
