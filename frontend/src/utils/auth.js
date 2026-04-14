export const FIRM_NAMES = ['krish', 'harsh', 'harssh', 'meet'];

export const normalizeUsername = (value) => (value || '').toLowerCase().trim();

export const isFirmMember = (username) => {
  return FIRM_NAMES.includes(normalizeUsername(username));
};

export const filterByScope = (items, username, nameKey = 'handler') => {
  const isFirm = isFirmMember(username);
  const myName = normalizeUsername(username);

  return items.filter(item => {
    const itemName = normalizeUsername(item[nameKey]);
    if (isFirm) {
      return FIRM_NAMES.includes(itemName);
    }
    return itemName === myName;
  });
};

// Accounts should be shared by owner scope, not by handler text.
export const filterAccountsByScope = (items, username) => {
  const myName = normalizeUsername(username);
  const isFirm = isFirmMember(myName);

  return items.filter((item) => {
    const owner = normalizeUsername(item.ownerUsername);
    if (owner) {
      if (isFirm) {
        return FIRM_NAMES.includes(owner);
      }
      return owner === myName;
    }

    // Backward compatibility for older records without owner metadata.
    const legacyHandler = normalizeUsername(item.handler);
    if (isFirm) {
      return FIRM_NAMES.includes(legacyHandler);
    }
    return legacyHandler === myName;
  });
};
