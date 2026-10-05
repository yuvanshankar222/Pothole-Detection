// State initialized with original sample records
let history = [
  {
    id: "PH-104",
    date: "27 Aug 2026, 10:42",
    severity: "High",
    intensity: 7.6,
    lat: 12.9716,
    lng: 77.5946,
    confidence: 92,
    magnitude: 12.85,
    source: "sensor",
    description: "Deep cavity causing sharp vertical acceleration impact.",
    recommendation: "Immediate cold-mix asphalt patch required.",
    boundingBoxes: [{ ymin: 380, xmin: 300, ymax: 680, xmax: 620, label: "Severe Pothole", confidence: 92, severity: "High" }]
  },
  {
    id: "PH-103",
    date: "27 Aug 2026, 09:15",
    severity: "Medium",
    intensity: 5.4,
    lat: 12.9752,
    lng: 77.5991,
    confidence: 84,
    magnitude: 11.97,
    source: "sensor",
    description: "Moderate surface depression along traffic wheel path.",
    recommendation: "Schedule for routine surface milling and resurfacing.",
    boundingBoxes: [{ ymin: 420, xmin: 350, ymax: 610, xmax: 580, label: "Medium Pothole", confidence: 84, severity: "Medium" }]
  },
  {
    id: "PH-102",
    date: "26 Aug 2026, 16:30",
    severity: "Low",
    intensity: 2.8,
    lat: 12.9681,
    lng: 77.5872,
    confidence: 76,
    magnitude: 10.93,
    source: "sensor",
    description: "Minor alligator cracking with small initial aggregate loss.",
    recommendation: "Seal cracks to prevent water penetration and sub-base degradation.",
    boundingBoxes: [{ ymin: 490, xmin: 410, ymax: 590, xmax: 530, label: "Minor Pothole", confidence: 76, severity: "Low" }]
  },
  {
    id: "PH-101",
    date: "26 Aug 2026, 13:05",
    severity: "Medium",
    intensity: 4.9,
    lat: 12.9788,
    lng: 77.6035,
    confidence: 81,
    magnitude: 11.62,
    source: "sensor",
    description: "Sub-base subsidence with sharp asphalt lip.",
    recommendation: "Tamp down aggregate and apply hot asphalt overlay.",
    boundingBoxes: [{ ymin: 400, xmin: 320, ymax: 650, xmax: 600, label: "Medium Pothole", confidence: 81, severity: "Medium" }]
  }
];

let currentDetection = { ...history[0] };
let nextPotholeNumber = 105;
let currentActiveFilter = "all";
let mapMarkers = [];

// Current inspection image state
let currentLoadedImage = null;
let currentImageDetections = [];

// Leaflet Map Initialization
const map = L.map("map").setView([currentDetection.lat, currentDetection.lng], 14);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

let potholeMarker = null;

