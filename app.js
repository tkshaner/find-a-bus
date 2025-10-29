const apiBase = "https://api.thebus.org";

const routeForm = document.getElementById("routeForm");
const vehicleForm = document.getElementById("vehicleForm");
const arrivalsForm = document.getElementById("arrivalsForm");

const routeResults = document.getElementById("routeResults");
const vehicleResults = document.getElementById("vehicleResults");
const arrivalsResults = document.getElementById("arrivalsResults");

const routeMapContainer = document.getElementById("routeMap");
const routeMapCanvas = document.getElementById("routeMapCanvas");

const vehicleMapContainer = document.getElementById("vehicleMap");
const vehicleMapCanvas = document.getElementById("vehicleMapCanvas");

const stopsMapContainer = document.getElementById("stopsMap");
const stopsMapCanvas = document.getElementById("stopsMapCanvas");
const toggleStopsBtn = document.getElementById("toggleStopsBtn");
const findNearbyBtn = document.getElementById("findNearbyBtn");
const stopsMessage = document.getElementById("stopsMessage");

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

// ============================================================================
// ROUTE MAP FUNCTIONALITY
// ============================================================================

let routeMap = null;
let routeShapesData = null;
let routeStopsData = null;
let routePolyline = null;
let routeStopMarkers = [];

// Initialize route map
function initRouteMap() {
  if (!routeMap && routeMapCanvas) {
    // Center on Honolulu
    routeMap = L.map(routeMapCanvas).setView([21.3099, -157.8581], 12);

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(routeMap);
  }
  return routeMap;
}

// Load route shapes data
async function loadRouteShapesData() {
  if (routeShapesData) {
    return routeShapesData;
  }

  try {
    const response = await fetch('routes-shapes.json');
    if (!response.ok) {
      throw new Error('Failed to load route shapes data');
    }
    routeShapesData = await response.json();
    return routeShapesData;
  } catch (error) {
    console.error('Error loading route shapes:', error);
    return null;
  }
}

// Load route stops data
async function loadRouteStopsData() {
  if (routeStopsData) {
    return routeStopsData;
  }

  try {
    const response = await fetch('route-stops.json');
    if (!response.ok) {
      throw new Error('Failed to load route stops data');
    }
    routeStopsData = await response.json();
    return routeStopsData;
  } catch (error) {
    console.error('Error loading route stops:', error);
    return null;
  }
}

// Draw route path on map
async function drawRoutePath(routeId) {
  // Load shapes data if needed
  const shapesData = await loadRouteShapesData();
  if (!shapesData || !shapesData[routeId]) {
    console.warn('No shape data for route', routeId);
    return null;
  }

  // Initialize map
  initRouteMap();

  // Clear existing polyline
  if (routePolyline) {
    routePolyline.remove();
    routePolyline = null;
  }

  const routeData = shapesData[routeId];
  const shapeId = Object.keys(routeData.shapes)[0];
  const coordinates = routeData.shapes[shapeId];

  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  // Create polyline
  const color = routeData.color ? `#${routeData.color}` : '#2563eb';
  routePolyline = L.polyline(coordinates, {
    color: color,
    weight: 5,
    opacity: 0.7,
    smoothFactor: 1
  }).addTo(routeMap);

  // Fit map to route bounds
  routeMap.fitBounds(routePolyline.getBounds().pad(0.1));

  // Add route info popup at start of route
  const startPoint = coordinates[0];
  L.marker(startPoint, {
    icon: L.divIcon({
      className: 'route-start-marker',
      html: `<div style="
        background: ${color};
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        white-space: nowrap;
      ">Route ${routeData.name}</div>`,
      iconSize: [60, 24],
      iconAnchor: [30, 12]
    })
  }).addTo(routeMap);

  return routePolyline;
}

