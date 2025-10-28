const apiBase = "https://api.thebus.org";

const routeForm = document.getElementById("routeForm");
const vehicleForm = document.getElementById("vehicleForm");
const arrivalsForm = document.getElementById("arrivalsForm");

const routeResults = document.getElementById("routeResults");
const vehicleResults = document.getElementById("vehicleResults");
const arrivalsResults = document.getElementById("arrivalsResults");

const apiKeyInput = document.getElementById("apiKey");
const rememberKeyCheckbox = document.getElementById("rememberKey");
const toggleKeyVisibilityBtn = document.getElementById("toggleKeyVisibility");
const clearKeyBtn = document.getElementById("clearKey");
const keyHelpText = document.getElementById("key-help");

const storageKey = "thebus-api-key";
const rememberKeyStorageKey = "thebus-remember-key";

// Storage abstraction - use sessionStorage by default, localStorage if "remember" is checked
function getStorage() {
  const remember = getRememberPreference();
  try {
    return remember ? window.localStorage : window.sessionStorage;
  } catch (error) {
    return undefined;
  }
}

function getRememberPreference() {
  try {
    return window.localStorage.getItem(rememberKeyStorageKey) === "true";
  } catch (error) {
    return false;
  }
}

function setRememberPreference(remember) {
  try {
    if (remember) {
      window.localStorage.setItem(rememberKeyStorageKey, "true");
    } else {
      window.localStorage.removeItem(rememberKeyStorageKey);
    }
  } catch (error) {
    // Silently fail if localStorage is disabled
  }
}

// Validate API key format (basic validation)
function validateApiKey(key) {
  if (!key || key.trim().length === 0) {
    return { valid: false, message: "API key is required" };
  }

  const trimmedKey = key.trim();

  // Basic validation: check for reasonable length and alphanumeric characters
  if (trimmedKey.length < 8) {
    return { valid: false, message: "API key appears too short" };
  }

  if (trimmedKey.length > 128) {
    return { valid: false, message: "API key appears too long" };
  }

  // Check for common placeholder values
  const placeholders = ['your-api-key', 'api-key-here', 'enter-key', 'test', 'demo'];
  if (placeholders.some(p => trimmedKey.toLowerCase().includes(p))) {
    return { valid: false, message: "Please enter a valid API key" };
  }

  return { valid: true, message: "" };
}

// Load saved API key on page load
if (apiKeyInput) {
  const remember = getRememberPreference();
  const storage = getStorage();

  // Set checkbox state
  if (rememberKeyCheckbox) {
    rememberKeyCheckbox.checked = remember;
  }

  // Load saved key if it exists
  if (storage) {
    const savedKey = storage.getItem(storageKey);
    if (savedKey) {
      apiKeyInput.value = savedKey;
    }
  }

  // Update help text based on remember preference
  function updateHelpText() {
    if (keyHelpText && rememberKeyCheckbox) {
      if (rememberKeyCheckbox.checked) {
        keyHelpText.textContent = "Your key is stored permanently in this browser";
      } else {
        keyHelpText.textContent = "Your key is stored temporarily in this browser session";
      }
    }
  }

  updateHelpText();

  // Handle API key input changes
  apiKeyInput.addEventListener("input", (event) => {
    const storage = getStorage();
    if (storage) {
      const trimmedKey = event.target.value.trim();
      if (trimmedKey) {
        storage.setItem(storageKey, trimmedKey);
      } else {
        storage.removeItem(storageKey);
      }
    }
  });

  // Handle remember checkbox changes
  if (rememberKeyCheckbox) {
    rememberKeyCheckbox.addEventListener("change", (event) => {
      const remember = event.target.checked;
      setRememberPreference(remember);

      // Move key between storage types
      const currentKey = apiKeyInput.value.trim();
      if (currentKey) {
        try {
          // Clear from old storage
          window.sessionStorage.removeItem(storageKey);
          window.localStorage.removeItem(storageKey);

          // Save to new storage
          const newStorage = getStorage();
          if (newStorage) {
            newStorage.setItem(storageKey, currentKey);
          }
        } catch (error) {
          // Silently fail if storage is disabled
        }
      }

      updateHelpText();
    });
  }

  // Handle show/hide key visibility
  if (toggleKeyVisibilityBtn) {
    toggleKeyVisibilityBtn.addEventListener("click", () => {
      if (apiKeyInput.type === "password") {
        apiKeyInput.type = "text";
        toggleKeyVisibilityBtn.setAttribute("aria-label", "Hide API key");
        toggleKeyVisibilityBtn.title = "Hide key";
      } else {
        apiKeyInput.type = "password";
        toggleKeyVisibilityBtn.setAttribute("aria-label", "Show API key");
        toggleKeyVisibilityBtn.title = "Show key";
      }
    });
  }

  // Handle clear key button
  if (clearKeyBtn) {
    clearKeyBtn.addEventListener("click", () => {
      apiKeyInput.value = "";
      try {
        window.sessionStorage.removeItem(storageKey);
        window.localStorage.removeItem(storageKey);
      } catch (error) {
        // Silently fail if storage is disabled
      }
      apiKeyInput.focus();
    });
  }
}

