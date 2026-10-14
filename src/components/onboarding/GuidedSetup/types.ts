export type StepKey = "business" | "connect" | "proof" | "widget" | "install" | "done";

export const STEP_ORDER: StepKey[] = ["business", "connect", "proof", "widget", "install", "done"];

export const STEP_LABELS: Record<StepKey, string> = {
  business: "Business details",
  connect: "Connect a source",
  proof: "Collect proof",
  widget: "Create a widget",
  install: "Install",
  done: "Done",
};
