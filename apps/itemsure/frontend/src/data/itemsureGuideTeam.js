/**
 * User guide, part 3: your team. Roles, inviting, removing, and what each role can do.
 * Same shape as itemsureGuideBasics. Plain text only.
 */
export const GUIDE_TEAM = [
  {
    id: 'people',
    title: 'Settings and people',
    summary: 'Your profile, your business, and who is on your team.',
    paragraphs: [
      'Settings (under More) is a short menu: Your profile, Business, People, What each role can do, Features, and Billing. Tap one to open it, and use "Settings" at the top to go back.',
      'Want more on screen? Turn on "Compact view" in Settings \u2192 Your profile. It uses smaller headings and tighter spacing, and shows three items per row on a wide screen. It only changes the device you turn it on for.',
      'The business you are working in is shown at the top of every page. If you belong to more than one, tap its name to switch. Each business has its own sites, items, team, and stock.',
      'To add a site (a bar, store, warehouse, or van) to the same business, use Sites. "Create a separate business" in Settings \u2192 Business makes a brand-new business instead.',
    ],
  },
  {
    id: 'roles',
    title: 'Who can do what (roles)',
    summary: 'Owner, Administrator, Manager, and Staff.',
    paragraphs: [
      'Everyone in a business has one role. The role decides what they can see and change. People can also be limited to certain sites.',
    ],
    tips: [
      'Owner: everything, including archiving the business and changing or removing other owners. A business always has at least one owner.',
      'Administrator: everything except archiving the business and managing owners. Can invite people, change roles, and remove people.',
      'Manager (by default): runs sites, items, warning levels, suppliers, and stock, and approves counts. Cannot manage people.',
      'Staff (by default): sees items and stock, and counts. Cannot send counts in or approve them, and cannot change stock.',
      'Nobody can change their own role or remove themselves.',
    ],
  },
  {
    id: 'invites',
    title: 'Adding people (invites)',
    summary: 'Invite someone by email and choose their role.',
    paragraphs: [
      'Only the owner or an administrator can invite people. Only an owner can invite another owner.',
      'The person gets a sign-in email. When they open it, ItemSure shows the invite at the top of the page, and they tap Join. They then work in your business with the role you chose.',
    ],
    steps: [
      'Open More, then Settings, then People.',
      'Under Invite people, enter their email and pick a role. The line under the role says what it can do.',
      'Choose Send invite.',
      'Their invite shows under "Waiting to join" until they answer it. Use Resend if they did not get the email, or Cancel to take it back.',
    ],
    tips: [
      'Invites last 14 days. Sending one again to the same email starts a fresh 14 days.',
      'The email is a plain sign-in link. Tell the person to expect it, and to check their spam folder.',
      'People who join from an invite have no password at first. They can keep using email links, sign in with Google, or set a password with "Email me a password reset link" in Settings \u2192 Your profile.',
      'Once they join, you can limit which sites they see under "People and site access".',
    ],
  },
  {
    id: 'change-people',
    title: 'Changing a role or removing someone',
    summary: 'Promote, demote, or take away access.',
    steps: [
      'Open More, then Settings, then People, and find the person under "People and site access".',
      'To change their role, pick a new one and choose the "Make ..." button.',
      'To take away their access, choose "Remove from business" and confirm.',
      'To let a removed person back in, choose "Let them back in" on their name.',
    ],
    tips: [
      'Removing someone stops their access straight away. Nothing they did is deleted, and their name stays on past counts and history.',
      'Only an owner can change or remove another owner.',
      'Every role change, removal, and invite is listed in History under "Team & business".',
    ],
  },
  {
    id: 'role-settings',
    title: 'Choosing what each role can do',
    summary: 'Give Staff more, or Managers less, in your business.',
    paragraphs: [
      'The owner or an administrator can change what Managers and Staff are allowed to do, in Settings \u2192 What each role can do. Changes only affect your business.',
      'Pick Manager or Staff at the top, then switch each ability on or off. It saves straight away. People see the change the next time they open ItemSure.',
    ],
    tips: [
      'For example: let Staff send counts in, add deliveries, or add suppliers. Or stop Managers approving counts so only you do.',
      'Owners and Administrators can always do everything, and abilities to do with people and the business itself cannot be given to Managers or Staff.',
      '"Put Staff back to the defaults" undoes every change for that role.',
    ],
  },
];
