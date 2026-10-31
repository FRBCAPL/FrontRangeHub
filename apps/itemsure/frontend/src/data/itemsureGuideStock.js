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
      'An item at a place starts with a starting amount (set on the item page) or an approved count. After that, you can add, use, or move it.',
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
      'Example: lemons, warn me at 10, fill up to 40. 10 or fewer is Running low. 11 to 39 is Needs topping up. 40 is Full. More than 40 is More than full.',
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
    tips: ['If an item says it has no "Fill up to" number, open the item and choose Set levels to get a suggested amount.'],
  },
  {
    id: 'suppliers',
    title: 'Suppliers',
    summary: 'Who you buy from and how to reach them.',
    paragraphs: [
      'Suppliers (under More) keeps the companies you order from: a contact person, phone, email, website, your account number with them, and ordering notes such as delivery days or minimum orders.',
      'Link items to the supplier you buy them from with "Buy from" in Add or Edit item. The supplier then shows on the item, and you can search Inventory by supplier name. On each supplier card, "+ Add item" starts a new item with that supplier already chosen, and "View/edit items" lists everything you buy from them.',
      'Tap a phone number to call, or an email address to write. Everyone in your business can see suppliers; owners, administrators, and managers can add and edit them.',
      'Suppliers are archived, not deleted. Tick "Show archived" to see them again and choose Restore.',
    ],
  },
  {
    id: 'activity',
    title: 'History',
    summary: 'Who changed what, and when.',
    paragraphs: [
      'Each item page shows that item\u2019s recent history.',
      'History (under More) lists every change across your business, newest first: items, sites, counts, stock changes, levels, and settings. It is read-only.',
    ],
  },
  {
    id: 'features',
    title: 'Keeping it simple (features)',
    summary: 'Switch off the parts you don\u2019t use.',
    paragraphs: [
      'Settings has a Features section. The owner or an administrator can switch four things on or off: spots inside sites, case and pack sizes, moving stock between places, and count approvals.',
      'New businesses start with all four off, so ItemSure stays simple. Switch one on when you need it.',
      'Switching something off only hides it. Nothing is deleted, and anything already recorded (for example stock in a spot) still shows.',
    ],
    tips: [
      'With count approvals off, a count submitted by someone who can approve updates stock straight away. If something needs a closer look, the count waits for approval as usual.',
      'With moving switched off, the shopping list shows the full amount to buy.',
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
      ['Blank or zero when counting?', 'Zero means you counted and there were none. Blank means you did not count it.'],
      ['Can I undo a change?', 'Nothing is deleted. Set the right amount or make a new change; both are kept in the history.'],
      ['How do I add someone to my business?', 'Settings \u2192 People \u2192 Invite people. Enter their email and pick a role. They get an email, sign in, and tap Join.'],
      ['Someone left. How do I take away their access?', 'Settings \u2192 People, find them, then "Remove from business". Their past work stays in History.'],
      ['Why can\u2019t someone do something?', 'Their role does not allow it. Change their role, or have the owner switch it on in Settings \u2192 What each role can do.'],
      ['Where did a page go?', 'Less-used pages are under More in the menu. Low stock is now "Running low", Par levels is "Warning levels", Restock is "Shopping list", and Activity log is "History".'],
    ],
  },
];