const templates = {
  route: document.getElementById("route-template"),
  vehicle: document.getElementById("vehicle-template"),
  arrival: document.getElementById("arrival-template"),
};

function renderLoading(container) {
  container.replaceChildren();
  const spinner = document.createElement("div");
  spinner.className = "loading-spinner";
  container.append(spinner);
}

function renderMessage(container, message, className = "empty-state") {
  container.replaceChildren();
  const div = document.createElement("div");
  div.className = className;
  div.textContent = message;
  container.append(div);
}

function renderCard(container, template, data) {
  const card = template.content.cloneNode(true);
  card.querySelectorAll("[data-field]").forEach((node) => {
    const key = node.getAttribute("data-field");
    let value = data[key];

    if (key === "estimated") {
      value = data[key] ? "Real-time update" : "Scheduled only";
    }
    if (key === "canceled") {
      value = data[key] ? "Canceled" : "On schedule";
    }
    if (value === undefined || value === null || value === "") {
      value = "—";
    }

    node.textContent = value;
  });
  container.append(card);
}

function createProxyUrl(url) {
  const encoded = encodeURIComponent(url);
  return `https://corsproxy.io/?${encoded}`;
}

// Parse XML vehicle response and convert to JSON format
function parseVehicleXML(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  // Check for XML parsing errors
  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    throw new Error("Invalid XML response");
  }

  const vehicleElements = xmlDoc.querySelectorAll("vehicle");
  const vehicles = [];

  vehicleElements.forEach((vehicleEl) => {
    const vehicle = {};
    // Get all child elements and convert to object
    Array.from(vehicleEl.children).forEach((child) => {
      const value = child.textContent;
      // Convert "null" strings to actual null
      vehicle[child.tagName] = value === "null" ? null : value;
    });

    vehicles.push({ vehicle });
  });

  return {
    timestamp: xmlDoc.querySelector("timestamp")?.textContent || "",
    vehicles: vehicles
  };
}

