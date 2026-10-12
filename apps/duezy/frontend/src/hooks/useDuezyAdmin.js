import { useEffect, useState } from 'react';
import { checkIsAdmin } from '../services/duezyAdminService.js';

/** True once the server confirms the signed-in user is a Duezy admin. Only hides/shows the link. */
export default function useDuezyAdmin(userId) {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let alive = true;
    setIsAdmin(false);
    if (userId) checkIsAdmin().then((ok) => alive && setIsAdmin(ok));
    return () => { alive = false; };
  }, [userId]);
  return isAdmin;
}
