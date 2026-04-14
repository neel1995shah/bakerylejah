export const FIRM_NAMES = ['krish', 'harsh', 'meet'];

export const isFirmMember = (username) => {
  return FIRM_NAMES.includes((username || '').toLowerCase().trim());
};

export const filterByScope = (items, username, nameKey = 'handler') => {
  const isFirm = isFirmMember(username);
  const myName = (username || '').toLowerCase().trim();

  return items.filter(item => {
    const itemName = (item[nameKey] || '').toLowerCase().trim();
    if (isFirm) {
      return FIRM_NAMES.includes(itemName);
    }
    return itemName === myName;
  });
};
