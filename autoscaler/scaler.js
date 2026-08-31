const { getReplicas, setReplicas } = require('./railway');
const { sampleInflight, sampleQueueBacklog } = require('./signals');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeDesiredReplicas({ current, load, targetPerReplica }) {
  if (targetPerReplica <= 0) return current;
  return Math.ceil((load / targetPerReplica) * current);
}

class TargetScaler {
  constructor(config, railway) {
    this.name = config.name;
    this.serviceId = config.serviceId;
    this.environmentId = config.environmentId;
    this.signal = config.signal;
    this.loadUrl = config.loadUrl;
    this.targetPerReplica = config.targetPerReplica;
    this.minReplicas = config.minReplicas;
    this.maxReplicas = config.maxReplicas;
    this.token = railway.token;
    this.tokenType = railway.tokenType;
    this.samples = railway.samples;
    this.sampleDelayMs = railway.sampleDelayMs;
    this.scaleDownCooldownMs = railway.scaleDownCooldownMs;
    this.lastScaleDownAt = 0;
  }

  async sampleLoad() {
    if (this.signal === 'inflight') {
      return sampleInflight(this.loadUrl, this.samples, this.sampleDelayMs);
    }
    if (this.signal === 'queue') {
      return sampleQueueBacklog(this.loadUrl);
    }
    throw new Error(`Unknown signal type: ${this.signal}`);
  }

  async evaluate() {
    const { numReplicas: current } = await getReplicas(
      this.token,
      this.tokenType,
      this.serviceId,
      this.environmentId
    );

    const load = await this.sampleLoad();
    if (load === null) {
      console.warn(`[autoscaler:${this.name}] no load samples, skipping`);
      return;
    }

    const rawDesired = computeDesiredReplicas({
      current,
      load,
      targetPerReplica: this.targetPerReplica,
    });
    const desired = clamp(rawDesired, this.minReplicas, this.maxReplicas);

    console.log(
      `[autoscaler:${this.name}] replicas=${current} load=${load.toFixed(1)} desired=${desired}`
    );

    if (desired > current) {
      console.log(`[autoscaler:${this.name}] scaling up ${current} -> ${desired}`);
      await setReplicas(
        this.token,
        this.tokenType,
        this.serviceId,
        this.environmentId,
        desired
      );
      return;
    }

    if (desired < current) {
      const now = Date.now();
      if (now - this.lastScaleDownAt < this.scaleDownCooldownMs) {
        console.log(`[autoscaler:${this.name}] scale-down suppressed by cooldown`);
        return;
      }
      const next = current - 1;
      console.log(`[autoscaler:${this.name}] scaling down ${current} -> ${next}`);
      await setReplicas(
        this.token,
        this.tokenType,
        this.serviceId,
        this.environmentId,
        next
      );
      this.lastScaleDownAt = now;
    }
  }
}

module.exports = { TargetScaler };