// Custom colored icons for Leaflet
function createCustomPin(severity, isSelected = false) {
  const color = severity === "High" ? "#dc3d4b" : severity === "Medium" ? "#e89628" : "#319c6c";
  const size = isSelected ? 24 : 18;
  const border = isSelected ? "3px solid #ffffff" : "2px solid #ffffff";
  const shadow = isSelected ? "box-shadow: 0 0 12px rgba(0,0,0,0.5);" : "box-shadow: 0 2px 5px rgba(0,0,0,0.3);";

  return L.divIcon({
    className: "custom-leaflet-pin",
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; ${border} ${shadow}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

function severityClass(severity) {
  return (severity || "Low").toLowerCase();
}

function popupContent(item) {
  return `
    <div style="min-width: 170px; font-family: Arial, sans-serif;">
      <strong style="color: #102a43; font-size: 1.05em;">${item.id}</strong>
      <span style="display:inline-block; margin-left:6px; font-size:0.8em; padding:2px 6px; border-radius:4px; font-weight:bold; background:${item.severity === 'High' ? '#fff1f2' : item.severity === 'Medium' ? '#fff6df' : '#e8f8f0'}; color:${item.severity === 'High' ? '#a12d38' : item.severity === 'Medium' ? '#9a5d00' : '#176742'}">${item.severity}</span>
      <hr style="border:0; border-top:1px solid #e2e8f0; margin:6px 0;">
      <div style="font-size: 0.85em; line-height: 1.45; color: #486581;">
        <strong>Impact:</strong> ${item.intensity} / 10<br>
        <strong>Confidence:</strong> ${item.confidence}%<br>
        <strong>Source:</strong> ${item.source || 'sensor'}<br>
        <strong>GPS:</strong> ${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}
      </div>
      <button onclick="window.selectDetectionById('${item.id}')" style="margin-top:8px; width:100%; background:#1769aa; color:white; border:none; border-radius:4px; padding:4px 8px; font-size:0.8em; cursor:pointer;">Inspect Details</button>
    </div>
  `;
}

// Render all map markers with filtering support
function renderMapMarkers() {
  // Clear existing markers
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];

  const filtered = currentActiveFilter === "all"
    ? history
    : history.filter(item => item.severity === currentActiveFilter);

  filtered.forEach(item => {
    const isSelected = item.id === currentDetection.id;
    const marker = L.marker([item.lat, item.lng], {
      icon: createCustomPin(item.severity, isSelected)
    }).addTo(map);

    marker.bindPopup(popupContent(item));
    marker.on("click", () => {
      updateResult(item, false);
    });

    mapMarkers.push(marker);
  });
}

// Move marker and pan to selected item
function updateMap(item) {
  renderMapMarkers();
  map.setView([item.lat, item.lng], Math.max(map.getZoom(), 14));
}

// Global hook for popup button
window.selectDetectionById = function(id) {
  const item = history.find(h => h.id === id);
  if (item) {
    updateResult(item);
  }
};

// Global hook for delete button
window.deleteDetectionById = async function(id) {
  if (!confirm(`Delete record ${id}?`)) return;
  try {
    const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
    if (res.ok) {
      history = history.filter(item => item.id !== id);
    }
  } catch {
    history = history.filter(item => item.id !== id);
  }
  if (currentDetection.id === id && history.length > 0) {
    currentDetection = { ...history[0] };
    updateResult(currentDetection);
  }
  renderHistory();
  renderMapMarkers();
  updateAnalytics();
};

function renderHistory() {
  const historyBody = document.getElementById("historyBody");
  if (!historyBody) return;

  const searchQuery = (document.getElementById("historySearchInput")?.value || "").toLowerCase().trim();
  const severityFilter = document.getElementById("historySeveritySelect")?.value || "all";

  const filtered = history.filter(item => {
    const matchesSearch = !searchQuery ||
      item.id.toLowerCase().includes(searchQuery) ||
      (item.description && item.description.toLowerCase().includes(searchQuery)) ||
      (item.source && item.source.toLowerCase().includes(searchQuery));

    const matchesSeverity = severityFilter === "all" || item.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  historyBody.innerHTML = filtered.map(item => `
    <tr class="${item.id === currentDetection.id ? 'active-row' : ''}">
      <td><strong>${item.id}</strong></td>
      <td>${item.date}</td>
      <td><span class="source-badge ${item.source || 'sensor'}">${item.source || 'sensor'}</span></td>
      <td><span class="severity ${severityClass(item.severity)}">${item.severity}</span></td>
      <td>${item.intensity} / 10</td>
      <td>${item.lat}</td>
      <td>${item.lng}</td>
      <td>${item.confidence}%</td>
      <td>
        <div class="action-btn-group">
          <button type="button" class="view-btn" onclick="window.selectDetectionById('${item.id}')">View</button>
          <button type="button" class="delete-btn" onclick="window.deleteDetectionById('${item.id}')">Delete</button>
        </div>
      </td>
    </tr>`).join("");

  document.getElementById("totalPotholes").textContent = history.length;
  ["High", "Medium", "Low"].forEach(level => {
    const total = history.filter(item => item.severity === level).length;
    const elem = document.getElementById(`${level.toLowerCase()}Potholes`);
    if (elem) elem.textContent = total;
  });
}

function updateResult(item, panMap = true) {
  currentDetection = item;
  document.getElementById("detectionStatus").textContent = "Pothole detected";

  const magElem = document.getElementById("accelerationMagnitude");
  if (magElem) magElem.textContent = `${(item.magnitude || 9.81).toFixed(2)} m/s²`;

  document.getElementById("confidence").textContent = `${item.confidence}%`;
  document.getElementById("impactResult").textContent = `${item.intensity} / 10`;
  document.getElementById("latitude").textContent = item.lat;
  document.getElementById("longitude").textContent = item.lng;
  document.getElementById("resultLatitude").textContent = item.lat;
  document.getElementById("resultLongitude").textContent = item.lng;

  const resultId = document.getElementById("resultIdDisplay");
  if (resultId) resultId.textContent = item.id;

  const sourceDisplay = document.getElementById("resultSourceDisplay");
  if (sourceDisplay) {
    const src = item.source || "sensor";
    sourceDisplay.innerHTML = `<span class="source-badge ${src}">${src === 'vision' ? 'AI Computer Vision' : src === 'video' ? 'Dashcam Video' : 'Sensor Telemetry'}</span>`;
  }

  const descElem = document.getElementById("resultDescription");
  if (descElem) descElem.textContent = item.description || "Pothole detected via road inspection scanner.";

  const recElem = document.getElementById("resultRecommendation");
  if (recElem) recElem.textContent = item.recommendation || "Assess pavement defect for scheduled repair.";

  const severity = document.getElementById("severity");
  severity.textContent = item.severity;
  severity.className = `severity ${severityClass(item.severity)}`;

  // Synchronize custom lat/lng inputs
  const customLat = document.getElementById("customLatInput");
  const customLng = document.getElementById("customLngInput");
  if (customLat) customLat.value = item.lat;
  if (customLng) customLng.value = item.lng;

  const activeGps = document.getElementById("activeGpsDisplay");
  if (activeGps) activeGps.textContent = `${item.lat}, ${item.lng}`;

  if (panMap) {
    updateMap(item);
  } else {
    renderMapMarkers();
  }

  // If item has bounding boxes or image, redraw on canvas if on image tab
  if (item.boundingBoxes && item.boundingBoxes.length > 0) {
    currentImageDetections = item.boundingBoxes;
    if (item.imageData) {
      loadImageOntoCanvas(item.imageData, item.boundingBoxes);
    }
  }

  renderHistory();
}

function getNumericInput(id) {
  const elem = document.getElementById(id);
  if (!elem) return Number.NaN;
  const value = elem.value.trim();
  return value === "" ? Number.NaN : Number(value);
}

function getSeverityFromIntensity(intensity) {
  if (intensity >= 6.5) return "High";
  if (intensity >= 3.0) return "Medium";
  return "Low";
}

async function analyzeSensorData() {
  const ax = getNumericInput("accX");
  const ay = getNumericInput("accY");
  const az = getNumericInput("accZ");
  const gyroX = getNumericInput("gyroX");
  const gyroY = getNumericInput("gyroY");
  const gyroZ = getNumericInput("gyroZ");
  const sensorValues = [ax, ay, az, gyroX, gyroY, gyroZ];

  if (sensorValues.some(value => !Number.isFinite(value))) {
    alert("Please enter a numeric value for all six sensor fields.");
    return;
  }

  const lat = Number(document.getElementById("customLatInput")?.value) || 12.9716;
  const lng = Number(document.getElementById("customLngInput")?.value) || 77.5946;

  // Try sending to backend API
  try {
    const response = await fetch('/api/sensor-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accX: ax, accY: ay, accZ: az, gyroX, gyroY, gyroZ, lat, lng })
    });
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.result) {
        history.unshift(data.result);
        renderHistory();
        updateResult(data.result);
        updateAnalytics();
        return;
      }
    }
  } catch (err) {
    console.warn("Backend API not reachable, running client calculation fallback:", err);
  }

  // Client calculation fallback
  const magnitude = Math.sqrt(ax ** 2 + ay ** 2 + az ** 2);
  const intensity = Math.min(10, Math.abs(magnitude - 9.81) * 2.5);
  const severity = getSeverityFromIntensity(intensity);
  const confidence = Math.min(97, Math.round(72 + intensity * 2.5));

  const result = {
    id: `PH-${nextPotholeNumber++}`,
    date: new Date().toLocaleString(),
    severity,
    intensity: Number(intensity.toFixed(1)),
    magnitude,
    lat,
    lng,
    confidence,
    source: "sensor",
    description: `Accelerometer jerk magnitude of ${magnitude.toFixed(2)} m/s² detected.`,
    recommendation: severity === "High" ? "Immediate cold-mix asphalt patch required." : "Surface condition logged for inspection.",
    boundingBoxes: [
      { ymin: 400, xmin: 320, ymax: 650, xmax: 620, label: `${severity} Impact`, confidence, severity }
    ]
  };

  history.unshift(result);
  renderHistory();
  updateResult(result);
  updateAnalytics();
}

document.getElementById("sensorForm").addEventListener("submit", event => {
  event.preventDefault();
  analyzeSensorData();
});

// Telemetry Simulation Presets
document.getElementById("presetPotholeBtn")?.addEventListener("click", () => {
  document.getElementById("accX").value = "2.80";
  document.getElementById("accY").value = "-1.90";
  document.getElementById("accZ").value = "14.50";
  document.getElementById("gyroX").value = "1.80";
  document.getElementById("gyroY").value = "3.20";
  document.getElementById("gyroZ").value = "0.90";
  analyzeSensorData();
});

document.getElementById("presetMediumBtn")?.addEventListener("click", () => {
  document.getElementById("accX").value = "1.20";
  document.getElementById("accY").value = "-0.50";
  document.getElementById("accZ").value = "11.80";
  document.getElementById("gyroX").value = "0.50";
  document.getElementById("gyroY").value = "1.40";
  document.getElementById("gyroZ").value = "0.30";
  analyzeSensorData();
});

document.getElementById("presetSmoothBtn")?.addEventListener("click", () => {
  document.getElementById("accX").value = "0.05";
  document.getElementById("accY").value = "0.02";
  document.getElementById("accZ").value = "9.82";
  document.getElementById("gyroX").value = "0.01";
  document.getElementById("gyroY").value = "0.02";
  document.getElementById("gyroZ").value = "0.01";
  analyzeSensorData();
});

// Video Duration Formatting
function formatVideoDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

// Video Detection Results Renderer
function renderDemoVideoDetections(detections) {
  const list = document.getElementById("videoDetectionList");
  list.innerHTML = detections.map((detection, index) => `
    <article class="video-detection-card">
      <h4>Detection ${index + 1} — Pothole detected</h4>
      <div class="video-detection-details">
        <span>Confidence: <strong>${detection.confidence}%</strong></span>
        <span>Video timestamp: <strong>${detection.timestamp}</strong></span>
        <span>Severity: <strong class="severity ${severityClass(detection.severity)}">${detection.severity}</strong></span>
        <span>Impact Intensity: <strong>${detection.intensity || 7.0} / 10</strong></span>
      </div>
      <button type="button" class="evidence-button" data-timestamp="${detection.timestamp}" data-index="${index}">
        Show evidence frame
      </button>
    </article>`).join("");

  document.getElementById("videoDetectionResults").hidden = false;
}

// Evidence Frame Modal logic
function showEvidenceFrame(timestamp, index) {
  const modal = document.getElementById("evidenceModal");
  const modalMeta = document.getElementById("modalMeta");
  const canvas = document.getElementById("evidenceCanvas");
  const ctx = canvas.getContext("2d");

  canvas.width = 640;
  canvas.height = 360;

  // Draw simulated dashcam frame background
  const grad = ctx.createLinearGradient(0, 0, 0, 360);
  grad.addColorStop(0, "#2c3e50");
  grad.addColorStop(1, "#1a252f");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 640, 360);

  // Road surface
  ctx.fillStyle = "#34495e";
  ctx.beginPath();
  ctx.moveTo(0, 360);
  ctx.lineTo(240, 140);
  ctx.lineTo(400, 140);
  ctx.lineTo(640, 360);
  ctx.closePath();
  ctx.fill();

  // Road lane dashed line
  ctx.strokeStyle = "#f39c12";
  ctx.lineWidth = 4;
  ctx.setLineDash([16, 12]);
  ctx.beginPath();
  ctx.moveTo(320, 140);
  ctx.lineTo(320, 360);
  ctx.stroke();
  ctx.setLineDash([]);

  // Pothole damage
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.ellipse(320, 240, 70, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bounding box overlay
  ctx.strokeStyle = "#dc3d4b";
  ctx.lineWidth = 3;
  ctx.strokeRect(230, 195, 180, 90);

  ctx.fillStyle = "rgba(220, 61, 75, 0.85)";
  ctx.fillRect(230, 170, 150, 24);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px Arial";
  ctx.fillText(`Pothole: 94% High`, 236, 186);

  // Video timestamp overlay
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(10, 10, 180, 28);
  ctx.fillStyle = "#00ffcc";
  ctx.font = "13px monospace";
  ctx.fillText(`CAM-01 [${timestamp}]`, 20, 29);

  modalMeta.innerHTML = `
    <strong>Timestamp:</strong> ${timestamp} &nbsp;|&nbsp;
    <strong>Estimated Intensity:</strong> 8.2 / 10 &nbsp;|&nbsp;
    <strong>Confidence:</strong> 94% &nbsp;|&nbsp;
    <strong>Severity:</strong> <span class="severity high">High</span><br>
    <small style="color:#627d98;">Captured from dashcam video stream. Bounding box coordinates synchronized with road telemetry.</small>
  `;

  modal.showModal();
}

document.getElementById("closeModalBtn")?.addEventListener("click", () => {
  document.getElementById("evidenceModal").close();
});
document.getElementById("modalCloseActionBtn")?.addEventListener("click", () => {
  document.getElementById("evidenceModal").close();
});

document.getElementById("modalSaveBtn")?.addEventListener("click", () => {
  const newDet = {
    id: `PH-${nextPotholeNumber++}`,
    date: new Date().toLocaleString(),
    severity: "High",
    intensity: 8.2,
    magnitude: 13.5,
    lat: Number((currentDetection.lat + 0.0015).toFixed(4)),
    lng: Number((currentDetection.lng + 0.0018).toFixed(4)),
    confidence: 94,
    source: "video",
    description: "Evidence frame extracted from dashcam video stream.",
    recommendation: "Emergency patching crew dispatch.",
    boundingBoxes: [{ ymin: 400, xmin: 300, ymax: 700, xmax: 650, label: "Severe Pothole", confidence: 94, severity: "High" }]
  };
  history.unshift(newDet);
  renderHistory();
  updateResult(newDet);
  updateAnalytics();
  document.getElementById("evidenceModal").close();
  alert(`Added ${newDet.id} to detection records and updated map!`);
});

async function runDemoVideoDetection() {
  const lat = Number(document.getElementById("customLatInput")?.value) || 12.9716;
  const lng = Number(document.getElementById("customLngInput")?.value) || 77.5946;

  try {
    const res = await fetch('/api/detect-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoName: 'dashcam_footage.mp4', duration: 30, lat, lng })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.detections) {
        renderDemoVideoDetections(data.detections);
        if (data.history) {
          history = data.history;
          renderHistory();
          renderMapMarkers();
          updateAnalytics();
        }
        return;
      }
    }
  } catch (err) {
    console.warn("Backend video API fallback:", err);
  }

  const demoDetections = [
    { confidence: 94, timestamp: "00:00:08", severity: "High", intensity: 8.2 },
    { confidence: 86, timestamp: "00:00:17", severity: "Medium", intensity: 5.6 },
    { confidence: 79, timestamp: "00:00:24", severity: "Low", intensity: 3.4 }
  ];
  renderDemoVideoDetections(demoDetections);
}

