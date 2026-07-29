import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
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
 * Reads :caseNumber from the route.
 * Allows: static OPEN_ESTATE_CASES, published estates, or estates owned by signed-in PR.
 */
export function EstateCaseProvider({ children }) {
  const { caseNumber: raw } = useParams();
  const caseNumber = normalizeEstateCaseNumber(raw);
  const [access, setAccess] = useState(() =>
    isOpenEstateCase(caseNumber) ? 'allowed' : 'checking'
  );

  useEffect(() => {
    let cancelled = false;

    if (!caseNumber) {
      setAccess('denied');
      return undefined;
    }

    if (isOpenEstateCase(caseNumber)) {
      setAccess('allowed');
      estateInventoryService.setActiveEstateCase(caseNumber);
      return undefined;
    }

    setAccess('checking');
    (async () => {
      const result = await estateInventoryService.checkEstateCaseAccessible(caseNumber);
      if (cancelled) return;
      if (result.success && result.data?.accessible) {
        estateInventoryService.setActiveEstateCase(caseNumber);
        setAccess('allowed');
      } else {
        setAccess('denied');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [caseNumber]);

  const value = useMemo(() => ({ caseNumber }), [caseNumber]);

  if (access === 'checking') {
    return (
      <main className="main-app-content">
        <p className="ei-status" style={{ padding: '1.5rem' }}>
          Opening estate…
        </p>
      </main>
    );
  }

  if (access === 'denied' || !caseNumber) {
    return (
      <Navigate to={`${ESTATEIT_PATH}/enter`} replace state={{ unknownCase: raw || '' }} />
    );
  }

  return (
    <EstateCaseContext.Provider value={value}>{children}</EstateCaseContext.Provider>
  );
}

export default EstateCaseContext;
