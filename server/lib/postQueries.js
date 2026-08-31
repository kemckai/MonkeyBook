const FLING_ATTRIBUTION_SQL = `
  (SELECT m2.monkey_name FROM flings f JOIN monkeys m2 ON f.monkey_id = m2.id WHERE f.original_post_id = p.id ORDER BY f.created_at DESC LIMIT 1) AS last_fling_name,
  (SELECT m2.monkey_emoji FROM flings f JOIN monkeys m2 ON f.monkey_id = m2.id WHERE f.original_post_id = p.id ORDER BY f.created_at DESC LIMIT 1) AS last_fling_emoji
`;

function reactionCounts(dayFilter = null) {
  const timeClause = dayFilter ? ` AND r.created_at > ${dayFilter}` : '';
  return `
    (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type = 'banana'${timeClause}) AS bananas,
    (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type = 'poop'${timeClause}) AS poops`;
}

function postSelectSql(dayFilter = null) {
  return `
    SELECT p.*, m.monkey_name, m.monkey_emoji, m.avatar_seed, m.created_at AS monkey_created_at,
      ${reactionCounts(dayFilter)},
      (SELECT COUNT(*) FROM posts c WHERE c.parent_id = p.id) AS reply_count,
      (SELECT COUNT(*) FROM flings f WHERE f.original_post_id = p.id) AS fling_count,
      ${FLING_ATTRIBUTION_SQL}
    FROM posts p
    JOIN monkeys m ON p.monkey_id = m.id`;
}

function trendingScoreSql(dayFilter) {
  return `(
    (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type = 'banana' AND r.created_at > ${dayFilter}) +
    (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type = 'poop' AND r.created_at > ${dayFilter})
  )`;
}

module.exports = { postSelectSql, trendingScoreSql, FLING_ATTRIBUTION_SQL };