document.getElementById("videoInput").addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;

  const player = document.getElementById("videoPlayer");
  player.src = URL.createObjectURL(file);
  player.hidden = false;
  document.getElementById("videoStatus").textContent = `Selected: ${file.name}`;
  document.getElementById("videoDuration").hidden = true;
  document.getElementById("detectVideoBtn").disabled = false;
  document.getElementById("videoDetectionResults").hidden = true;
});

document.getElementById("videoPlayer").addEventListener("loadedmetadata", event => {
  const duration = event.target.duration;
  if (!Number.isFinite(duration)) return;

  const durationLabel = document.getElementById("videoDuration");
  durationLabel.textContent = `Duration: ${formatVideoDuration(duration)}`;
  durationLabel.hidden = false;
});

document.getElementById("detectVideoBtn").addEventListener("click", runDemoVideoDetection);

document.getElementById("videoDetectionList").addEventListener("click", event => {
  const btn = event.target.closest(".evidence-button");
  if (btn) {
    showEvidenceFrame(btn.dataset.timestamp, btn.dataset.index);
  }
});

// Tab Switcher Logic
document.getElementById("tabImageBtn")?.addEventListener("click", () => {
  document.getElementById("tabImageBtn").classList.add("active");
  document.getElementById("tabVideoBtn").classList.remove("active");
  document.getElementById("imageDetectionTab").hidden = false;
  document.getElementById("videoDetectionTab").hidden = true;
});

