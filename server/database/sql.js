function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function dateOnly(dialect, column) {
  return `DATE(${column})`;
}

function nowMinus1Day(dialect) {
  return dialect === 'postgres' ? "NOW() - INTERVAL '1 day'" : "datetime('now', '-1 day')";
}

function maxExpr(dialect, a, b) {
  return dialect === 'postgres' ? `GREATEST(${a}, ${b})` : `MAX(${a}, ${b})`;
}

function isFalse(dialect, column) {
  return dialect === 'postgres' ? `(${column} IS NOT TRUE)` : `(${column} = 0)`;
}

function toInt(val) {
  return typeof val === 'string' ? parseInt(val, 10) : Number(val) || 0;
}

module.exports = { toPg, dateOnly, nowMinus1Day, maxExpr, isFalse, toInt };
