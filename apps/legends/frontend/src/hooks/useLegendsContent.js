import { useEffect, useState } from 'react';
import { fetchLegendsContent } from '../services/legendsContentService.js';

/** Shared public content: visit facts, today note, karaoke host. */
export default function useLegendsContent() {
  const [content, setContent] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchLegendsContent()
      .then((data) => {
        if (!cancelled) setContent(data);
      })
      .catch(() => {
        if (!cancelled) setContent(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { content, loaded };
}