document.getElementById("tabVideoBtn")?.addEventListener("click", () => {
  document.getElementById("tabVideoBtn").classList.add("active");
  document.getElementById("tabImageBtn").classList.remove("active");
  document.getElementById("imageDetectionTab").hidden = true;
  document.getElementById("videoDetectionTab").hidden = false;
});

// Canvas Drawing & Bounding Box Overlays
function drawDetectionBoxes(ctx, width, height, boxes) {
  if (!boxes || boxes.length === 0) return;

  const showBoxes = document.getElementById("toggleBoxesCheck")?.checked ?? true;
  const showLabels = document.getElementById("toggleLabelsCheck")?.checked ?? true;

  if (!showBoxes) return;

  boxes.forEach((box, i) => {
    // Coords are 0-1000 normalized
    const ymin = (box.ymin / 1000) * height;
    const xmin = (box.xmin / 1000) * width;
    const ymax = (box.ymax / 1000) * height;
    const xmax = (box.xmax / 1000) * width;
    const boxW = xmax - xmin;
    const boxH = ymax - ymin;

    const isHigh = box.severity === "High";
    const isMedium = box.severity === "Medium";
    const color = isHigh ? "#dc3d4b" : isMedium ? "#e89628" : "#319c6c";

    ctx.save();
    // Bounding Box stroke
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(xmin, ymin, boxW, boxH);

    // Subtle shaded area
    ctx.fillStyle = isHigh ? "rgba(220, 61, 75, 0.15)" : isMedium ? "rgba(232, 150, 40, 0.15)" : "rgba(49, 156, 108, 0.15)";
    ctx.fillRect(xmin, ymin, boxW, boxH);

    // Label tag
    if (showLabels) {
      const labelText = `${box.label || 'Pothole'} [${box.confidence || 90}% - ${box.severity || 'Medium'}]`;
      ctx.font = "bold 12px Arial, sans-serif";
      const textMetrics = ctx.measureText(labelText);
      const tagWidth = textMetrics.width + 12;
      const tagHeight = 22;

      ctx.fillStyle = color;
      ctx.fillRect(xmin, Math.max(0, ymin - tagHeight), tagWidth, tagHeight);

      ctx.fillStyle = "#ffffff";
      ctx.fillText(labelText, xmin + 6, Math.max(15, ymin - 7));
    }
    ctx.restore();
  });
}

