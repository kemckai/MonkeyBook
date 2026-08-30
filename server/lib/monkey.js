const { computeTitle, getDisplayName } = require('../titles');

async function enrichMonkey(monkey) {
  if (!monkey) return null;
  return {
    ...monkey,
    display_name: await getDisplayName(monkey),
    title: await computeTitle(monkey.id),
    is_admin: !!monkey.is_admin,
  };
}

module.exports = { enrichMonkey };
