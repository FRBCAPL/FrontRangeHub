/**
 * Estate Vault FAQ — security, roles, abilities, vocabulary, and how-it-works.
 * Getting started first for new PRs; auctions kept as optional later features.
 */

import { APP_NAME } from './estateInventoryConstants.js';

export const ESTATE_FAQ = {
  title: 'Frequently asked questions',
  eyebrow: 'Help',
  intro: `Quick answers for getting started with ${APP_NAME}. Start with Getting started if you are new — auctions and advanced features are optional.`,
  categories: [
    {
      id: 'getting-started',
      title: 'Getting started',
      items: [
        {
          q: 'Where should a new PR start?',
          a: 'Open “What is Estate Vault?” (or Start here as a PR on the home page) for the short walkthrough. Then create your PR account, create or open an estate, enter basic case details when you have them, invite family if ready, and begin documenting property and money. You do not need every document on day one.'
        },
        {
          q: 'Do I have to upload the will, death certificate, or Letters?',
          a: 'No. Those uploads are helpful when you have them and are not required to start. You can begin with case setup, inventory, and money tracking while paper documents stay with you and counsel.'
        },
        {
          q: 'What if I already have spreadsheets and paper lists?',
          a: 'Estate Vault is meant to replace scattered notes and spreadsheets over time. You can enter inventory and balances as you go; paper lists can still be used and should be held to the same care as digital records.'
        },
        {
          q: 'Who should I contact for legal or tax questions?',
          a: 'Your attorney or CPA — not Estate Vault. The product organizes and documents; it does not give legal, tax, or fiduciary advice.'
        }
      ]
    },
    {
      id: 'vocabulary',
      title: 'What each area means',
      items: [
        {
          q: 'What is inventory?',
          a: 'The property list: rooms/collections and items (often with photos). This is “what the estate has,” not money in the bank and not a distribution receipt.'
        },
        {
          q: 'What are gifts / specific bequests?',
          a: 'Items or amounts the will names for particular people. You record those instructions yourself from the will and counsel. Estate Vault does not read or interpret the will for you.'
        },
        {
          q: 'What are distributions?',
          a: 'A record that cash and/or property was actually delivered to someone, with receipts and optional acknowledgements. Different from merely listing an item in inventory or naming a gift in the will.'
        },
        {
          q: 'What are accounts?',
          a: 'Bank and other estate account balances you enter. Current balances are the money source of truth. Keep them updated when real-world balances change.'
        },
        {
          q: 'What are expenses?',
          a: 'Activity logs of money paid out (fees, utilities, repairs, and similar). Logging an expense documents the payment; you still update the related account balance to match the bank.'
        },
        {
          q: 'What are reports and Family Updates?',
          a: 'Reports are supporting administration records for you and counsel — not court e-filings. Family Updates are numbered, published summaries heirs can open in the family portal.'
        },
        {
          q: 'Does Estate Vault follow or interpret the will?',
          a: 'No. You decide what the will and court require, with your attorney as needed. Estate Vault helps you record property, money, decisions, communications, and distributions so you can show how you administered the estate.'
        }
      ]
    },
    {
      id: 'roles',
      title: 'Roles & abilities',
      items: [
        {
          q: 'Who uses Estate Vault?',
          a: 'Most often: the Personal Representative (PR / executor), heirs / beneficiaries, and helpers who help document property. Each role has its own sign-in path and limited permissions. Public auctions are optional and unused by many estates.'
        },
        {
          q: 'What can the Personal Representative do?',
          a: 'The PR runs the estate workspace: inventory and rooms, scene photos, accounts and expenses, distributions and receipts, family invites and visibility settings, Family Updates, and supporting reports. The PR also sets the estate admin PIN used on devices.'
        },
        {
          q: 'What can heirs do?',
          a: 'Depends on access the PR grants. Residual beneficiaries can usually browse remaining inventory, request items, message the PR, view inheritance receipts, and open published Family Updates. Specific Gift Recipients mainly see gifts named for them. Some heirs have both.'
        },
        {
          q: 'What can helpers do?',
          a: 'Helpers document rooms and items (photo, title, description, room). Submissions wait for PR review before they become part of the approved inventory. Helpers do not manage money, distributions, or heir invites.'
        },
        {
          q: 'How do people sign in?',
          a: 'The PR creates an Estate Vault account (Google or email/password), then unlocks each estate with an admin PIN. Heirs and helpers use the estate name plus the invite code or helper password the PR provides — they do not use the PR’s account login.'
        },
        {
          q: 'I lost my invite code or do not know my access type',
          a: 'Ask the Personal Representative. Only they can resend or reset your PIN/helper password and tell you whether you were invited as a residual beneficiary, specific-gift recipient, or helper.'
        }
      ]
    },
    {
      id: 'money',
      title: 'Money & accounting',
      items: [
        {
          q: 'How does Estate Vault treat money?',
          a: 'Current account balances entered by the PR are the money source of truth. Expenses and cash distributions are recorded as activity. After cash leaves the estate, update the related account balance so the estate figure stays accurate.'
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
          a: 'A numbered, published report heirs can open in the family portal: timeline, inventory status, distributions, and next steps. It is staged communication — publish when something material changes.'
        },
        {
          q: 'What are “records gaps”?',
          a: 'Home highlights incomplete supporting evidence (for example missing receipts, stale balances after distributions, missing scene photos, or unpublished Family Updates). Gaps are advisory — they do not lock the PR out of day-to-day work.'
        }
      ]
    },
    {
      id: 'security',
      title: 'Security & records',
      items: [
        {
          q: 'How is estate data secured?',
          a: 'Each estate case is kept separate. Access is role-based (PR ownership, heir session, or helper session). Heirs and helpers see less than the PR. Data is stored on dedicated cloud infrastructure for Estate Vault.'
        },
        {
          q: 'What are photo metadata and hashes?',
          a: 'When photos are uploaded, Estate Vault can retain capture-related details the device provides (such as a claimed capture time or GPS when available) and keep an integrity fingerprint of the image for the estate record. Device details are a claim from the camera/phone — not proof by itself. Server receive time and activity history also support the record.'
        },
        {
          q: 'What is the activity / audit trail?',
          a: 'Key actions can be logged for the estate (for example settings changes, inventory work, distributions, and Family Update publishing). The trail helps show what was recorded and when. It is an administration aid, not a court certification.'
        },
        {
          q: 'Can heirs see bank statements and full finances?',
          a: 'Only if the PR chooses Standard or Full family financial visibility. Specific Gift Recipients stay on Minimal (their own gifts / receipts). Even at Full, heirs see staged transparency — not continuous live bank access and not the PR’s full private record.'
        },
        {
          q: 'Admin PIN vs passwords — what are the credentials?',
          a: 'Three different things: (1) PR account login — Google or email/password for Fiduciarylog / Estate Vault. (2) Estate admin PIN — unlocks that one estate on a device (sometimes labeled “admin password” in older wording; it is the same PIN). (3) Heir PIN / helper password — invite credentials the PR gives family or helpers for that estate only.'
        }
      ]
    },
    {
      id: 'optional',
      title: 'Optional later features',
      items: [
        {
          q: 'Do I have to use the auction?',
          a: 'No. Many estates never open a public auction. Inventory, money tracking, family communication, and distributions work without it. Auction is available later if you choose to sell remaining items that way.'
        },
        {
          q: 'What can auction visitors do if I open one?',
          a: 'During an open auction window, public bidders can browse approved lots and place bids. Family can follow auction status from the heir portal. Preview periods may allow browsing without bidding.'
        }
      ]
    }
  ],
  closeLabel: 'Close'
};

export default ESTATE_FAQ;
