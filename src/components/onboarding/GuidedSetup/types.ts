export type StepKey = "business" | "connect" | "proof" | "widget" | "install" | "done";

export const STEP_ORDER: StepKey[] = ["business", "connect", "widget", "proof", "install", "done"];

export const STEP_LABELS: Record<StepKey, string> = {
  business: "Business details",
  connect: "Connect a source",
  proof: "Get your first testimonial",
  widget: "Preview widget",
  install: "Install",
  done: "Done",
};