// Add stop markers along route
async function addRouteStops(routeId) {
  // Clear existing stop markers
  routeStopMarkers.forEach(marker => marker.remove());
  routeStopMarkers = [];

  // Load stops data
  const stopsData = await loadRouteStopsData();
  if (!stopsData || !stopsData[routeId]) {
    console.warn('No stop data for route', routeId);
    return;
  }

  const routeData = stopsData[routeId];

  // Get first shape's stops
  const shapeId = Object.keys(routeData.shapes)[0];
  const stops = routeData.shapes[shapeId];

  if (!stops || stops.length === 0) {
    return;
  }

  // Create small circular markers for stops
  stops.forEach((stop, index) => {
    const isFirst = index === 0;
    const isLast = index === stops.length - 1;

    const marker = L.circleMarker([stop.lat, stop.lon], {
      radius: 6,
      fillColor: isFirst ? '#10b981' : isLast ? '#ef4444' : '#ffffff',
      color: '#2563eb',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    }).addTo(routeMap);

    // Add popup with stop info
    const popupContent = `
      <div style="min-width: 180px;">
        <h4 style="margin: 0 0 8px 0; color: var(--color-primary);">${stop.name}</h4>
        <dl style="margin: 0; display: grid; gap: 4px; font-size: 0.85em;">
          <div><dt style="font-weight: 600;">Stop Code:</dt><dd style="margin: 0;">${stop.code || stop.id}</dd></div>
          <div><dt style="font-weight: 600;">Sequence:</dt><dd style="margin: 0;">#${stop.sequence} of ${stops.length}</dd></div>
          ${isFirst ? '<div style="color: #10b981; font-weight: 600; margin-top: 4px;">First Stop</div>' : ''}
          ${isLast ? '<div style="color: #ef4444; font-weight: 600; margin-top: 4px;">Last Stop</div>' : ''}
        </dl>
        <button onclick="checkStopArrivals('${stop.code || stop.id}')"
                style="width: 100%; margin-top: 8px; padding: 6px 12px; background: var(--color-primary); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
          Check Arrivals
        </button>
      </div>
    `;

    marker.bindPopup(popupContent);
    routeStopMarkers.push(marker);
  });

  console.log(`Added ${stops.length} stop markers to route ${routeId}`);
}

// Show route map
function showRouteMap() {
  if (routeMapContainer) {
    routeMapContainer.style.display = 'block';
    setTimeout(() => {
      if (routeMap) {
        routeMap.invalidateSize();
      }
    }, 100);
  }
}

// Hide route map
function hideRouteMap() {
  if (routeMapContainer) {
    routeMapContainer.style.display = 'none';
  }
  if (routePolyline) {
    routePolyline.remove();
    routePolyline = null;
  }
  // Clear stop markers
  routeStopMarkers.forEach(marker => marker.remove());
  routeStopMarkers = [];
}

// Map instance for vehicle tracking
let vehicleMap = null;
let vehicleMarkers = [];

// Initialize Leaflet map for vehicle tracking
function initVehicleMap() {
  if (!vehicleMap && vehicleMapCanvas) {
    // Center on Honolulu
    vehicleMap = L.map(vehicleMapCanvas).setView([21.3099, -157.8581], 12);

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(vehicleMap);
  }
  return vehicleMap;
}

// Clear all vehicle markers from map
function clearVehicleMarkers() {
  vehicleMarkers.forEach(marker => marker.remove());
  vehicleMarkers = [];
}

