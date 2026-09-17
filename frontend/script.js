// Sample frontend data. Replace these values with API responses when a backend is available.
const history = [
  { id: "PH-104", date: "27 Aug 2026, 10:42", severity: "High", intensity: 7.6, lat: 12.9716, lng: 77.5946, confidence: 92, magnitude: 12.85 },
  { id: "PH-103", date: "27 Aug 2026, 09:15", severity: "Medium", intensity: 5.4, lat: 12.9752, lng: 77.5991, confidence: 84, magnitude: 11.97 },
  { id: "PH-102", date: "26 Aug 2026, 16:30", severity: "Low", intensity: 2.8, lat: 12.9681, lng: 77.5872, confidence: 76, magnitude: 10.93 },
  { id: "PH-101", date: "26 Aug 2026, 13:05", severity: "Medium", intensity: 4.9, lat: 12.9788, lng: 77.6035, confidence: 81, magnitude: 11.62 }
];

let currentDetection = { ...history[0] };
let nextPotholeNumber = 105;

const map = L.map("map").setView([currentDetection.lat, currentDetection.lng], 14);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

let potholeMarker;

function severityClass(severity) {
  return severity.toLowerCase();
}

function popupContent(item) {
  return `<strong>${item.id}</strong><br>
    Severity: ${item.severity}<br>
    Intensity: ${item.intensity} / 10<br>
    Latitude: ${item.lat}<br>
    Longitude: ${item.lng}<br>
    Confidence: ${item.confidence}%`;
}

// Move the single existing marker whenever a new result is calculated.
function updateMap(item) {
  if (potholeMarker) map.removeLayer(potholeMarker);

  potholeMarker = L.marker([item.lat, item.lng])
    .addTo(map)
    .bindPopup(popupContent(item));

  map.setView([item.lat, item.lng], 14);
}

function renderHistory() {
  const historyBody = document.getElementById("historyBody");
  historyBody.innerHTML = history.map(item => `
    <tr>
      <td>${item.id}</td><td>${item.date}</td>
      <td><span class="severity ${severityClass(item.severity)}">${item.severity}</span></td>
      <td>${item.intensity} / 10</td><td>${item.lat}</td><td>${item.lng}</td><td>${item.confidence}%</td>
    </tr>`).join("");

  document.getElementById("totalPotholes").textContent = history.length;
  ["High", "Medium", "Low"].forEach(level => {
    const total = history.filter(item => item.severity === level).length;
    document.getElementById(`${level.toLowerCase()}Potholes`).textContent = total;
  });
}

function updateResult(item) {
  currentDetection = item;
  document.getElementById("detectionStatus").textContent = "Pothole detected";
  document.getElementById("accelerationMagnitude").textContent = `${item.magnitude.toFixed(2)} m/s²`;
  document.getElementById("confidence").textContent = `${item.confidence}%`;
  document.getElementById("impactResult").textContent = `${item.intensity} / 10`;
  document.getElementById("latitude").textContent = item.lat;
  document.getElementById("longitude").textContent = item.lng;
  document.getElementById("resultLatitude").textContent = item.lat;
  document.getElementById("resultLongitude").textContent = item.lng;

  const severity = document.getElementById("severity");
  severity.textContent = item.severity;
  severity.className = `severity ${severityClass(item.severity)}`;

  updateMap(item);
}

function getNumericInput(id) {
  const value = document.getElementById(id).value.trim();
  return value === "" ? Number.NaN : Number(value);
}

function getSeverityFromIntensity(intensity) {
  // Demo thresholds only. They will be replaced by a trained ML model later.
  if (intensity >= 6.5) return "High";
  if (intensity >= 3) return "Medium";
  return "Low";
}

function analyzeSensorData() {
  // Read and validate all six values, ready to send to an API in a later step.
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

  // Required prototype formula: sqrt(ax² + ay² + az²).
  const magnitude = Math.sqrt(ax ** 2 + ay ** 2 + az ** 2);

  // 9.81 m/s² is normal gravity. The distance from it becomes a 0–10 demo impact score.
  const intensity = Math.min(10, Math.abs(magnitude - 9.81) * 2.5);
  const severity = getSeverityFromIntensity(intensity);
  const confidence = Math.min(97, Math.round(72 + intensity * 2.5));

  const result = {
    id: `PH-${nextPotholeNumber++}`,
    date: new Date().toLocaleString(),
    severity,
    intensity: Number(intensity.toFixed(1)),
    magnitude,
    lat: 12.9716,
    lng: 77.5946,
    confidence
  };

  // A detected demo result is added to the table, which refreshes the summary cards.
  history.unshift(result);
  renderHistory();
  updateResult(result);
}

document.getElementById("sensorForm").addEventListener("submit", event => {
  event.preventDefault();
  analyzeSensorData();
});

function formatVideoDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function renderDemoVideoDetections(detections) {
  const list = document.getElementById("videoDetectionList");
  list.innerHTML = detections.map((detection, index) => `
    <article class="video-detection-card">
      <h4>Detection ${index + 1} — Pothole detected</h4>
      <div class="video-detection-details">
        <span>Confidence: <strong>${detection.confidence}%</strong></span>
        <span>Video timestamp: <strong>${detection.timestamp}</strong></span>
        <span>Severity: <strong class="severity ${severityClass(detection.severity)}">${detection.severity}</strong></span>
      </div>
      <button type="button" class="evidence-button" data-timestamp="${detection.timestamp}">
        Show evidence frame (future feature)
      </button>
    </article>`).join("");

  document.getElementById("videoDetectionResults").hidden = false;
}

function showEvidenceFrameNotice(timestamp) {
  alert(`Frame capture at ${timestamp} is a future feature. A backend video-processing service will extract the evidence frame later.`);
}

function runDemoVideoDetection() {
  // Future API location: replace this sample array with fetch("/api/detect-video", ...).
  // No uploaded video is analysed in this frontend-only prototype.
  const demoDetections = [
    { confidence: 91, timestamp: "00:00:08", severity: "High" },
    { confidence: 84, timestamp: "00:00:17", severity: "Medium" }
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

// Duration is available only after the browser reads the selected video's metadata.
document.getElementById("videoPlayer").addEventListener("loadedmetadata", event => {
  const duration = event.target.duration;
  if (!Number.isFinite(duration)) return;

  const durationLabel = document.getElementById("videoDuration");
  durationLabel.textContent = `Duration: ${formatVideoDuration(duration)}`;
  durationLabel.hidden = false;
});

document.getElementById("detectVideoBtn").addEventListener("click", runDemoVideoDetection);

// One listener handles evidence buttons added after the demo results are rendered.
document.getElementById("videoDetectionList").addEventListener("click", event => {
  if (event.target.matches(".evidence-button")) {
    showEvidenceFrameNotice(event.target.dataset.timestamp);
  }
});

renderHistory();
updateResult(currentDetection);
