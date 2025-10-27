const apiBase = "https://api.thebus.org";

const routeForm = document.getElementById("routeForm");
const vehicleForm = document.getElementById("vehicleForm");
const arrivalsForm = document.getElementById("arrivalsForm");

const routeResults = document.getElementById("routeResults");
const vehicleResults = document.getElementById("vehicleResults");
const arrivalsResults = document.getElementById("arrivalsResults");

const apiKeyInput = document.getElementById("apiKey");

const storageKey = "thebus-api-key";

let storage;
try {
  storage = window.localStorage;
} catch (error) {
  storage = undefined;
}

if (apiKeyInput && storage) {
  apiKeyInput.value = storage.getItem(storageKey) ?? "";
  apiKeyInput.addEventListener("input", (event) => {
    storage.setItem(storageKey, event.target.value.trim());
  });
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

async function fetchFromApi(path, params = {}) {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    throw new Error("Please enter your TheBus API key to continue.");
  }

  const searchParams = new URLSearchParams({ key: apiKey, ...params });
  const url = `${apiBase}${path}?${searchParams.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  const data = await response.json();

  if (data.errorMessage) {
    throw new Error(data.errorMessage);
  }

  return data;
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
    const data = await fetchFromApi("/vehicle", { num });
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
