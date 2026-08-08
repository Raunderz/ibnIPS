import { CanvasEngine } from './canvasEngine.js';
import { DbLoader } from './dbLoader.js';
import { UiController } from './uiController.js';
import { Exporter } from './exporter.js';

document.addEventListener('DOMContentLoaded', async () => {
  const canvasEl = document.getElementById('mesh-canvas');
  const containerEl = document.getElementById('canvas-container');

  const canvasEngine = new CanvasEngine(canvasEl, containerEl);
  const dbLoader = new DbLoader();
  const exporter = new Exporter();
  const uiController = new UiController(canvasEngine, dbLoader, exporter);

  // Default initial sample nodes for demo if DB not loaded yet
  const sampleNodes = [
    { id: 'node_101', name: 'Main Entrance', floor: 1, x: 200, y: 300, type: 'corridor' },
    { id: 'node_102', name: 'Reception Desk', floor: 1, x: 400, y: 300, type: 'room' },
    { id: 'node_103', name: 'Elevator Lobby', floor: 1, x: 600, y: 300, type: 'stair' }
  ];

  const sampleEdges = [
    { from: 'node_101', to: 'node_102', steps: 8, direction: 'E' },
    { from: 'node_102', to: 'node_103', steps: 10, direction: 'E' }
  ];

  canvasEngine.setNodesAndEdges(sampleNodes, sampleEdges);
  uiController.updateStats();
  uiController.renderFloorTabs();

  // Global mouse tracking for edge rubberband drawing
  window.addEventListener('mousemove', (e) => {
    window.lastMouseX = e.clientX;
    window.lastMouseY = e.clientY;
  });

  console.log('Map Maker application initialized successfully');
});
