import { trace, type Tracer } from "@opentelemetry/api";
import {
  BasicTracerProvider,
  ConsoleSpanExporter,
  SimpleSpanProcessor
} from "@opentelemetry/sdk-trace-base";
import { Resource } from "@opentelemetry/resources";

let provider: BasicTracerProvider | undefined;

export function initTelemetry(serviceName = "tracerlens-app"): void {
  if (provider) return;
  const p = new BasicTracerProvider({
    resource: new Resource({ "service.name": serviceName })
  });
  if (process.env.TRACERLENS_DEBUG === "1") {
    p.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  }
  p.register();
  provider = p;
}

export function getTracer(): Tracer {
  if (!provider) initTelemetry();
  return trace.getTracer("@tracerlens/sdk", "0.1.0");
}