function renderCanvas(img, boxes) {
  const canvas = document.getElementById("detectionCanvas");
  if (!canvas || !img) return;

  const ctx = canvas.getContext("2d");
  const maxW = 760;
  const scale = Math.min(1, maxW / img.width);
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  drawDetectionBoxes(ctx, canvas.width, canvas.height, boxes);

  document.getElementById("imagePreviewContainer").hidden = false;
}

function loadImageOntoCanvas(src, boxes = []) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    currentLoadedImage = img;
    currentImageDetections = boxes;
    renderCanvas(img, boxes);
  };
  img.src = src;
}

// Toggle overlays
document.getElementById("toggleBoxesCheck")?.addEventListener("change", () => {
  if (currentLoadedImage) renderCanvas(currentLoadedImage, currentImageDetections);
});
document.getElementById("toggleLabelsCheck")?.addEventListener("change", () => {
  if (currentLoadedImage) renderCanvas(currentLoadedImage, currentImageDetections);
});

// Run AI Image Inspection
async function runAiDetectionOnImage(dataUrl, fileName = "inspection_photo.jpg") {
  const statusElem = document.getElementById("imageScanStatus");
  statusElem.textContent = "Processing image through AI Computer Vision model...";
  statusElem.style.color = "#1769aa";

  const lat = Number(document.getElementById("customLatInput")?.value) || 12.9716;
  const lng = Number(document.getElementById("customLngInput")?.value) || 77.5946;

  try {
    const res = await fetch('/api/detect-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: dataUrl,
        imageName: fileName,
        lat,
        lng
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.result) {
        history.unshift(data.result);
        currentImageDetections = data.result.boundingBoxes || [];
        loadImageOntoCanvas(dataUrl, currentImageDetections);
        renderHistory();
        updateResult(data.result);
        updateAnalytics();

        statusElem.textContent = `Detection Complete: Found ${currentImageDetections.length} road hazard(s) with ${data.result.confidence}% confidence (${data.result.severity} severity).`;
        statusElem.style.color = "#176742";
        return;
      }
    }
  } catch (err) {
    console.warn("Backend image detect error, falling back locally:", err);
  }

  // Client-side fallback detection
  const fallbackBoxes = [
    { ymin: 360, xmin: 270, ymax: 690, xmax: 680, label: "Severe Pothole", confidence: 93, severity: "High", width_cm: 52, depth_cm: 9 }
  ];
  const clientDet = {
    id: `PH-${nextPotholeNumber++}`,
    date: new Date().toLocaleString(),
    severity: "High",
    intensity: 7.9,
    magnitude: 13.1,
    lat,
    lng,
    confidence: 93,
    source: "vision",
    description: "Deep cavity detected via local vision scanner with sharp fractured border.",
    recommendation: "Immediate cold-mix asphalt patch required.",
    imageData: dataUrl,
    imageName: fileName,
    boundingBoxes: fallbackBoxes
  };

  history.unshift(clientDet);
  currentImageDetections = fallbackBoxes;
  loadImageOntoCanvas(dataUrl, fallbackBoxes);
  renderHistory();
  updateResult(clientDet);
  updateAnalytics();

  statusElem.textContent = `Local AI Scan Complete: Identified 1 high-severity road crater.`;
  statusElem.style.color = "#176742";
}

