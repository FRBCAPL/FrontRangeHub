import React from 'react';
import { reminderText } from '../../utils/duezyMath.js';

const SAMPLE = [
  { team: { name: 'Sharks' }, owed: 40, when: 'Oct 6' },
  { team: { name: 'Rack Attack' }, owed: 80, when: 'Sep 29, Oct 6' },
];

/** Opening line and sign-off for reminders, with a live preview of the group-chat message. */
export default function DuezyReminderPrefs({ form, set }) {
  return (
    <>
      <h2 className="dz-h3">Reminder messages</h2>
      <label className="dz-field">
        <span>Opening line for group reminders <em className="dz-muted">(optional)</em></span>
        <input
          value={form.reminder_intro || ''}
          onChange={(e) => set({ reminder_intro: e.target.value })}
          placeholder="e.g. Hey everyone — friendly nudge!"
          maxLength={200}
        />
      </label>
      <label className="dz-field">
        <span>Sign reminders as <em className="dz-muted">(optional)</em></span>
        <input
          value={form.reminder_signoff || ''}
          onChange={(e) => set({ reminder_signoff: e.target.value })}
          placeholder="e.g. — Sam, league treasurer"
          maxLength={80}
        />
      </label>
      <div className="dz-field">
        <span>Preview</span>
        <pre className="dz-reminder-preview">{reminderText(form, 4, SAMPLE)}</pre>
      </div>
    </>
  );
}
