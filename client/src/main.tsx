import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { PetraWallet } from "petra-plugin-wallet-adapter";
import { Toaster } from "react-hot-toast";
import "./index.css";
import App from "./App.tsx";
import { validateEnv } from "./config/env";

// Validate environment configuration before starting the app
try {
  validateEnv();
} catch (error) {
  console.error(error);
  document.getElementById("root")!.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #1a1b1f;
      color: #fff;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 2rem;
      text-align: center;
    ">
      <h1 style="color: #ff6871; margin-bottom: 1rem;">⚠️ Configuration Error</h1>
      <pre style="
        background: #2c2f36;
        padding: 1.5rem;
        border-radius: 8px;
        border: 1px solid #40444f;
        text-align: left;
        overflow-x: auto;
        max-width: 600px;
      ">${error instanceof Error ? error.message : String(error)}</pre>
    </div>
  `;
  throw error;
}

// Configure available wallets
const wallets = [new PetraWallet()];

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AptosWalletAdapterProvider plugins={wallets} autoConnect={true} {...({} as any)}>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#2c2f36",
            color: "#fff",
            border: "1px solid #40444f",
          },
          success: {
            duration: 5000,
            iconTheme: {
              primary: "#27ae60",
              secondary: "#fff",
            },
          },
          error: {
            duration: 7000,
            iconTheme: {
              primary: "#ff6871",
              secondary: "#fff",
            },
          },
        }}
      />
    </AptosWalletAdapterProvider>
  </StrictMode>
);
