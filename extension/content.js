(() => {
  "use strict";

  const PROXY_URL = "http://127.0.0.1:8000/v1/proxy/chat";
  const DEFAULT_STATE = { enabled: true, requestCount: 0 };
  let settings = { ...DEFAULT_STATE };
  let badge;
  let activeRequest = false;

  function createBadge() {
    if (badge) return badge;

    badge = document.createElement("aside");
    badge.id = "polyglot-proxy-gate";
    badge.setAttribute("role", "status");
    badge.setAttribute("aria-live", "polite");
    badge.innerHTML = `
      <strong class="ppg-title">Polyglot Proxy</strong>
      <span class="ppg-status">Ready</span>
    `;

    const style = document.createElement("style");
    style.textContent = `
      #polyglot-proxy-gate {
        all: initial;
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 150px;
        padding: 10px 12px;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 12px;
        color: #f8fafc;
        background: #111827;
        box-shadow: 0 8px 30px rgba(0,0,0,.22);
        font: 12px/1.35 system-ui, sans-serif;
      }
      #polyglot-proxy-gate .ppg-title { font-size: 12px; }
      #polyglot-proxy-gate .ppg-status { color: #93c5fd; }
      #polyglot-proxy-gate.ppg-ok .ppg-status { color: #86efac; }
      #polyglot-proxy-gate.ppg-blocked .ppg-status { color: #fca5a5; }
      #polyglot-proxy-gate.ppg-error .ppg-status { color: #fcd34d; }
    `;
    (document.head || document.documentElement).appendChild(style);
    document.documentElement.appendChild(badge);
    return badge;
  }

  function setBadge(message, stateClass = "") {
    const element = createBadge();
    element.className = stateClass;
    element.querySelector(".ppg-status").textContent = message;
  }

  function isEditable(element) {
    if (!(element instanceof HTMLElement)) return false;
    return element.matches("textarea, input[type='text'], input[type='search'], [contenteditable='true']");
  }

  function readPrompt(element) {
    if (element.matches("[contenteditable='true']")) return element.innerText.trim();
    return element.value.trim();
  }

  function incrementRequestCount() {
    chrome.storage.local.get(DEFAULT_STATE, (stored) => {
      const requestCount = Number.isFinite(stored.requestCount)
        ? stored.requestCount + 1
        : 1;
      chrome.storage.local.set({ requestCount });
    });
  }

  async function submitPrompt(prompt) {
    if (!settings.enabled || activeRequest || !prompt) return;

    activeRequest = true;
    incrementRequestCount();
    setBadge("Checking prompt…");

    try {
      const response = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, user_id: "extension_user" }),
      });

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`Proxy returned HTTP ${response.status}.`);
      }
      if (!response.ok) {
        throw new Error(payload.detail || `Proxy returned HTTP ${response.status}.`);
      }

      const metrics = payload.metrics || {};
      if (payload.status === "blocked" || metrics.decision === "BLOCK") {
        setBadge("Blocked by guardrails", "ppg-blocked");
        return;
      }

      const tier = metrics.tier || metrics.model || "routed";
      const latency = metrics.latency_ms ?? "—";
      setBadge(`${tier} • ${latency} ms`, "ppg-ok");
    } catch (error) {
      console.error("Polyglot Proxy request failed:", error);
      setBadge("Proxy unavailable", "ppg-error");
    } finally {
      activeRequest = false;
    }
  }

  function handleKeydown(event) {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    if (!isEditable(event.target)) return;
    const prompt = readPrompt(event.target);
    if (prompt) submitPrompt(prompt);
  }

  function loadSettings() {
    chrome.storage.local.get(DEFAULT_STATE, (stored) => {
      settings = {
        enabled: stored.enabled !== false,
        requestCount: Number.isFinite(stored.requestCount) ? stored.requestCount : 0,
      };
      createBadge();
      setBadge(settings.enabled ? "Ready" : "Disabled");
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.enabled) return;
    settings.enabled = changes.enabled.newValue !== false;
    setBadge(settings.enabled ? "Ready" : "Disabled");
  });

  document.addEventListener("keydown", handleKeydown, true);
  loadSettings();
})();