// Add vehicle marker to map
function addVehicleMarker(vehicle) {
  const lat = parseFloat(vehicle.latitude);
  const lon = parseFloat(vehicle.longitude);

  if (isNaN(lat) || isNaN(lon)) {
    return null;
  }

  // Create custom popup content
  const popupContent = `
    <div style="min-width: 200px;">
      <h3 style="margin: 0 0 8px 0; color: var(--color-primary);">Bus ${vehicle.number || 'Unknown'}</h3>
      <dl style="margin: 0; display: grid; gap: 4px; font-size: 0.9em;">
        ${vehicle.route_short_name ? `<div><dt style="font-weight: 600;">Route:</dt><dd style="margin: 0;">${vehicle.route_short_name}</dd></div>` : ''}
        ${vehicle.headsign ? `<div><dt style="font-weight: 600;">Headsign:</dt><dd style="margin: 0;">${vehicle.headsign}</dd></div>` : ''}
        ${vehicle.adherence ? `<div><dt style="font-weight: 600;">Adherence:</dt><dd style="margin: 0;">${formatAdherence(vehicle.adherence)}</dd></div>` : ''}
        ${vehicle.last_message ? `<div><dt style="font-weight: 600;">Last Update:</dt><dd style="margin: 0;">${vehicle.last_message}</dd></div>` : ''}
      </dl>
    </div>
  `;

  // Create custom icon based on route
  const busIcon = L.divIcon({
    className: 'custom-bus-icon',
    html: `<div style="
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      color: white;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
      border: 3px solid white;
    ">🚌</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });

  const marker = L.marker([lat, lon], { icon: busIcon })
    .addTo(vehicleMap)
    .bindPopup(popupContent);

  vehicleMarkers.push(marker);

  return marker;
}

// Format adherence in human-readable way
function formatAdherence(adherence) {
  const seconds = parseInt(adherence);
  if (isNaN(seconds)) return adherence;

  const minutes = Math.round(seconds / 60);

  if (minutes === 0) return "On time";
  if (minutes > 0) return `${minutes} min late`;
  return `${Math.abs(minutes)} min early`;
}

// Show map and fit bounds to markers
function showVehicleMap() {
  if (vehicleMapContainer) {
    vehicleMapContainer.style.display = 'block';

    // Invalidate size to fix rendering issues
    setTimeout(() => {
      if (vehicleMap) {
        vehicleMap.invalidateSize();

        // Fit map to show all markers
        if (vehicleMarkers.length > 0) {
          const group = L.featureGroup(vehicleMarkers);
          vehicleMap.fitBounds(group.getBounds().pad(0.1));
        }
      }
    }, 100);
  }
}

// Hide vehicle map
function hideVehicleMap() {
  if (vehicleMapContainer) {
    vehicleMapContainer.style.display = 'none';
  }
}

// ============================================================================
// STOPS MAP FUNCTIONALITY
// ============================================================================

let stopsMap = null;
let stopsData = null;
let stopsClusterGroup = null;
let stopsLoaded = false;

// Initialize stops map
function initStopsMap() {
  if (!stopsMap && stopsMapCanvas) {
    // Center on Honolulu
    stopsMap = L.map(stopsMapCanvas).setView([21.3099, -157.8581], 11);

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(stopsMap);

    // Initialize marker cluster group
    stopsClusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true
    });

    stopsMap.addLayer(stopsClusterGroup);
  }
  return stopsMap;
}

// Load stops data from JSON file
async function loadStopsData() {
  if (stopsData) {
    return stopsData; // Already loaded
  }

  try {
    showStopsMessage('Loading 3,825 bus stops...');
    const response = await fetch('stops.json');
    if (!response.ok) {
      throw new Error('Failed to load stops data');
    }
    stopsData = await response.json();
    showStopsMessage(`Loaded ${stopsData.length} stops successfully!`);
    setTimeout(() => hideStopsMessage(), 2000);
    return stopsData;
  } catch (error) {
    showStopsMessage('Error loading stops: ' + error.message, true);
    throw error;
  }
}

// Add stop markers to map
function addStopsToMap(stops) {
  if (!stopsClusterGroup) return;

  // Clear existing markers
  stopsClusterGroup.clearLayers();

  stops.forEach(stop => {
    // Create custom stop icon
    const stopIcon = L.divIcon({
      className: 'custom-stop-icon',
      html: `<div style="
        background: white;
        border: 2px solid #2563eb;
        border-radius: 50%;
        width: 12px;
        height: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
      popupAnchor: [0, -6]
    });

    // Create popup content
    const popupContent = `
      <div style="min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; color: var(--color-primary); font-size: 1em;">
          Stop ${stop.code}
        </h3>
        <p style="margin: 0 0 8px 0; font-weight: 600;">
          ${stop.name}
        </p>
        <button
          onclick="checkStopArrivals('${stop.id}')"
          style="
            width: 100%;
            padding: 8px 12px;
            background: linear-gradient(135deg, #2563eb, #3b82f6);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            font-size: 0.9em;
          "
        >
          Check Arrivals
        </button>
      </div>
    `;

    const marker = L.marker([stop.lat, stop.lon], { icon: stopIcon })
      .bindPopup(popupContent);

    stopsClusterGroup.addLayer(marker);
  });

  stopsLoaded = true;
}

