function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function dateOnly(dialect, column) {
  return dialect === 'postgres' ? `DATE(${column})` : `DATE(${column})`;
}

function nowMinus1Day(dialect) {
  return dialect === 'postgres' ? "NOW() - INTERVAL '1 day'" : "datetime('now', '-1 day')";
}

function maxExpr(dialect, a, b) {
  return dialect === 'postgres' ? `GREATEST(${a}, ${b})` : `MAX(${a}, ${b})`;
}

module.exports = { toPg, dateOnly, nowMinus1Day, maxExpr };
