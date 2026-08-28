window.HSAIMapLayout = Object.freeze({
  designSize: { width: 1920, height: 1080 },
  bounds: { left: 5, right: 95, top: 23, bottom: 94 },
  playerSafetyBox: { top: 23, bottom: 94, left: 5, right: 95 },
  plazaSpawn: { x: 15.5, y: 42, direction: 'front' },
  rooms: {
    filter: {
      asset: { left: 10.8, top: 50.5, width: 25 },
      spawn: { x: 40, y: 84, direction: 'left' },
      door: { x: 34.5, y: 84 },
      collision: { left: 10.5, right: 35, top: 54, bottom: 81.5 },
    },
    sift: {
      asset: { left: 30.5, top: 9, width: 23.85 },
      spawn: { x: 56.5, y: 39, direction: 'left' },
      door: { x: 50, y: 39 },
      collision: { left: 31.5, right: 53.7, top: 11.5, bottom: 34.5 },
    },
    collab: {
      asset: { left: 63.5, top: 55.5, width: 24.2 },
      spawn: { x: 59.5, y: 87, direction: 'right' },
      door: { x: 66.5, y: 87 },
      collision: { left: 64.5, right: 89, top: 58, bottom: 85 },
    },
    companion: {
      asset: { left: 67.7, top: 15.2, width: 28.1 },
      spawn: { x: 63, y: 41.5, direction: 'right' },
      door: { x: 69, y: 41.5 },
      collision: { left: 67.5, right: 95, top: 18, bottom: 39.5 },
    },
  },
});
