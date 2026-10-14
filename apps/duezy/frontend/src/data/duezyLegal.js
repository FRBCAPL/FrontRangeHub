/**
 * Public trust pages (Privacy, Terms) and contact details shown on the landing page footer.
 * Plain-English starting text — the owner should review it (and have it checked) before relying on it.
 */

export const SUPPORT_EMAIL = 'admin@frontrangepool.com';
export const OPERATOR = 'Front Range Pool.com';
export const LEGAL_UPDATED = 'October 2026';

export const LEGAL_PAGES = {
  privacy: {
    title: 'Privacy',
    intro: `Duezy is run by ${OPERATOR}. This page explains what Duezy stores, why, and what you can ask us to do with it.`,
    sections: [
      {
        heading: 'What we store',
        items: [
          'Your account: name, email address and sign-in details (or your Google sign-in, if you use it).',
          'Your leagues: league and division names, schedules, dues amounts and payment methods you accept.',
          'Your teams: team names and, only if you add them, captain names, phone numbers or emails and player names.',
          'Payment records: who was marked paid, partial, bye or make-up, amounts, methods, notes, bank deposits, and a history of every change with who made it.',
        ],
      },
      {
        heading: 'What we don’t do',
        items: [
          'We don’t sell or rent your data, and we don’t show ads.',
          'We don’t use advertising or tracking cookies. Your browser stores a sign-in token so you stay logged in.',
          'We don’t message your teams. Reminders are copied by you and sent from your own phone or group chat.',
        ],
      },
      {
        heading: 'Who can see your league',
        items: [
          'Only you and the people you invite (co-treasurers and viewers). Access is enforced by the database, not just the app.',
          `${OPERATOR} administrators can see accounts to provide support and keep the service running.`,
        ],
      },
      {
        heading: 'Services we use',
        items: [
          'Supabase hosts the database and sign-in. Data is sent over encrypted (HTTPS) connections.',
          'Stripe handles subscription billing. Duezy never sees or stores your card number.',
          'Google, only if you choose “Continue with Google”.',
        ],
      },
      {
        heading: 'Your choices',
        items: [
          'You can edit or remove teams and correct payment records while your trial or plan is active.',
          'If your trial ends without a plan, your leagues stay read-only for 30 days and are then deleted. If a paid plan ends (cancelled or unpaid), they stay read-only for 90 days and are then deleted. You can view and export your reports until then, and we email you 7 days and 1 day before deletion.',
          `To export your data or delete your account and leagues, email ${SUPPORT_EMAIL}.`,
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of use',
    intro: `By creating a Duezy account you agree to these terms. Duezy is provided by ${OPERATOR}.`,
    sections: [
      {
        heading: 'What Duezy is',
        items: [
          'Duezy is a record-keeping tool for league dues. It tracks payments — it does not collect, hold or move money.',
          'Teams pay you however they do now (cash, Venmo, Zelle and so on); you record those payments in Duezy.',
          'You’re responsible for the accuracy of what you record and for handling your league’s money.',
        ],
      },
      {
        heading: 'Trial, plans and billing',
        items: [
          'New accounts get a free trial with no card required. After that, a paid plan is needed to keep making changes.',
          'Plans are priced by the number of divisions and billed monthly or yearly through Stripe.',
          'You can cancel anytime from Billing. After a plan ends your leagues stay viewable (read-only) for 90 days, then they are deleted. After a free trial ends without a plan, that window is 30 days. Choosing a plan before then keeps everything.',
        ],
      },
      {
        heading: 'Fair use',
        items: [
          'Only add people’s contact details if they’ve agreed to share them with you for league purposes.',
          'Don’t use Duezy for anything unlawful or to harass anyone.',
          'Keep your sign-in private. You’re responsible for activity by people you invite to your leagues.',
        ],
      },
      {
        heading: 'The service',
        items: [
          'We work to keep Duezy available and your data safe, but it’s provided “as is” without guarantees of uninterrupted service.',
          'Keep your own copies of important records — the reports page lets you download PDF and CSV files anytime.',
          'We may update Duezy and these terms; we’ll note the date of the latest change on this page.',
        ],
      },
      {
        heading: 'Questions',
        items: [`Email ${SUPPORT_EMAIL} — a real person reads it.`],
      },
    ],
  },
};
