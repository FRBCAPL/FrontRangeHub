const localFiles = import.meta.glob('./usaplIncomeSplits.local.js', {
  eager: true,
  import: 'default',
});

export function loadUsaplIncomeSplits() {
  const rows = Object.values(localFiles)[0];
  return rows && typeof rows === 'object' ? rows : {};
}
