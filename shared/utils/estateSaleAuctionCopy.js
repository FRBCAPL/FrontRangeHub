/**
 * User-facing Sale inventory wording.
 * Items released by heirs (or flagged by the PR) go into a sale catalog —
 * not an implied live auction. Code/API/route identifiers may still say "auction".
 * Live online bidding is deferred for a later opt-in SaaS revamp.
 */
export const SALE_AUCTION = 'sale inventory';
export const SALE_AUCTION_CAP = 'Sale inventory';
export const SALE_AUCTION_TITLE = 'Sale inventory';

export const saleAuctionCopy = {
  short: SALE_AUCTION,
  shortCap: SALE_AUCTION_CAP,
  title: SALE_AUCTION_TITLE,
  forSale: 'For sale',
  catalog: 'Estate sale catalog',
  catalogShort: 'Sale catalog',
  status: 'Sale inventory status',
  proceeds: 'Sale proceeds',
  sales: 'Sale inventory sales',
  lots: 'Sale inventory lots',
  guide: 'Sale inventory guide',
  rules: 'Estate sale terms',
  follow: 'Follow sale inventory',
  followAlong: 'Sale inventory — follow along',
  followGuide: 'Sale inventory follow-along guide',
  previewGuide: 'Sale inventory preview guide',
  scheduled: 'Sale listing scheduled',
  open: 'Sale inventory open',
  ended: 'Sale listing window ended',
  datesNotSet: 'Sale listing dates not set',
  approvedFor: 'Approved for sale',
  approvedForPublic: 'Approved for sale',
  itemsApproved: 'Items approved for sale',
  onCatalog: 'On sale inventory',
  approvedNotListed: 'Approved but not listed yet',
  outstandingBids: 'Outstanding sale bids',
  pipeline: 'Sale inventory pipeline',
  publicList: 'Estate sales',
  viewPublic: 'View sale inventory',
  navFollow: 'Sale inventory',
  navPublic: 'Sale inventory',
  settingsTitle: 'Sale inventory',
  settingsHint:
    'List items for sale after heirs release them. Live online bidding is optional and not required to keep a sale catalog.',
  listingWindow: 'sale listing window',
  startDate: 'sale listing start date',
  endDate: 'sale listing end date',
  pickupWindow: 'Pickup window',
  window: 'sale listing window',
  releaseAction: 'No interest / approve for sale',
  releaseTitle: 'No interest / for sale',
  releaseConfirm: 'public sale inventory',
  bidToolsOptional: 'Bidding tools (optional)',
  registerBidSecondary: 'Register to bid (optional)',
  placeBidSecondary: 'Place bid (optional)',
  ledgerTab: 'Sale proceeds',
  ledgerHint: 'Items sold from the sale inventory and amounts still outstanding',
  reconciliation: 'Sale inventory reconciliation',
  paidSales: 'Paid sale proceeds',
  roleTile: 'Sale inventory',
  roleHint: 'Browse items listed for sale'
};

export default saleAuctionCopy;
