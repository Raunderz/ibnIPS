import { CanvasEngine } from './canvasEngine.js';
import { DbLoader } from './dbLoader.js';
import { UiController } from './uiController.js';
import { Exporter } from './exporter.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvasEl = document.getElementById('mesh-canvas');
  const containerEl = document.getElementById('canvas-container');

  const canvasEngine = new CanvasEngine(canvasEl, containerEl);
  const dbLoader = new DbLoader();
  const exporter = new Exporter();
  const uiController = new UiController(canvasEngine, dbLoader, exporter);

  uiController.showEmptyState(true);

  window.addEventListener('mousemove', (e) => {
    window.lastMouseX = e.clientX;
    window.lastMouseY = e.clientY;
  });

  console.log('Map Maker application initialized successfully');
});
