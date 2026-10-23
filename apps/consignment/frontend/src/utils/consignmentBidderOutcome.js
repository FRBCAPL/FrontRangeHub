/** Where one bidder stands on one auction, for the admin Bidders list. */
export function bidderOutcome(auction, userId) {
  if (!auction) return '';
  const won = auction.winner_id === userId;
  switch (auction.status) {
    case 'live':
      return auction.current_bidder === userId ? 'Leading' : 'Outbid';
    case 'awaiting_payment':
      return won ? 'Won · awaiting payment' : 'Lost';
    case 'paid':
      return won ? 'Won · paid' : 'Lost';
    case 'defaulted':
      return won ? 'Won · didn’t pay' : 'Lost';
    case 'cancelled':
      return 'Auction cancelled';
    case 'ended_no_bids':
      return 'Ended';
    default:
      return auction.status || '';
  }
}
