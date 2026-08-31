const db = require('../db');
const { getAdminDashboard } = require('./adminDashboard');
const { csvRow, csvSection } = require('./csv');

async function getPendingReports() {
  return db.all(`
    SELECT r.id, r.post_id, r.reason, r.status, r.created_at,
      p.content AS post_content,
      rep.monkey_name AS reporter_name, rep.monkey_emoji AS reporter_emoji,
      auth.monkey_name AS author_name, auth.monkey_emoji AS author_emoji
    FROM reports r
    JOIN posts p ON p.id = r.post_id
    JOIN monkeys rep ON rep.id = r.reporter_id
    JOIN monkeys auth ON auth.id = p.monkey_id
    WHERE r.status = 'pending'
    ORDER BY r.created_at ASC
    LIMIT 100
  `);
}

function summaryRows(category, data) {
  return Object.entries(data).map(([metric, value]) => ({
    category,
    metric,
    value,
  }));
}

function buildAdminExportCsv(dashboard, reports) {
  const parts = [
    csvRow(['generated_at', dashboard.generated_at]),
    '',
    csvSection('summary', ['category', 'metric', 'value'], [
      ...summaryRows('totals', dashboard.totals),
      ...summaryRows('activity', dashboard.activity),
      ...summaryRows('queue', dashboard.queue),
    ]),
    '',
    csvSection('reports_by_reason', ['reason', 'count'], dashboard.reports_by_reason),
    '',
    csvSection('recent_users', [
      'id', 'email', 'created_at', 'last_login_at', 'monkey_name', 'monkey_emoji',
    ], dashboard.recent_users),
    '',
    csvSection('recent_posts', [
      'id', 'preview', 'author', 'bananas', 'poops', 'created_at',
    ], dashboard.recent_posts),
    '',
    csvSection('top_posts', [
      'id', 'preview', 'author', 'bananas', 'poops', 'created_at',
    ], dashboard.top_posts),
    '',
    csvSection('pending_reports', [
      'id', 'post_id', 'reason', 'created_at',
      'author_name', 'author_emoji', 'reporter_name', 'reporter_emoji', 'post_content',
    ], reports.map((r) => ({
      id: r.id,
      post_id: r.post_id,
      reason: r.reason,
      created_at: r.created_at,
      author_name: r.author_name,
      author_emoji: r.author_emoji,
      reporter_name: r.reporter_name,
      reporter_emoji: r.reporter_emoji,
      post_content: r.post_content,
    }))),
  ];

  return `${parts.join('\n')}\n`;
}

async function getAdminExportCsv() {
  const [dashboard, reports] = await Promise.all([
    getAdminDashboard(),
    getPendingReports(),
  ]);
  return buildAdminExportCsv(dashboard, reports);
}

function exportFilename(generatedAt = new Date()) {
  const date = generatedAt.toISOString().slice(0, 10);
  return `monkeybook-admin-${date}.csv`;
}

module.exports = { getAdminExportCsv, buildAdminExportCsv, exportFilename };
