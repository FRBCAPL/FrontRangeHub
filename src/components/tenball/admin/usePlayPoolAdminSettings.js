import { useEffect, useState } from 'react';
import {
  getPlayPoolAdminSettings,
  subscribePlayPoolAdminSettings
} from './playPoolAdminStore';

export default function usePlayPoolAdminSettings() {
  const [settings, setSettings] = useState(() => getPlayPoolAdminSettings());

  useEffect(() => subscribePlayPoolAdminSettings(setSettings), []);

  return settings;
}
