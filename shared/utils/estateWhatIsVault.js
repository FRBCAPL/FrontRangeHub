/**
 * First-run / product framing for Estate Vault.
 * Plain thesis → light boundaries → 8-step workflow.
 */

import { APP_NAME } from './estateInventoryConstants.js';

/** Shared trust / storage line — keep footer, FAQ, and What is in sync. */
export const ESTATE_DATA_TRUST_NOTE =
  'Estate Vault uses a secure cloud database to save estate information. Estate information is not saved on your phone or computer — only sign-in and display settings are saved on the device. Access is limited by role. Important PR actions are recorded in the estate history and can be exported for review with family or counsel.';

export const ESTATE_WHAT_IS_VAULT = {
  welcome: {
    eyebrow: 'Welcome',
    title: `What ${APP_NAME} does`,
    subtitle: 'A place to record how you administer an estate',
    intro:
      'Estate Vault does not interpret the will or give legal advice. You decide what must be done.\nEstate Vault helps you record the property, money, decisions, receipts, communications, and distributions so you can show how you administered the estate.',
    pillars: [
      {
        key: 'record',
        title: 'You decide \nWe help you record',
        body: 'The will, court, and your counsel tell you what to do. You enter those instructions and actions here.'
      },
      {
        key: 'document',
        title: 'You document \nWe help you organize',
        body: 'Property, money in and out, receipts, who got what, and what you told the family.'
      },
      {
        key: 'show',
        title: 'Print PDF files \nWe help you export',
        body: 'Keep one organized record for yourself, beneficiaries, and professionals — not a court e-filing system.'
      }
    ],
    capabilitiesHeading: 'In practice, it helps you',
    capabilities: [
      'Replace scattered notes and spreadsheets with one secure workspace',
      'Inventory property and track accounts, expenses, and distributions',
      'Note decisions and keep supporting evidence together',
      'Update beneficiaries with staged Family Updates',
      'Export organized supporting reports for counsel to review'
    ],
    recordNote: ESTATE_DATA_TRUST_NOTE,
    continueLabel: 'Continue'
  },
  boundaries: {
    eyebrow: 'Before you begin',
    title: 'What it is not',
    intro:
      'Estate Vault is an organization and documentation tool. \nTracking work here is not the same as interpreting the will or filing with the court.',
    replacesHeading: 'It does not replace',
    doesNotReplace: [
      'Attorney or legal advice',
      'Tax advice',
      'Court e-filing systems',
      'Professional review before any filing'
    ],
    extraNotes: [
      'You do not need to upload the will, death certificate, or Letters. Those uploads are helpful later when you have them — and still optional.',
      'You record what the will requires yourself (gifts, people, notes). The app does not read or decide those instructions for you.',
      'Official account balances always come from banks and statements. Log expenses and distributions as activity, then update balances to match reality.',
      ESTATE_DATA_TRUST_NOTE
    ],
    footer:
      'Use Estate Vault to stay organized and explain what happened. \nReview exports with counsel before filing anything.',
    backLabel: 'Back',
    continueLabel: 'See the workflow'
  },
  journey: {
    eyebrow: 'Getting started',
    title: 'A simple workflow',
    intro:
      'You do not need to finish everything at once. Work through these steps as the estate progresses.',
    steps: [
      {
        number: '1',
        title: 'Set up the estate',
        body: 'Create or open the case, unlock with the admin PIN, and enter basic case details.'
      },
      {
        number: '2',
        title: 'Record the will’s instructions yourself',
        body: 'Note who receives what, gifts, and residual shares as you understand them — from the will and counsel, not from the app.'
      },
      {
        number: '3',
        title: 'Inventory property',
        body: 'Document rooms and items with photos and notes.'
      },
      {
        number: '4',
        title: 'Track money in and out',
        body: 'Enter account balances, then log expenses and other money movement as activity.'
      },
      {
        number: '5',
        title: 'Document decisions',
        body: 'Keep short notes when you override, dispute, or explain an important choice.'
      },
      {
        number: '6',
        title: 'Communicate with beneficiaries',
        body: 'Invite heirs and publish Family Updates when something material changes.'
      },
      {
        number: '7',
        title: 'Record distributions and receipts',
        body: 'Log cash and property delivered, and capture acknowledgements when you can.'
      },
      {
        number: '8',
        title: 'Export the final record',
        body: 'Generate supporting reports and closing exports for review with counsel.'
      }
    ],
    nextHint:
      'You do not need uploads of the will, death certificate, or Letters to begin. On Home, Needs attention and Next Steps show what to do next for this estate.',
    backLabel: 'Back',
    doneLabel: 'I understand'
  }
};

export default ESTATE_WHAT_IS_VAULT;
