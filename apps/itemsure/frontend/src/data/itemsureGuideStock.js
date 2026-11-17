/**
 * User guide, part 2: stock, levels, shopping list, history, people, and questions.
 * Same shape as itemsureGuideBasics.js.
 */
export const GUIDE_STOCK = [
  {
    id: 'stock',
    title: 'Add, use, and move stock',
    summary: 'Record deliveries, use, waste, and moves between places.',
    paragraphs: [
      'The quickest way to change one item is its own page: open Inventory, tap the item, then use Set amount, + Add, or \u2212 Use.',
      'An item at a place starts with a starting amount (set from the item window) or an approved count. After that, you can add, use, or move it.',
      'Stock by site (under More) shows everything at one site, and also has Add / Use and Move.',
    ],
    steps: [
      'Open the item, or open More, then Stock by site.',
      'Choose + Add for a delivery or \u2212 Use for something used, sold, damaged, or expired.',
      'Pick a reason. It shows in the history.',
      'To move an amount from one place to another, open More, then Stock by site, and choose Move.',
    ],
    tips: [
      'If ItemSure says there is no amount yet, open the item and choose "Set starting amount".',
      'Setting an amount needs a role that can both change stock and approve counts (owner, administrator, or manager).',
      'Nothing is ever erased. Mistakes are fixed with a new change, so the history stays honest.',
    ],
  },
  {
    id: 'levels',
    title: 'Warn me at and Fill up to',
    summary: 'When to warn you, and how full to restock.',
    paragraphs: [
      '"Warn me at" is your warning point. When the amount drops to this number or below, the item shows as Running low.',
      '"Fill up to" is your full amount: how many you want after restocking. The shopping list tops you back up to this.',
      'Example: lemons, warn me at 10, fill up to 40. 10 or fewer is Running low. Needs topping up only once you hit the Top off line (Usual is about 16 or fewer). Between that and 39 is still OK on Home, Inventory, and Warning levels. 40 is Full. More than 40 is More than full.',
      'Home, Inventory, and Warning levels use that Top off line so you are not nudged to buy while stock is only a little under "Fill up to". Stock by site can still show "Needs topping up" for anything under "Fill up to" — that screen is about how full each place is, not only the shopping alert.',
    ],
    steps: [
      'For one item: open it from Inventory and choose "Set levels" next to a place.',
      'For many items at once: open More, then Warning levels.',
      'Pick a site (and spot, if you use them).',
      'Enter the numbers for each item, then save.',
    ],
    tips: [
      'Each place can have its own numbers.',
      'Either one can be left blank. Without "Warn me at" the item never shows as running low. Without "Fill up to" nothing goes on the shopping list.',
      'If no places have levels yet, Home will not say "All caught up" for stock — set levels first so Running low and Need topping up mean something.',
      'On Warning levels, use "Copy to another site" to reuse one site\u2019s numbers at another site.',
    ],
  },
  {
    id: 'low-stock',
    title: 'Running low and the shopping list',
    summary: 'What is running low, and how to fix it.',
    paragraphs: [
      'Home shows how many items are running low and how many need topping up. The number on Home in the menu is how many are running low.',
      'The Shopping list works out, for each item that needs topping up, how many you need, whether spare stock at another place can cover it, and how many to buy.',
    ],
    steps: [
      'Open Shopping list.',
      'Anything marked "Buy" needs to be bought or ordered.',
      'For a suggested move, choose Transfer to move the stock now.',
      'For a move between two sites that will happen later (for example on the next delivery run), choose Plan. Choose Complete once it has arrived.',
    ],
    tips: [
      'If an item says it has no "Fill up to" number, open the item and choose Set levels to get a suggested amount.',
      'On the shopping list, tick what you got, then Receive. Stock is added and those lines leave the list for everyone. The list and amounts refresh as soon as Receive finishes — you should not need to reload the page.',
    ],
  },
  {
    id: 'suppliers',
    title: 'Suppliers',
    summary: 'Who you buy from and how to reach them.',
    paragraphs: [
      'Suppliers (under More) keeps the companies you order from: a contact person, phone, email, website, your account number with them, and ordering notes such as delivery days or minimum orders.',
      'Link items to the supplier you buy them from with "Buy from" in Add or Edit item. Use "Also from" when more than one supplier sells it. On the item Details tab you can enter each supplier\'s as-ordered price and their product code; the shopping list then defaults to the cheapest, and you can still pick another for this trip. On each supplier card, "+ Add item" starts a new item with that supplier already chosen, and "View/edit items" lists everything you buy from them.',
      'Give a supplier an icon in Edit supplier: tap one, or type a word like "truck" or "store" to search for more. You can also use up to 2 letters (type SY and tap "Or use letters" for Sysco). It shows on the supplier card, on the shopping list headings, and next to the supplier on its items.',
      'Tap a phone number to call, or an email address to write. Everyone in your business can see suppliers; owners, administrators, and managers can add and edit them.',
      'Suppliers are archived, not deleted. Tick "Show archived" to see them again and choose Restore.',
    ],
  },
  {
    id: 'activity',
    title: 'History',
    summary: 'Who changed what, and when.',
    paragraphs: [
      'Each item\u2019s window shows its recent history, under History.',
      'History (under More) lists every change across your business, newest first: items, sites, counts, stock changes, levels, and settings. It is read-only.',
    ],
  },
  {
    id: 'features',
    title: 'Keeping it simple (features)',
    summary: 'Switch off the parts you don\u2019t use.',
    paragraphs: [
      'Settings has a Features section. The owner or an administrator can switch parts on or off: spots inside sites, case and pack sizes, moving stock between places, count approvals, and — when available — brand and item details, and counting loose ones out of a case.',
      'New businesses start with the main four off (spots, packaging, moves, approvals), so ItemSure stays simple. Switch one on when you need it.',
      'Switching something off only hides it. Nothing is deleted, and anything already recorded (for example stock in a spot) still shows.',
    ],
    tips: [
      'With count approvals off, a count submitted by someone who can approve updates stock straight away. If something needs a closer look, the count waits for approval as usual.',
      'With moving switched off, the shopping list shows the full amount to buy.',
      'Brand and item details, and "Count loose ones too", only appear after their database updates are applied.',
    ],
  },
  {
    id: 'faq',
    title: 'Common questions',
    summary: 'Quick answers.',
    questions: [
      ['How do I enter how many I have?', 'Open Inventory, tap the item, then choose "Set amount" (or "Set starting amount") next to the place.'],
      ['Why did my count not change the amounts?', 'A count only changes amounts after it is approved. Check Count for anything "Awaiting approval".'],
      ['Why can I not add or use an item?', 'It has no amount at that place yet. Open the item and choose "Set starting amount" first.'],
      ['Why is an item not showing as running low?', 'It needs a "Warn me at" number for that place, and an amount.'],
      ['Home says Stocked / OK but Stock by site says Needs topping up?', 'Home, Inventory, and Warning levels wait until stock hits the Top off line (Usual is about a fifth of the way from Warn me at up to Fill up to). Stock by site flags anything under Fill up to. Both can be right for their job.'],
      ['Why does Home say nothing to restock when I have no levels?', 'Set "Warn me at" and "Fill up to" first. Until levels exist, ItemSure cannot tell what is running low. Use Warning levels or Set levels on an item.'],
      ['How do I try ItemSure without signing up?', 'On the welcome screen, choose Try the Demo Bar. No email needed. Use Reset sample on the banner to restore the sample; Create your own business when you are ready.'],
      ['What is Demo Clover?', 'In the Demo Bar, Demo Clover is sample menu and sales so Sales vs counts works. It is not a live merchant. Connect real Clover from your own business under More \u2192 Clover.'],
      ['Blank or zero when counting?', 'Zero means you counted and there were none. Blank means you did not count it.'],
      ['Can I undo a change?', 'Nothing is deleted. Set the right amount or make a new change; both are kept in the history.'],
      ['How do I add someone to my business?', 'Settings \u2192 People \u2192 Invite people. Enter their email and pick a role. They get an email, sign in, and tap Join.'],
      ['Someone left. How do I take away their access?', 'Settings \u2192 People, find them, then "Remove from business". Their past work stays in History.'],
      ['Why can\u2019t someone do something?', 'Their role does not allow it. Change their role, or have the owner switch it on in Settings \u2192 What each role can do.'],
      ['Where did a page go?', 'Less-used pages are under More in the menu. Low stock is now "Running low", Par levels is "Warning levels", Restock is "Shopping list", Stocked is "Inventory", and Activity log is "History".'],
    ],
  },
];