async function fetchJson(url, { useProxy = false } = {}) {
  const targetUrl = useProxy ? createProxyUrl(url) : url;
  const headers = { Accept: "application/json" };

  if (useProxy) {
    headers["X-Requested-With"] = "find-a-bus";
  }

  const response = await fetch(targetUrl, { headers });

  if (!response.ok) {
    const error = new Error(`Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  const body = await response.text();

  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch (parseError) {
    parseError.name = "JsonParseError";
    throw parseError;
  }
}

function shouldRetryWithProxy(error) {
  if (!error) {
    return false;
  }

  if (error.name === "JsonParseError") {
    return true;
  }

  if (typeof TypeError !== "undefined" && error instanceof TypeError) {
    return true;
  }

  return false;
}

async function fetchFromApi(path, params = {}) {
  const apiKey = apiKeyInput.value.trim();

  // Validate API key
  const validation = validateApiKey(apiKey);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const searchParams = new URLSearchParams({ key: apiKey });
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  const url = new URL(path, apiBase);
  url.search = searchParams.toString();

  // Special handling for /vehicle endpoint which returns XML
  const isVehicleEndpoint = path.includes("/vehicle");

  try {
    if (isVehicleEndpoint) {
      // Fetch XML for vehicle endpoint
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      const xmlText = await response.text();
      return parseVehicleXML(xmlText);
    } else {
      // Fetch JSON for other endpoints
      const data = await fetchJson(url.toString());
      if (data.errorMessage) {
        throw new Error(data.errorMessage);
      }
      return data;
    }
  } catch (error) {
    // Retry with proxy for both XML and JSON endpoints on CORS/network errors
    if (!isVehicleEndpoint && !shouldRetryWithProxy(error)) {
      throw error;
    }

    // For vehicle endpoint, retry with proxy on any error (likely CORS)
    if (isVehicleEndpoint) {
      try {
        const proxyUrl = createProxyUrl(url.toString());
        const response = await fetch(proxyUrl, {
          headers: { "X-Requested-With": "find-a-bus" }
        });
        if (!response.ok) {
          throw new Error(`Request failed via proxy (${response.status})`);
        }
        const xmlText = await response.text();
        return parseVehicleXML(xmlText);
      } catch (proxyError) {
        throw new Error("Unable to fetch vehicle data. Please try again later.");
      }
    }

    // Retry JSON endpoints with proxy
    try {
      const data = await fetchJson(url.toString(), { useProxy: true });
      if (data.errorMessage) {
        throw new Error(data.errorMessage);
      }
      return data;
    } catch (proxyError) {
      if (proxyError.name === "JsonParseError") {
        throw new Error("Received an unexpected response from TheBus API.");
      }

      throw proxyError;
    }
  }
}

routeForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(routeForm);
  const route = formData.get("route");
  const headsign = formData.get("headsign");

  renderLoading(routeResults);

  try {
    const data = await fetchFromApi("/routeJSON", {
      route,
      ...(headsign ? { headsign } : {}),
    });

    if (!data.route || data.route.length === 0) {
      renderMessage(routeResults, "No routes found. Try a different search.");
      return;
    }

    routeResults.replaceChildren();
    data.route.forEach((routeItem) => {
      renderCard(routeResults, templates.route, routeItem);
    });
  } catch (error) {
    renderMessage(routeResults, error.message, "error-state");
  }
});

vehicleForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(vehicleForm);
  const num = formData.get("num");

  renderLoading(vehicleResults);

  try {
    // Note: /vehicle endpoint returns XML, not JSON
    const data = await fetchFromApi("/vehicle/", { num });
    const vehicles = data.vehicles ?? [];

    if (vehicles.length === 0) {
      renderMessage(vehicleResults, "No vehicle data available. Check the vehicle number and try again.");
      return;
    }

    vehicleResults.replaceChildren();
    vehicles.forEach(({ vehicle }) => {
      renderCard(vehicleResults, templates.vehicle, vehicle ?? {});
    });
  } catch (error) {
    renderMessage(vehicleResults, error.message, "error-state");
  }
});

arrivalsForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(arrivalsForm);
  const stop = formData.get("stop");

  renderLoading(arrivalsResults);

  try {
    const data = await fetchFromApi("/arrivalsJSON", { stop });
    const arrivals = data.arrivals ?? [];

    if (arrivals.length === 0) {
      renderMessage(arrivalsResults, "No upcoming arrivals reported for this stop.");
      return;
    }

    arrivalsResults.replaceChildren();
    arrivals.forEach((arrival) => {
      renderCard(arrivalsResults, templates.arrival, arrival);
    });
  } catch (error) {
    renderMessage(arrivalsResults, error.message, "error-state");
  }
});