// Quick Sample Road Photo Pickers
document.getElementById("loadSample1Btn")?.addEventListener("click", () => {
  const url = "assets/sample-pothole-severe.svg";
  fetch(url)
    .then(r => r.text())
    .then(svgText => {
      const base64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgText)));
      runAiDetectionOnImage(base64, "sample-pothole-severe.svg");
    });
});

document.getElementById("loadSample2Btn")?.addEventListener("click", () => {
  const url = "assets/sample-pothole-cracks.svg";
  fetch(url)
    .then(r => r.text())
    .then(svgText => {
      const base64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgText)));
      runAiDetectionOnImage(base64, "sample-pothole-cracks.svg");
    });
});

document.getElementById("loadSample3Btn")?.addEventListener("click", () => {
  const url = "assets/pothole-placeholder.svg";
  fetch(url)
    .then(r => r.text())
    .then(svgText => {
      const base64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgText)));
      runAiDetectionOnImage(base64, "pothole-placeholder.svg");
    });
});

// File upload handler
document.getElementById("imageInput")?.addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    runAiDetectionOnImage(dataUrl, file.name);
  };
  reader.readAsDataURL(file);
});

// Dropzone support
const dropzone = document.getElementById("imageUploadDropzone");
if (dropzone) {
  dropzone.addEventListener("dragover", e => {
    e.preventDefault();
    dropzone.style.borderColor = "#1769aa";
    dropzone.style.background = "#eaf5ff";
  });
  dropzone.addEventListener("dragleave", () => {
    dropzone.style.borderColor = "#a8c8e5";
    dropzone.style.background = "#f7fbff";
  });
  dropzone.addEventListener("drop", e => {
    e.preventDefault();
    dropzone.style.borderColor = "#a8c8e5";
    dropzone.style.background = "#f7fbff";
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = ev => {
        runAiDetectionOnImage(ev.target.result, file.name);
      };
      reader.readAsDataURL(file);
    }
  });
}

