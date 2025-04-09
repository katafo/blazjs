import {
  DefaultMetricsCollectorConfiguration,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

export class MetricClient {
  private collectDefaultMetrics = collectDefaultMetrics;
  private config: DefaultMetricsCollectorConfiguration<"text/plain; version=0.0.4; charset=utf-8"> =
    {
      register: new Registry(),
    };

  constructor(
    config?: DefaultMetricsCollectorConfiguration<"text/plain; version=0.0.4; charset=utf-8">
  ) {
    if (config) {
      this.config = {
        ...this.config,
        ...config,
      };
    }
    this.collectDefaultMetrics(this.config);
  }

  contentType() {
    return (
      this.config.register?.contentType ??
      "text/plain; version=0.0.4; charset=utf-8"
    );
  }

  async metrics() {
    return this.config.register?.metrics();
  }
}
