import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW } from "./lib/registerSW";

registerSW();
createRoot(document.getElementById("root")!).render(<App />);