// Show message in stops section
function showStopsMessage(message, isError = false) {
  if (stopsMessage) {
    stopsMessage.textContent = message;
    stopsMessage.style.display = 'block';
    if (isError) {
      stopsMessage.style.background = 'rgba(220, 38, 38, 0.1)';
      stopsMessage.style.borderColor = 'rgba(220, 38, 38, 0.3)';
      stopsMessage.style.color = '#991b1b';
    } else {
      stopsMessage.style.background = 'rgba(59, 130, 246, 0.1)';
      stopsMessage.style.borderColor = 'rgba(59, 130, 246, 0.3)';
      stopsMessage.style.color = 'var(--color-text)';
    }
  }
}

// Hide message in stops section
function hideStopsMessage() {
  if (stopsMessage) {
    stopsMessage.style.display = 'none';
  }
}

// Toggle stops map visibility
async function toggleStopsMap() {
  if (!stopsMapContainer) return;

  const isVisible = stopsMapContainer.style.display !== 'none';

  if (isVisible) {
    // Hide map
    stopsMapContainer.style.display = 'none';
    toggleStopsBtn.textContent = 'Show All Stops on Map';
    findNearbyBtn.style.display = 'none';
  } else {
    // Show map
    stopsMapContainer.style.display = 'block';
    toggleStopsBtn.textContent = 'Hide Stops Map';
    findNearbyBtn.style.display = 'inline-block';

    // Initialize map if needed
    initStopsMap();

    // Load and display stops if not already loaded
    if (!stopsLoaded) {
      try {
        const stops = await loadStopsData();
        addStopsToMap(stops);
      } catch (error) {
        console.error('Failed to load stops:', error);
      }
    }

    // Fix map rendering issues
    setTimeout(() => {
      if (stopsMap) {
        stopsMap.invalidateSize();
      }
    }, 100);
  }
}

// Global function to check stop arrivals (called from popup button)
window.checkStopArrivals = function(stopId) {
  // Scroll to arrivals section
  const arrivalsSection = document.querySelector('#arrivals-title').closest('.panel');
  arrivalsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Fill in stop number
  const stopInput = document.getElementById('stopNumber');
  if (stopInput) {
    stopInput.value = stopId;
    // Trigger the form submission
    setTimeout(() => {
      const arrivalsForm = document.getElementById('arrivalsForm');
      if (arrivalsForm) {
        arrivalsForm.requestSubmit();
      }
    }, 500);
  }
};

