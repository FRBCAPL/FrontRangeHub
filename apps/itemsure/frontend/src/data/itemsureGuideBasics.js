/**
 * User guide, part 1: setting up and counting.
 * Each section: { id, title, summary, paragraphs?, steps?, tips? }. Plain text only.
 */
export const GUIDE_BASICS = [
  {
    id: 'business-sites-spots',
    title: 'Business, sites, and spots',
    summary: 'The three levels, and which one to add.',
    paragraphs: [
      'Business: your company account. It has its own sites, items, team, and stock. Most people only ever need one.',
      'Site: a place your business runs, with its own address, like a bar, a store, a warehouse, or a delivery van.',
      'Spot: a place inside a site where stock sits, like a back bar shelf, a walk-in cooler, or a storage room.',
      'A business holds sites, and a site holds spots. Opening a second bar? Add a site, not a business.',
    ],
    tips: [
      'Only create a separate business for a company with its own books and its own team.',
      'If you have more than one business, tap the business name at the top of any page to switch.',
      'The owner can archive a business in Settings \u2192 Business. It is hidden for everyone on its team, but nothing is deleted. Restore it from the same place any time.',
    ],
  },
  {
    id: 'getting-started',
    title: 'Getting started',
    summary: 'What ItemSure does and the order to set things up.',
    paragraphs: [
      'ItemSure keeps track of what you have, where it is, and when you are running low. Every change is recorded, so you can always see who changed what and why.',
      'Home shows a getting-started checklist until these steps are done.',
      'At the top of Home are big buttons for everyday jobs: Start a count, Add a delivery, Use stock, and Find an item. You only see the ones your role can do.',
      'Home also has a "Today" list: items running low (with how many to move or buy), items that need topping up, planned moves to finish, and counts to continue or approve. Each line has one button that takes you straight there.',
      'Below that, Stock health shows how many items are Running low, Need topping up, or are Stocked; tap one to see them. It also shows a one-line peek at the shopping list.',
    ],
    steps: [
      'Set up your business. You become its owner.',
      'Add a site (for example a bar, a store, a warehouse, or a van). Spots inside it, like "Back room" or "Walk-in cooler", are optional.',
      'Add your items.',
      'Open each item and pick "Set an amount somewhere else" to say where it is and how many you have.',
      'Tap an item to open it, then choose "Set levels": "Warn me at" (when to warn you) and "Fill up to" (how full to restock).',
      'Check Home and the Shopping list to see what needs attention.',
    ],
  },
  {
    id: 'menu',
    title: 'Finding your way around',
    summary: 'The main menu, and what is under More.',
    paragraphs: [
      'The main menu holds the four things most people use: Home, Inventory, Count, and Shopping list. On a phone it sits along the bottom of the screen; on a bigger screen it is on the left.',
      'Everything else is under More: Running low, Warning levels (for many items at once), Stock by site, Sites, History, Settings, this Help page, and Coming next.',
      'Some pages only appear if your role allows them. If you expect to see something and it is missing, ask the owner of your business.',
    ],
  },
  {
    id: 'locations',
    title: 'Sites and spots',
    summary: 'Where your stock lives.',
    paragraphs: [
      'Your business is the company. A site is one of its physical places with an address, like a bar, a shop, a warehouse, or a vehicle. A spot is a place inside a site, like a shelf, a cooler, or a back room.',
      'Spots are optional. If a site is small, keep everything at the site itself.',
    ],
    steps: [
      'Open More, then Sites.',
      'Choose Add site and give it a name.',
      'On the site card, add any spots you want to count or stock separately.',
    ],
    tips: ['Archiving a site hides it without deleting its history.', 'A new bar or store you run belongs here as a site. Only create a separate business for a company with its own books.'],
  },
  {
    id: 'items',
    title: 'Inventory (your items)',
    summary: 'Everything you stock, and how many you have.',
    paragraphs: [
      'Items are shared across your whole business. You add an item once. It shows up at a place as soon as you put stock there.',
      '"Counted in" is the unit you count the item in, for example each, bottle, kilogram, or litre. Amounts are always kept in this unit.',
      'Not in the list? Tap "Counted in", then "+ Name your own unit" at the bottom, and type your own unit (for example Keg or Tray). Like every unit, it takes parts such as 0.5 or 2.25 as well as whole numbers. It is saved for your business, so it is in the list for every item from then on.',
    ],
    steps: [
      'Open Inventory and choose Add item.',
      'Enter the name and pick what it is counted in.',
      'Optionally add a SKU, barcode, category, and description.',
      'Save. The item\'s own page opens.',
      'Pick "Set an amount somewhere else" to say where it is and how many.',
    ],
    tips: [
      'Tap an item to open it in a window over the page you are on. It shows how many you have at each place. From there you can set the amount, add a delivery, take some out, set warning levels, and see its history.',
      '"Set amount" is for when you know the real number (for example after looking at the shelf). ItemSure records the difference for you.',
      'Tap a category button to see the items in it. Tap it again to close it. "All items" shows everything.',
      'The list is split into "Needs attention" first, then "All good" as short one-line rows. Give a category an icon (tap its pencil in "All categories") and its items show that icon; a subcategory without one uses its main category\u2019s.',
      'Items that are fine show a small \u2713 next to the amount. Items running low or needing topping up get a coloured bar and stand out, with who you buy them from. Where an item is kept only shows when it is split across more than one spot.',
      'Categories can have subcategories, like Rum inside Liquor. Tap Liquor to see everything in it, then tap Rum to narrow it down. Use "+ Add a sub" to add one.',
      'To rename a category or move it, open "All categories" and tap the pencil next to it. A subcategory can move into another main category or become a main one. Its items stay with it.',
      'An item has one main category, but it can also be found under others. In Add or Edit item, use "Also find it under" (for example, a lime in Produce, also under Bar garnish). It then shows when you tap either category or search for it. Counts, warning levels, and restock still use the main category only, so nothing is counted twice.',
      'Items can have a Brand and one more detail, like Model or Style. Pick your own word for that detail in Settings, then Features. Brands you have used before are suggested as you type, so spelling stays the same. Item names still have to be different; the brand is extra detail. Switch "Brand and item details" off in Settings if you don\'t need it.',
      'Use the search box to find items by name, brand, SKU, barcode, or category.',
      'Use the site filter to see only the items at one site.',
      'A place with nothing in it and no warning levels disappears on its own. An empty place with levels has a "Remove place" button.',
      'After a change, tap Undo on the bar at the bottom if you made a mistake.',
      'After about a week of history, the item window shows how much you use and when it runs out. The levels window then suggests "Warn me at" and "Fill up to" numbers; tap "Use these" to fill them in.',
      'Archive an item you no longer stock. Its history is kept, and you can restore it later.',
      'Each item name can only be used once (capital letters and extra spaces don\'t count). If the name belongs to an archived item, you can restore it, or create a new one: the archived one is renamed to "Name (archived 1)" and keeps its history.',
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
    summary: 'Count everything at a site in one go.',
    paragraphs: [
      'For one item, opening the item is quicker: just choose Set amount. Use Count when you want to walk around and count everything at once.',
      'Counts are "blind": the person counting does not see the expected number, so they count what is actually there. Amounts do not change until someone approves the count.',
    ],
    steps: [
      'Open Count and choose Start count.',
      'Pick a site, then choose the whole site or one spot.',
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