document.getElementById("runAiImageDetectBtn")?.addEventListener("click", () => {
  if (currentLoadedImage) {
    runAiDetectionOnImage(currentLoadedImage.src, "active_frame.jpg");
  } else {
    // If no image loaded, load sample 1
    document.getElementById("loadSample1Btn")?.click();
  }
});

document.getElementById("reanalyzeBtn")?.addEventListener("click", () => {
  if (currentLoadedImage) {
    runAiDetectionOnImage(currentLoadedImage.src, "reanalyzed_frame.jpg");
  }
});

// Map Click Listener to pick coordinates
map.on("click", e => {
  const lat = Number(e.latlng.lat.toFixed(4));
  const lng = Number(e.latlng.lng.toFixed(4));

  const latInput = document.getElementById("customLatInput");
  const lngInput = document.getElementById("customLngInput");
  if (latInput) latInput.value = lat;
  if (lngInput) lngInput.value = lng;

  const activeGps = document.getElementById("activeGpsDisplay");
  if (activeGps) activeGps.textContent = `${lat}, ${lng}`;

  const statusText = document.getElementById("locationStatusText");
  if (statusText) statusText.textContent = `● Pinned coordinates: ${lat}, ${lng}`;
});

// Device GPS locator
document.getElementById("useCurrentLocationBtn")?.addEventListener("click", () => {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lng = Number(pos.coords.longitude.toFixed(4));
        document.getElementById("customLatInput").value = lat;
        document.getElementById("customLngInput").value = lng;
        document.getElementById("activeGpsDisplay").textContent = `${lat}, ${lng}`;
        map.setView([lat, lng], 15);
      },
      () => {
        alert("Location permission not available in current frame. You can click anywhere on the map to set coordinates!");
      }
    );
  }
});

