function metricsHeaders() {
  const token = process.env.METRICS_TOKEN;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: metricsHeaders() });
  if (!res.ok) {
    throw new Error(`Metrics request failed (${res.status}) for ${url}`);
  }
  return res.json();
}

async function sampleInflight(loadUrl, samples, sampleDelayMs) {
  const values = [];
  for (let i = 0; i < samples; i += 1) {
    try {
      const data = await fetchJson(loadUrl);
      if (typeof data.inflight === 'number') values.push(data.inflight);
    } catch (err) {
      console.error(`[autoscaler] inflight sample failed: ${err.message}`);
    }
    if (i < samples - 1) {
      await new Promise((r) => setTimeout(r, sampleDelayMs));
    }
  }
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

async function sampleQueueBacklog(queueUrl) {
  const data = await fetchJson(queueUrl);
  if (typeof data.backlog === 'number') return data.backlog;
  const pending = Number(data.pending) || 0;
  const processing = Number(data.processing) || 0;
  return pending + processing;
}

module.exports = { sampleInflight, sampleQueueBacklog };
