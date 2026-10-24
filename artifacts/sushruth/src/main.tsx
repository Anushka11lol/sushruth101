import { createRoot } from "react-dom/client";
import App from "./App";
import { StartupErrorBoundary } from "./components/startup-error-boundary";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StartupErrorBoundary>
    <App />
  </StartupErrorBoundary>,
);
