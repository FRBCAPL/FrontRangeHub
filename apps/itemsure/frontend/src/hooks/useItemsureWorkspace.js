import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadWorkspace, rememberActiveOrg } from '../services/itemsureOrgService.js';
import { ALL_FEATURES_ON } from '../utils/itemsureFeatures.js';

const WorkspaceContext = createContext(null);

export function ItemsureWorkspaceProvider({ session, children }) {
  const user = session.user;
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      setError('');
      setWorkspace(await loadWorkspace(user));
    } catch (e) {
      setError(e.message || 'ItemSure could not load your workspace.');
    }
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const switchOrganization = useCallback(
    async (organizationId) => {
      rememberActiveOrg(user.id, organizationId);
      await reload();
    },
    [user.id, reload],
  );

  const value = useMemo(() => {
    const permissions = new Set(workspace?.permissions || []);
    return {
      user,
      workspace,
      error,
      reload,
      switchOrganization,
      organization: workspace?.organization || null,
      features: workspace?.organization?.features || ALL_FEATURES_ON,
      can: (permission) => permissions.has(permission),
    };
  }, [user, workspace, error, reload, switchOrganization]);

  return createElement(WorkspaceContext.Provider, { value }, children);
}

export function useItemsureWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useItemsureWorkspace must be used inside ItemsureWorkspaceProvider');
  return value;
}
