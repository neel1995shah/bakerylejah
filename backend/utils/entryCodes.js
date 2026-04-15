const padSequence = (value) => String(value).padStart(3, '0');

const formatDateSegment = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${day}${month}${year}`;
};

const buildEntryCode = (dateValue, sequence) => {
  const dateSegment = formatDateSegment(dateValue);
  if (!dateSegment) {
    return '';
  }

  return `${dateSegment}${padSequence(sequence)}`;
};

const getUtcDateBounds = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
};

const applyEntryCodes = (entries) => {
  const groupedCounts = new Map();
  const orderedEntries = [...entries].sort((left, right) => {
    const dateDiff = new Date(left.date) - new Date(right.date);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    const createdDiff = new Date(left.createdAt || left.date) - new Date(right.createdAt || right.date);
    if (createdDiff !== 0) {
      return createdDiff;
    }

    return String(left._id).localeCompare(String(right._id));
  });

  for (const entry of orderedEntries) {
    if (entry.entryCode) {
      const codeDate = String(entry.entryCode).slice(0, 6);
      const currentCount = groupedCounts.get(codeDate) || 0;
      const numericPart = Number(String(entry.entryCode).slice(6));
      if (numericPart > currentCount) {
        groupedCounts.set(codeDate, numericPart);
      }
      continue;
    }

    const dateSegment = formatDateSegment(entry.date);
    if (!dateSegment) {
      continue;
    }

    const nextSequence = (groupedCounts.get(dateSegment) || 0) + 1;
    groupedCounts.set(dateSegment, nextSequence);
    entry.entryCode = buildEntryCode(entry.date, nextSequence);
  }

  return entries;
};

const generateNextEntryCode = async (Model, dateValue) => {
  const bounds = getUtcDateBounds(dateValue);
  if (!bounds) {
    return '';
  }

  const existingCount = await Model.countDocuments({
    date: { $gte: bounds.start, $lt: bounds.end }
  });

  return buildEntryCode(dateValue, existingCount + 1);
};

module.exports = {
  applyEntryCodes,
  buildEntryCode,
  formatDateSegment,
  generateNextEntryCode,
  getUtcDateBounds
};
