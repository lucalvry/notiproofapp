import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "@/contexts/AuthContext";
import { AgencyProvider } from "@/contexts/AgencyContext";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "@/lib/sentry";
import { initPostHog } from "@/lib/posthog";

initSentry();
initPostHog();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <AgencyProvider>
        <App />
      </AgencyProvider>
    </AuthProvider>
  </StrictMode>
);
