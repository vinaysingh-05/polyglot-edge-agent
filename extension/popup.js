(() => {
  "use strict";

  const PROXY_URL = "https://polyglot-edge-agent.onrender.com";
  const DEFAULT_STATE = { enabled: true, requestCount: 0 };
  const enabledToggle = document.getElementById("enabled");
  const enabledLabel = document.getElementById("enabled-label");
  const requestCount = document.getElementById("request-count");
  const connection = document.getElementById("connection");

  function renderState(state) {
    const enabled = state.enabled !== false;
    enabledToggle.checked = enabled;
    enabledLabel.textContent = enabled ? "Enabled" : "Disabled";
    requestCount.textContent = String(
      Number.isFinite(state.requestCount) ? state.requestCount : 0
    );
  }

  function loadState() {
    chrome.storage.local.get(DEFAULT_STATE, renderState);
  }

  async function checkConnection() {
    try {
      const response = await fetch(`${PROXY_URL}/openapi.json`, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      connection.textContent = "Connected";
      connection.classList.add("connected");
    } catch (error) {
      console.warn("Polyglot Proxy is unavailable:", error);
      connection.textContent = "Unavailable";
      connection.classList.remove("connected");
    }
  }

  enabledToggle.addEventListener("change", () => {
    chrome.storage.local.set({ enabled: enabledToggle.checked }, () => {
      if (chrome.runtime.lastError) {
        console.error("Could not save interception setting:", chrome.runtime.lastError);
        loadState();
        return;
      }
      renderState({ enabled: enabledToggle.checked, requestCount: Number(requestCount.textContent) });
    });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const state = {};
    if (changes.enabled) state.enabled = changes.enabled.newValue;
    if (changes.requestCount) state.requestCount = changes.requestCount.newValue;
    if (Object.keys(state).length) {
      chrome.storage.local.get(DEFAULT_STATE, renderState);
    }
  });

  loadState();
  checkConnection();
})();
