/**
 * Estate Vault FAQ — security, roles, abilities, and common how-it-works questions.
 */

import { APP_NAME } from './estateInventoryConstants.js';

export const ESTATE_FAQ = {
  title: 'Frequently asked questions',
  eyebrow: 'Help',
  intro: `Quick answers about how ${APP_NAME} works — who can do what, how records are secured, and what reports mean.`,
  categories: [
    {
      id: 'roles',
      title: 'Roles & abilities',
      items: [
        {
          q: 'Who uses Estate Vault?',
          a: 'Four main roles: the Personal Representative (PR / executor), heirs / beneficiaries, helpers (inventory assistants), and public auction bidders. Each role has its own sign-in path and limited permissions.'
        },
        {
          q: 'What can the Personal Representative do?',
          a: 'The PR runs the estate workspace: inventory and rooms, scene photos, accounts and expenses, auction approval, distributions and receipts, family invites and visibility settings, Family Updates, and supporting reports. The PR also sets the estate admin PIN used on devices.'
        },
        {
          q: 'What can heirs do?',
          a: 'Depends on access tier. Residual beneficiaries can browse remaining inventory, request items, release items for sale, message the PR, view inheritance receipts, and open published Family Updates. Specific Gift Recipients mainly see gifts named for them and can follow the auction. Some heirs have both.'
        },
        {
          q: 'What can helpers do?',
          a: 'Helpers document rooms and items (photo, title, description, room). Submissions wait for PR review before they become part of the approved inventory. Helpers do not manage money, distributions, or heir invites.'
        },
        {
          q: 'What can auction visitors do?',
          a: 'During an open auction window, public bidders can browse approved lots and place bids. Family can follow auction status from the heir portal. Preview periods may allow browsing without bidding.'
        },
        {
          q: 'How do people sign in?',
          a: 'The PR creates an Estate Vault account (Google or email/password), then unlocks each estate with an admin PIN. Heirs and helpers use the estate name plus the invite code or helper password the PR provides — they do not use the PR’s account login.'
        }
      ]
    },
    {
      id: 'security',
      title: 'Security & records',
      items: [
        {
          q: 'How is estate data secured?',
          a: 'Each estate case is kept separate. Access is role-based (PR ownership, heir session, helper session, or public auction). Data is stored on dedicated cloud infrastructure for Estate Vault. Beneficiary tiers are read-limited compared with the PR workspace.'
        },
        {
          q: 'What are photo metadata and hashes?',
          a: 'When photos are uploaded, Estate Vault can retain capture-related metadata the device provides (such as a claimed capture time or GPS when available) and keep a hash / integrity fingerprint of the image for the estate record. Device metadata is a claim from the camera/phone — not proof by itself. Server receive time and activity history also support the audit trail.'
        },
        {
          q: 'What is the activity / audit trail?',
          a: 'Key actions can be logged for the estate (for example settings changes, inventory work, distributions, and Family Update publishing). The trail helps show what was recorded and when. It is an administration aid, not a court certification.'
        },
        {
          q: 'Can heirs see bank statements and full finances?',
          a: 'Only if the PR chooses Standard or Full family financial visibility. Specific Gift Recipients stay on Minimal (their own gifts / receipts). Even at Full, heirs see staged transparency — not continuous live bank access and not the PR’s sealed evidence binder.'
        },
        {
          q: 'Are PINs and passwords the same thing?',
          a: 'No. The PR account login (Google/email) is separate from each estate’s admin PIN. Heir PINs and the helper password are invite credentials for that estate only. Change admin PINs after first unlock when prompted.'
        }
      ]
    },
    {
      id: 'money',
      title: 'Money & accounting',
      items: [
        {
          q: 'How does Estate Vault treat money?',
          a: 'Current account balances entered by the PR are the money source of truth. Expenses, cash distributions, and paid auction deposits are recorded as activity. After cash leaves the estate, update the related account balance so the estate figure stays accurate.'
        },
        {
          q: 'Does logging an expense subtract the estate balance automatically?',
          a: 'No. Logging an expense documents what was paid. You still update the bank/account balance to reflect the real-world withdrawal. Official balances always come from banks and statements.'
        },
        {
          q: 'What are distributions and acknowledgements?',
          a: 'A distribution records cash and/or property delivered to recipients, with printable receipts. Recipients can acknowledge receipt. The PR can also mark notice/reminder status. Acknowledgements support the administration record; they are not a court order.'
        }
      ]
    },
    {
      id: 'reports',
      title: 'Reports & Family Updates',
      items: [
        {
          q: 'Are reports official court filings?',
          a: 'No. Reports are estate administration records and court-supporting documentation for you and counsel to review. They are not e-filing and are not automatically filed with any court.'
        },
        {
          q: 'What is a Family Update?',
          a: 'A numbered, published report heirs can open in the family portal: timeline, inventory status, auction status, distributions, and next steps. It is staged communication — publish when something material changes.'
        },
        {
          q: 'What are “records gaps”?',
          a: 'Home highlights incomplete supporting evidence (for example missing receipts, stale balances after distributions, missing scene photos, or unpublished Family Updates). Gaps are advisory — they do not lock the PR out of day-to-day work.'
        }
      ]
    },
    {
      id: 'getting-started',
      title: 'Getting started',
      items: [
        {
          q: 'Where should a new PR start?',
          a: 'Acknowledge the legal disclaimer, create your PR account, create or open an estate, set Letters / case details, invite heirs, start documenting rooms and items, then keep accounts and expenses current as money moves.'
        },
        {
          q: 'What if I already have spreadsheets and paper lists?',
          a: 'Estate Vault is meant to replace scattered notes and spreadsheets over time. You can enter inventory and balances as you go; paper lists can still be used inside the probate window and should be held to the same care as digital records.'
        },
        {
          q: 'Who should I contact for legal or tax questions?',
          a: 'Your attorney or CPA — not Estate Vault. The product organizes and documents; it does not give legal, tax, or fiduciary advice.'
        }
      ]
    }
  ],
  closeLabel: 'Close'
};

export default ESTATE_FAQ;
