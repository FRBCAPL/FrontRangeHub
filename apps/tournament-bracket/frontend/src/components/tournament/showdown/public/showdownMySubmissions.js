/** Phone-side memory of scores this device sent, so players can see pending / approved / rejected. */
export const MY_SUBMISSIONS_KEY = 'frontrange-showdown-my-submissions';
const LIMIT = 30;

function read() {
  try {
    const list = JSON.parse(localStorage.getItem(MY_SUBMISSIONS_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(MY_SUBMISSIONS_KEY, JSON.stringify(list.slice(0, LIMIT)));
  } catch {
    /* private mode: statuses still show until the page is closed */
  }
}

export function listMySubmissions(eventId) {
  return read().filter((s) => s.eventId === eventId);
}

export function rememberSubmission(entry) {
  write([entry, ...read().filter((s) => s.id !== entry.id)]);
}

export function updateSubmission(id, patch) {
  write(read().map((s) => (s.id === id ? { ...s, ...patch } : s)));
}

export const SUBMISSION_STATUS_TEXT = {
  pending: 'Waiting for the director',
  approved: 'Approved',
  rejected: 'Not accepted',
};
