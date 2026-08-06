/**
 * Estate Vault FAQ — security, roles, abilities, vocabulary, and how-it-works.
 * Getting started first for new PRs; auctions kept as optional later features.
 */

import { APP_NAME } from './estateInventoryConstants.js';
import { ESTATE_DATA_TRUST_NOTE } from './estateWhatIsVault.js';
import {
  ESTATE_BILLING_PLAN,
  estatePricingFaqAnswer,
  formatBillingMoney
} from './estateBilling.js';

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
          q: 'What is Estate Vault — and what is it not?',
          a: 'Estate Vault is the family Personal Representative workspace for inventory → money → sales → distributions → court-supporting records. You decide; we help you record, organize, and export. It is not a law firm, court e-filing system, tax preparation service, CPA firm, or a pre-death vault for wills and life documents.'
        },
        {
          q: 'Where should a new PR start?',
          a: 'Tap Start here as a PR on the home page for a short new-PR guide, then sign in or create your account and create or open an estate. For a fuller product tour anytime, open What is Estate Vault? Enter basic case details when you have them, invite family if ready, and begin documenting property and money. You do not need every document on day one.'
        },
        {
          q: 'Do I have to upload the will, death certificate, or Letters?',
          a: 'No. Those uploads are not required to use Estate Vault. You can begin with case setup, inventory, and money tracking while paper documents stay with you and counsel.'
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
      id: 'pricing',
      title: 'Pricing & billing',
      items: [
        {
          q: 'How much does Estate Vault cost?',
          a: estatePricingFaqAnswer()
        },
        {
          q: 'Is billing per estate or per person?',
          a: `Per estate (per case). Heirs, helpers, and Specific Gift Recipients do not pay separately. One Personal Representative can manage several estates; each estate has its own subscription. Only the first estate includes a free trial.`
        },
        {
          q: 'Do I get a free trial on every estate?',
          a: `No. Only your first estate as Personal Representative includes the ${ESTATE_BILLING_PLAN.trialDays}-day free trial. Additional estates start at ${formatBillingMoney()}/month, with a ${ESTATE_BILLING_PLAN.graceDays}-day grace period to subscribe before that estate pauses.`
        },
        {
          q: 'What happens when the trial ends?',
          a: `After the ${ESTATE_BILLING_PLAN.trialDays}-day trial on your first estate, renew for ${formatBillingMoney()}/month to keep that estate open. During a ${ESTATE_BILLING_PLAN.graceDays}-day grace period you will see reminders. If it is not renewed, access for that estate pauses for the PR, family, helpers, and public sale until billing is restored. Settings → Billing shows status and Subscribe / Manage billing.`
        },
        {
          q: 'Can I cancel when the estate is closed?',
          a: 'Yes. Use Manage billing (Stripe customer portal) to cancel when you are finished. Access continues through the paid period, then grace rules apply. Closed estates can still be kept for records according to your Records & retention settings.'
        },
        {
          q: 'Why does Checkout say FRPL or FRUSAPL?',
          a: 'Payment is processed through the business Stripe account. The product line and price still show Estate Vault Standard. The merchant name on Checkout is the Stripe business profile for that account.'
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
          a: 'Bank and other estate accounts you enter under Funds. Keep those balances updated when real-world bank balances change. Cash available is calculated from Funds (plus other cash and paid sales not yet deposited). Official truth always remains the bank statement.'
        },
        {
          q: 'What are expenses?',
          a: 'Activity logs of money paid out (fees, utilities, repairs, and similar). When you pay from a Funds account, that payment updates the account balance. The expense list is the history trail so the same dollar is not subtracted twice from Cash available or Estate balance.'
        },
        {
          q: 'What is Cash available vs Estate balance?',
          a: 'Cash available is liquid money tracked in Funds (estate accounts, other cash, and paid sales not yet deposited). Estate balance is the wider picture: Cash available plus non-cash holdings (such as outstanding bids and unsold inventory estimates), minus debts and PR advances. Neither figure is a live bank feed.'
        },
        {
          q: 'What are reports and Family Updates?',
          a: 'Reports are supporting administration records for you and counsel — not court e-filings. Family Updates are numbered, published summaries heirs can open in the family portal. A published Family Update freezes the numbers as of publish time.'
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
          a: 'The PR runs the estate workspace: inventory and rooms, scene photos, accounts and expenses, distributions and receipts, family invites/updates, and supporting reports.'
        },
        {
          q: 'What can heirs do?',
          a: 'Depends on your role. Residual beneficiaries can usually browse remaining inventory, request items, message the PR, view inheritance receipts, and open published Family Updates. Specific Gift Recipients mainly see gifts named for them and cannot request residual inventory; in some cases they may be allowed to browse rooms (view only). Some people have both residual and specific-gift access.'
        },
        {
          q: 'What can helpers do?',
          a: 'Helpers document rooms and items (photo, title, description, room). Submissions wait for PR review before they become part of the approved inventory. Helpers do not manage money, distributions, or heir invites.'
        },
        {
          q: 'How do people sign in?',
          a: 'The PR creates an Estate Vault account (Google or email/password), then unlocks each estate with an admin PIN. Heirs use the estate name plus their PIN. Helpers use the name and PIN the PR set under Settings → Helpers. They do not use the PR’s account login.'
        },
        {
          q: 'I lost my invite code or do not know my role',
          a: 'Ask the Personal Representative. They can issue a new heir PIN or helper PIN and confirm whether your role is residual beneficiary, specific-gift recipient, or helper.'
        }
      ]
    },
    {
      id: 'money',
      title: 'Money & accounting',
      items: [
        {
          q: 'How does Estate Vault treat money?',
          a: 'You record estate Funds (accounts and money in/out), debts, PR advances, inventory estimates, and sales. Cash available comes from Funds (accounts + other cash + paid sales not yet deposited). Outstanding bids and unsold inventory estimates are non-cash. Estate balance is what the estate holds minus debts and PR advances. Expense history documents payments that already moved through Funds when paid from an account — so they are not subtracted twice.'
        },
        {
          q: 'Do the PR Ledger and heir overview use the same money numbers?',
          a: 'Yes, when family financial visibility is on. Both sides show the same Cash available and Estate balance calculated from what was recorded for that estate. Published Family Updates stay frozen as of the time they were published, so they may differ from today’s live totals.'
        },
        {
          q: 'Does logging an expense subtract the estate balance automatically?',
          a: 'When you pay from a Funds account, the expense updates that account’s balance. The expense list is activity history so the same payment is not subtracted again from Cash available or Estate balance. Official bank statements remain what you reconcile against.'
        },
        {
          q: 'What are distributions and acknowledgements?',
          a: 'A distribution records cash and/or property delivered to recipients, with printable receipts. Recipients can acknowledge receipt. The PR can also mark notice/reminder status. Acknowledgements support the administration record; they are not a court order. After cash goes out, update Funds so Cash available stays true to the bank.'
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
          a: `${ESTATE_DATA_TRUST_NOTE} Each estate case is kept separate. This is a private administration record — not a public court filing system.`
        },
        {
          q: 'Are Personal Representative actions recorded?',
          a: 'Yes. Important PR actions are saved in the estate history (for example settings changes, inventory work, distributions, and Family Update publishing). That history helps show what was recorded and when, and it can be exported for review with family or counsel. It is an administration aid, not a court certification.'
        },
        {
          q: 'What photo details does Estate Vault keep?',
          a: 'When photos are uploaded, Estate Vault can retain capture-related details the device provides (such as a claimed capture time or GPS when available). Those device details are a claim from the camera/phone — not proof by themselves. The server also records when the photo was received, and important changes appear in estate activity history.'
        },
        {
          q: 'Can heirs see bank statements and full finances?',
          a: 'Financial detail depends on your role’s access tier. Specific Gift Recipients stay on Minimal (their own gifts / receipts). Higher tiers may include more staged transparency — not continuous live bank access and not the PR’s full private record.'
        },
        {
          q: 'Admin PIN vs passwords — what are the credentials?',
          a: 'Three different things: (1) PR account login — Google or email/password for Fiduciarylog / Estate Vault. (2) Estate admin PIN — unlocks that one estate on a device (sometimes labeled “admin password” in older wording; it is the same PIN). (3) Heir PIN / helper name+PIN — invite credentials the PR gives family or helpers for that estate only.'
        },
        {
          q: 'Why can the PR re-show helper and heir access codes?',
          a: 'Helper PINs and heir invite PINs are estate invite credentials, not the PR’s Google/email login. Reminder copies are stored so the PR can re-share a code after confirming the admin PIN. Treat them like door codes: anyone who sees them can use that portal. If a code may have leaked, issue a new helper PIN under Settings → Helpers or a new heir PIN under Family / heirs. The admin PIN itself is never shown back — you type it to unlock reminders.'
        }
      ]
    },
    {
      id: 'optional',
      title: 'Optional later features',
      items: [
        {
          q: 'Do I have to use the auction?',
          a: 'No. Many estates never open a public sale/auction. Inventory, money tracking, family communication, and distributions work without it. Sale/auction is available later if you choose to sell remaining items that way.'
        },
        {
          q: 'What can auction visitors do if I open one?',
          a: 'During an open auction window, public bidders can browse approved lots and place bids. Family can follow sale/auction status from the heir portal. Preview periods may allow browsing without bidding.'
        }
      ]
    }
  ],
  closeLabel: 'Close'
};

export default ESTATE_FAQ;