// Find nearby stops using geolocation
function findNearbyStops() {
  if (!navigator.geolocation) {
    showStopsMessage('Geolocation is not supported by your browser', true);
    return;
  }

  showStopsMessage('Getting your location...');

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const userLat = position.coords.latitude;
      const userLon = position.coords.longitude;

      // Load stops if not loaded
      if (!stopsData) {
        await loadStopsData();
      }

      // Calculate distances and find nearest stops
      const stopsWithDistance = stopsData.map(stop => {
        const distance = calculateDistance(userLat, userLon, stop.lat, stop.lon);
        return { ...stop, distance };
      });

      // Sort by distance and get top 10
      const nearbyStops = stopsWithDistance
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10);

      // Add user location marker
      if (stopsMap) {
        const userIcon = L.divIcon({
          className: 'user-location-icon',
          html: `<div style="
            background: #ef4444;
            border: 3px solid white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          "></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        L.marker([userLat, userLon], { icon: userIcon })
          .addTo(stopsMap)
          .bindPopup('<strong>You are here</strong>')
          .openPopup();

        // Zoom to show user and nearby stops
        const bounds = L.latLngBounds([[userLat, userLon]]);
        nearbyStops.forEach(stop => bounds.extend([stop.lat, stop.lon]));
        stopsMap.fitBounds(bounds.pad(0.1));
      }

      showStopsMessage(`Found ${nearbyStops.length} stops within ${nearbyStops[0].distance.toFixed(2)} - ${nearbyStops[nearbyStops.length - 1].distance.toFixed(2)} km`);
      setTimeout(() => hideStopsMessage(), 3000);
    },
    (error) => {
      showStopsMessage('Unable to get your location: ' + error.message, true);
    }
  );
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// Event listeners for stops map
if (toggleStopsBtn) {
  toggleStopsBtn.addEventListener('click', toggleStopsMap);
}

if (findNearbyBtn) {
  findNearbyBtn.addEventListener('click', findNearbyStops);
}

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
    if (key === "adherence" && value) {
      value = formatAdherence(value);
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
  hideRouteMap();

  try {
    const data = await fetchFromApi("/routeJSON", {
      route,
      ...(headsign ? { headsign } : {}),
    });

    if (!data.route || data.route.length === 0) {
      renderMessage(routeResults, "No routes found. Try a different search.");
      hideRouteMap();
      return;
    }

    // Draw route path on map
    const drawnRoute = await drawRoutePath(route);
    if (drawnRoute) {
      // Add stop markers along the route
      await addRouteStops(route);
      showRouteMap();
    }

    // Still show cards below map for detailed info
    routeResults.replaceChildren();

    // Add route summary header
    const shapesData = await loadRouteShapesData();
    if (shapesData && shapesData[route]) {
      const routeInfo = shapesData[route];
      const header = document.createElement("div");
      header.className = "route-header";
      header.innerHTML = `
        <h3 style="margin: 0 0 0.5rem 0; color: var(--color-primary);">
          Route ${routeInfo.name}: ${routeInfo.long_name}
        </h3>
        <p style="margin: 0; color: var(--color-text-muted);">
          ${data.route.length} variant${data.route.length > 1 ? 's' : ''} found
        </p>
      `;
      routeResults.append(header);
    }

    // Show route variant cards
    data.route.forEach((routeItem) => {
      renderCard(routeResults, templates.route, routeItem);
    });
  } catch (error) {
    renderMessage(routeResults, error.message, "error-state");
    hideRouteMap();
  }
});

vehicleForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(vehicleForm);
  const num = formData.get("num");

  renderLoading(vehicleResults);
  hideVehicleMap();

  try {
    // Note: /vehicle endpoint returns XML, not JSON
    const data = await fetchFromApi("/vehicle/", { num });
    const vehicles = data.vehicles ?? [];

    if (vehicles.length === 0) {
      renderMessage(vehicleResults, "No vehicle data available. Check the vehicle number and try again.");
      return;
    }

    // Initialize map and clear previous markers
    initVehicleMap();
    clearVehicleMarkers();

    // Render vehicle cards
    vehicleResults.replaceChildren();
    vehicles.forEach(({ vehicle }) => {
      renderCard(vehicleResults, templates.vehicle, vehicle ?? {});

      // Add vehicle to map if coordinates are valid
      if (vehicle && vehicle.latitude && vehicle.longitude) {
        addVehicleMarker(vehicle);
      }
    });

    // Show map if we have any markers
    if (vehicleMarkers.length > 0) {
      showVehicleMap();
    }
  } catch (error) {
    renderMessage(vehicleResults, error.message, "error-state");
    hideVehicleMap();
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
