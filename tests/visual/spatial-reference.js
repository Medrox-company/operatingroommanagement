import { DashboardViewer } from '../../vendor/orms-spatial-editor/src/dashboard-viewer.js';
import { createReferenceProject } from './spatial-reference-project.js';

const project = createReferenceProject();
const operatingRooms = project.rooms.filter((room) => room.type === 'operating');
const controls = document.querySelector('#controls');
const roomSelect = document.querySelector('#room');
const statusSelect = document.querySelector('#room-status');
const activeCheckbox = document.querySelector('#active');
const statusOutput = document.querySelector('#status');
const labels = document.querySelector('#labels');
const statusColors = { ready: null, procedure: '#5879c9', cleaning: '#8f70bf', unavailable: '#d96871' };
let selectedId = 'or-2';
let roomStates = initialStates();
let topView = false;

function initialStates() {
  return new Map(operatingRooms.map((room) => [room.id, {
    status: room.id === 'or-2' ? 'procedure' : 'ready',
    active: room.id === 'or-2',
  }]));
}

function roomVisuals() {
  return new Map([...roomStates].map(([id, state]) => [id, {
    statusColor: statusColors[state.status], active: state.active,
  }]));
}

function syncControls() {
  const state = roomStates.get(selectedId);
  roomSelect.value = selectedId;
  statusSelect.value = state.status;
  activeCheckbox.checked = state.active;
  for (const label of labels.children) {
    const roomState = roomStates.get(label.dataset.room);
    label.dataset.support = String(!roomState);
    label.dataset.active = String(Boolean(roomState?.active));
  }
}

function selectRoom(id) {
  if (!roomStates.has(id)) return;
  selectedId = id;
  viewer.setSelectedRoom(id);
  syncControls();
}

function setView(top) {
  topView = top;
  viewer.fit(topView);
  document.querySelector('#view-3d').setAttribute('aria-pressed', String(!topView));
  document.querySelector('#view-plan').setAttribute('aria-pressed', String(topView));
  document.documentElement.dataset.view = topView ? 'plan' : '3d';
}

function applyStates() {
  viewer.setRoomVisuals(roomVisuals());
  syncControls();
}

for (const room of operatingRooms) {
  const option = document.createElement('option');
  option.value = room.id;
  option.textContent = room.name;
  roomSelect.append(option);
}

const viewer = new DashboardViewer(document.querySelector('#viewport'), labels, selectRoom);
document.documentElement.dataset.ready = 'loading';
document.documentElement.dataset.view = '3d';

roomSelect.addEventListener('change', () => selectRoom(roomSelect.value));
statusSelect.addEventListener('change', () => {
  roomStates.get(selectedId).status = statusSelect.value;
  applyStates();
});
activeCheckbox.addEventListener('change', () => {
  roomStates.get(selectedId).active = activeCheckbox.checked;
  applyStates();
});
document.querySelector('#view-3d').addEventListener('click', () => setView(false));
document.querySelector('#view-plan').addEventListener('click', () => setView(true));
document.querySelector('#reset').addEventListener('click', () => {
  roomStates = initialStates();
  selectRoom('or-2');
  applyStates();
  setView(false);
});

try {
  await viewer.setProject(project, project.floors[0].id, selectedId, roomVisuals());
  syncControls();
  viewer.fit(false);
  const loadedRooms = operatingRooms.filter((room) => viewer.entities.get(room.id)?.userData.referenceRoomLoaded).length;
  statusOutput.textContent = viewer.software
    ? 'Připraveno · softwarový renderer'
    : `Připraveno · WebGL · ${loadedRooms}/6 detailních modelů`;
  controls.disabled = false;
  document.documentElement.dataset.ready = 'true';
  document.documentElement.dataset.renderer = viewer.software ? 'software' : 'webgl';
  document.documentElement.dataset.loadedRooms = String(loadedRooms);
} catch (error) {
  statusOutput.textContent = `Scénu se nepodařilo načíst: ${error.message}`;
  statusOutput.dataset.error = 'true';
  document.documentElement.dataset.ready = 'error';
  console.error(error);
}

// Useful for manual visual QA; this object exists only on this fixture page.
globalThis.spatialReference = { viewer, project, getStates: () => structuredClone(roomStates) };
if (import.meta.hot) import.meta.hot.dispose(() => viewer.dispose());
