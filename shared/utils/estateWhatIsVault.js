/**
 * First-run / product framing for Estate Vault.
 * Confidence → boundaries → journey. Supporting docs — not e-filing.
 */

import { APP_NAME } from './estateInventoryConstants.js';

export const ESTATE_WHAT_IS_VAULT = {
  welcome: {
    eyebrow: 'Welcome',
    title: `Welcome to ${APP_NAME}`,
    subtitle: 'Your estate administration workspace',
    intro:
      'A secure place to help you organize, document, and manage an estate through the administration process — especially when you are not sure where to start.',
    pillars: [
      {
        key: 'organize',
        title: 'Stay organized',
        body: 'Keep important information, documents, and decisions together.'
      },
      {
        key: 'document',
        title: 'Create a clear record',
        body: 'Track assets, expenses, distributions, and actions you take.'
      },
      {
        key: 'confidence',
        title: 'Work with confidence',
        body: 'Prepare organized information for family, attorneys, and advisors.'
      }
    ],
    capabilitiesHeading: 'It helps you',
    capabilities: [
      'Replace handwritten notes and scattered spreadsheets with one secure workspace',
      'Track assets, property, expenses, and distributions',
      'Record decisions and supporting evidence',
      'Keep beneficiaries informed with staged updates',
      'Generate organized reports for professional review'
    ],
    continueLabel: 'Continue'
  },
  boundaries: {
    eyebrow: 'Before you begin',
    title: 'Important boundaries',
    intro:
      'Estate Vault is an organization and documentation tool. It helps you create a clearer administration record — not a filing system or a substitute for professionals.',
    replacesHeading: 'It does not replace',
    doesNotReplace: [
      'Attorney or legal advice',
      'Tax advice',
      'Court filing systems',
      'Professional review before filing'
    ],
    extraNotes: [
      'Estate Vault records activity and decisions. Official account balances should always come from banks, financial institutions, and official statements.',
      'Missing information is highlighted before reports so exports stay honest.',
      'Incomplete evidence does not lock you out of day-to-day work — gaps stay visible so you and counsel can see what still needs attention.'
    ],
    footer:
      'Use Estate Vault to stay organized and explain what happened. Review supporting exports with counsel before filing.',
    backLabel: 'Back',
    continueLabel: 'Continue'
  },
  journey: {
    eyebrow: 'Getting started',
    title: 'Your estate administration journey',
    intro:
      'You do not need to finish everything at once. Start with what you know, then keep a clear record as you go.',
    steps: [
      {
        number: '1',
        title: 'Gather',
        body: 'Add people, assets, accounts, and key documents.'
      },
      {
        number: '2',
        title: 'Track',
        body: 'Record expenses, decisions, distributions, and important events.'
      },
      {
        number: '3',
        title: 'Review',
        body: 'Generate organized reports for family members and professionals.'
      }
    ],
    nextHint:
      'Home shows records gaps and next steps so you can always answer: what have I done, and what still needs attention?',
    backLabel: 'Back',
    doneLabel: 'I understand'
  }
};

export default ESTATE_WHAT_IS_VAULT;
