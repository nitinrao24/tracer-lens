export { instrumentAnthropic, instrumentOpenAI } from "./instrument";
export { initTelemetry, getTracer } from "./telemetry";
export { addSink, clearSinks, consoleSink, emit, type SpanSink } from "./sinks";
export { tracerLensExporter, type TracerLensExporterOptions } from "./exporters";
export { estimateCost, priceForModel, MODEL_PRICING, type ModelPrice } from "./pricing";
export {
  optimize,
  resolveDowngrade,
  DOWNGRADE_PATHS,
  type ModelUsage,
  type Recommendation,
  type OptimizationReport,
  type OptimizeOptions
} from "./optimizer";
export type { Provider, TokenUsage, LLMSpanRecord, TracerLensConfig } from "./types";
