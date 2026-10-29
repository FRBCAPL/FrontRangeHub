/**
 * User guide, part 1: setting up and counting.
 * Each section: { id, title, summary, paragraphs?, steps?, tips? }. Plain text only.
 */
export const GUIDE_BASICS = [
  {
    id: 'getting-started',
    title: 'Getting started',
    summary: 'What ItemSure does and the order to set things up.',
    paragraphs: [
      'ItemSure keeps track of what you have, where it is, and when you are running low. Every change is recorded, so you can always see who changed what and why.',
      'Home shows a getting-started checklist until these steps are done.',
      'Home also has a "Today" list: items running low (with how many to move or buy), items that need topping up, planned moves to finish, and counts to continue or approve. Each line has one button that takes you straight there.',
    ],
    steps: [
      'Set up your business. You become its owner.',
      'Add a location (for example a store, a warehouse, or a van). Spots inside it, like "Back room" or "Walk-in cooler", are optional.',
      'Add your items.',
      'Open each item and pick "Set an amount at another place" to say where it is and how many you have.',
      'On the item page, choose "Set levels": "Warn me at" (when to warn you) and "Fill up to" (how full to restock).',
      'Check Home and the Shopping list to see what needs attention.',
    ],
  },
  {
    id: 'menu',
    title: 'Finding your way around',
    summary: 'The main menu, and what is under More.',
    paragraphs: [
      'The main menu holds the four things most people use: Home, Inventory, Count, and Shopping list. On a phone it sits along the bottom of the screen; on a bigger screen it is on the left.',
      'Everything else is under More: Running low, Warning levels (for many items at once), Stock by location, Locations, History, Settings, this Help page, and Coming next.',
      'Some pages only appear if your role allows them. If you expect to see something and it is missing, ask the owner of your business.',
    ],
  },
  {
    id: 'locations',
    title: 'Locations and spots',
    summary: 'Where your stock lives.',
    paragraphs: [
      'A location is a physical site, like a shop, a warehouse, or a vehicle. A spot is a place inside a location, like a shelf, a cooler, or a back room.',
      'Spots are optional. If a location is small, keep everything at the location itself.',
    ],
    steps: [
      'Open More, then Locations.',
      'Choose Add location and give it a name.',
      'On the location card, add any spots you want to count or stock separately.',
    ],
    tips: ['Archiving a location hides it without deleting its history.'],
  },
  {
    id: 'items',
    title: 'Inventory (your items)',
    summary: 'Everything you stock, and how many you have.',
    paragraphs: [
      'Items are shared across your whole business. You add an item once. It shows up at a place as soon as you put stock there.',
      '"Counted in" is the unit you count the item in, for example each, bottle, kilogram, or litre. Amounts are always kept in this unit.',
    ],
    steps: [
      'Open Inventory and choose Add item.',
      'Enter the name and pick what it is counted in.',
      'Optionally add a SKU, barcode, category, and description.',
      'Save. The item\'s own page opens.',
      'Pick "Set an amount at another place" to say where it is and how many.',
    ],
    tips: [
      'The item page shows how many you have at each place. From there you can set the amount, add a delivery, take some out, set warning levels, and see its history.',
      '"Set amount" is for when you know the real number (for example after looking at the shelf). ItemSure records the difference for you.',
      'Tap a category button to see the items in it. Tap it again to close it. "All items" shows everything.',
      'Categories can have subcategories, like Rum inside Liquor. Tap Liquor to see everything in it, then tap Rum to narrow it down. Use "+ Sub in Liquor" to add one.',
      'Use the search box to find items by name, SKU, barcode, or category.',
      'Use the location filter to see only the items at one location.',
      'A place with nothing in it and no warning levels disappears on its own. An empty place with levels has a "Remove place" button.',
      'After a change, tap Undo on the bar at the bottom if you made a mistake.',
      'After about a week of history, the item page shows how much you use and when it runs out. The levels window then suggests "Warn me at" and "Fill up to" numbers; tap "Use these" to fill them in.',
      'Archive an item you no longer stock. Its history is kept, and you can restore it later.',
    ],
  },
  {
    id: 'packaging',
    title: 'Packaging sizes',
    summary: 'Count and move stock in cases, boxes, or packs.',
    paragraphs: [
      'A packaging size tells ItemSure how many units are in a package, for example "1 case = 12 bottles". Amounts are still kept in single units; packages just save you the math.',
    ],
    steps: [
      'Open Inventory, then Edit on the item.',
      'Under Packaging sizes, choose Add package.',
      'Enter the package name (like "Case") and how many units it holds.',
      'Optionally choose Make default so it is picked first.',
    ],
    tips: [
      'When counting, choose "Count in packages", enter how many packages you have, then choose Use. The total is filled in for you.',
      'When adding, using, or moving stock, you can enter the amount in packages and see the total before saving.',
      'Once a package has been used, its size cannot change, so past records stay correct. If the size changes, archive the old package and add a new one.',
    ],
  },
  {
    id: 'counting',
    title: 'Counting',
    summary: 'Count everything at a location in one go.',
    paragraphs: [
      'For one item, the item page is quicker: just choose Set amount. Use Count when you want to walk around and count everything at once.',
      'Counts are "blind": the person counting does not see the expected number, so they count what is actually there. Amounts do not change until someone approves the count.',
    ],
    steps: [
      'Open Count and choose Start count.',
      'Pick a location, then choose the whole location or one spot.',
      'Enter what you see for each item. Use the + and \u2212 buttons or type a number. Your entries save as you go.',
      'Leave an item blank if you did not count it. Blank is not the same as zero.',
      'When you are done, choose Review, check your numbers, then choose Submit count.',
      'A person who can approve counts checks the figures. Approving updates the amounts; rejecting sends it back so the items can be counted again.',
    ],
    tips: [
      'If an item has no amount yet at that place, the approved count sets its starting amount.',
      'After that, differences between what was expected and what was counted are recorded as count corrections.',
    ],
  },
];