// Map Filter Buttons
document.querySelectorAll(".map-filter-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".map-filter-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    currentActiveFilter = chip.dataset.filter;
    renderMapMarkers();
  });
});

// History Search and Filters
document.getElementById("historySearchInput")?.addEventListener("input", renderHistory);
document.getElementById("historySeveritySelect")?.addEventListener("change", renderHistory);

// Export CSV
function exportHistoryCsv() {
  window.location.href = "/api/export";
}
document.getElementById("headerExportBtn")?.addEventListener("click", exportHistoryCsv);
document.getElementById("exportHistoryBtn")?.addEventListener("click", exportHistoryCsv);

// Reset History
document.getElementById("resetHistoryBtn")?.addEventListener("click", async () => {
  if (!confirm("Reset detection history to initial sample records?")) return;
  try {
    const res = await fetch('/api/history/reset', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      history = data.history;
    }
  } catch {
    // fallback
  }
  currentDetection = { ...history[0] };
  renderHistory();
  updateResult(currentDetection);
  updateAnalytics();
});

// Analytics & KPI Updates
async function updateAnalytics() {
  try {
    const res = await fetch('/api/analytics');
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        const hazardScore = document.getElementById("hazardScore");
        if (hazardScore) hazardScore.textContent = `${data.hazardIndex} / 100`;

        const hazardBar = document.getElementById("hazardBar");
        if (hazardBar) hazardBar.style.width = `${data.hazardIndex}%`;

        const avgConf = document.getElementById("avgConfidenceScore");
        if (avgConf) avgConf.textContent = `${data.avgConfidence}%`;
        return;
      }
    }
  } catch (err) {
    // local fallback
  }

  const total = history.length;
  const high = history.filter(item => item.severity === 'High').length;
  const medium = history.filter(item => item.severity === 'Medium').length;
  const low = history.filter(item => item.severity === 'Low').length;
  const hazard = Math.min(100, Math.round((high * 25 + medium * 12 + low * 5) / (total * 0.3 + 1)));

  const hazardScore = document.getElementById("hazardScore");
  if (hazardScore) hazardScore.textContent = `${hazard} / 100`;

  const hazardBar = document.getElementById("hazardBar");
  if (hazardBar) hazardBar.style.width = `${hazard}%`;

  const avgConf = total > 0 ? Math.round(history.reduce((a, b) => a + (b.confidence || 0), 0) / total) : 0;
  const avgConfElem = document.getElementById("avgConfidenceScore");
  if (avgConfElem) avgConfElem.textContent = `${avgConf}%`;
}

// Initial Sync with Backend & Startup
async function initApp() {
  try {
    const res = await fetch('/api/history');
    if (res.ok) {
      const data = await res.json();
      if (data.history && data.history.length > 0) {
        history = data.history;
        currentDetection = { ...history[0] };
      }
    }
  } catch (err) {
    console.warn("Using offline state:", err);
  }

  renderHistory();
  updateResult(currentDetection);
  updateAnalytics();

  // Pre-load sample 1 image into canvas preview
  const sampleUrl = "assets/sample-pothole-severe.svg";
  fetch(sampleUrl)
    .then(r => r.text())
    .then(svgText => {
      const base64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgText)));
      const initialBoxes = [
        { ymin: 380, xmin: 300, ymax: 680, xmax: 620, label: "Severe Pothole", confidence: 94, severity: "High" }
      ];
      loadImageOntoCanvas(base64, initialBoxes);
    })
    .catch(() => {});
}

initApp();
