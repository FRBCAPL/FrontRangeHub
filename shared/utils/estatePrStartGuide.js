/**
 * Landing-page guide for new Personal Representatives.
 * Short orientation → first steps → sign in.
 */

import { estatePricingBlurbShort } from './estateBilling.js';

export const ESTATE_PR_START_GUIDE = {
  role: {
    eyebrow: 'Personal Representative',
    title: 'Is this you?',
    intro:
      'If you were appointed to administer someone\'s estate — executor, administrator, or personal representative — Estate Vault is built for you.',
    points: [
      {
        title: 'You decide',
        body: 'The will, court, and your counsel tell you what must be done. You enter those instructions and actions here.'
      },
      {
        title: 'We help you record',
        body: 'Property, money in and out, sales, distributions, and family communications — organized in one secure workspace.'
      },
      {
        title: 'Not legal advice',
        body: 'Estate Vault is documentation and organization. It is not a law firm, court e-filing system, or tax service.'
      }
    ],
    continueLabel: 'Show me the first steps'
  },
  firstSteps: {
    eyebrow: 'Getting started',
    title: 'What you\'ll do first',
    intro:
      'You do not need every document on day one. Work through these in order — you can pause anytime.',
    steps: [
      {
        number: '1',
        title: 'Sign in or create your PR account',
        body: 'Use Google or email. One login can manage multiple estates.'
      },
      {
        number: '2',
        title: 'Create or open an estate',
        body: 'Enter basic case details when you have them. No will, death certificate, or Letters upload required.'
      },
      {
        number: '3',
        title: 'Start documenting',
        body: 'Inventory property, track money, and record decisions as the estate progresses.'
      },
      {
        number: '4',
        title: 'Invite family when ready',
        body: 'Heirs and helpers sign in separately with codes you provide — always free for them.'
      }
    ],
    backLabel: 'Back',
    continueLabel: 'I\'m ready to sign in'
  },
  ready: {
    eyebrow: 'Ready',
    title: 'Create your PR account',
    intro:
      'Sign in to create a new estate or open one you already started. \nYou can revisit What is Estate Vault? anytime from the menu for a fuller product tour.',
    pricingNote: estatePricingBlurbShort(),
    footer: 'Family and helper access stays free with your paid PR subscription.',
    backLabel: 'Back',
    signInLabel: 'Sign in or create account'
  }
};

export default ESTATE_PR_START_GUIDE;
