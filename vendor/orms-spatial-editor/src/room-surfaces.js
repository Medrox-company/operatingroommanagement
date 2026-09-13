/**
 * Subtle satin finish and room-local bounce shading. The GLB has no surface
 * UVs; metre coordinates keep the finish attached during rotation/resizing,
 * without extra texture downloads.
 */
export function configureRoomSurface(material) {
  const floor = material.name === 'floor';
  const wall = material.name === 'wall' || material.name === 'wall_lower';
  const bakedAO = Boolean(material.aoMap);
  if (!floor && !wall) return;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRoomSurfacePosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoomSurfacePosition = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vRoomSurfacePosition;
        float roomFinishNoise(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 roomP = vRoomSurfacePosition;
        float roomGrain = roomFinishNoise(floor(roomP * 280.0));
        diffuseColor.rgb *= 0.992 + roomGrain * 0.016;
        ${bakedAO ? '' : floor ? `
          // Indirect floor/wall contact supplements GTAO at screen edges.
          float roomEdge = min(3.34 - abs(roomP.x), 3.24 - abs(roomP.z));
          diffuseColor.rgb *= mix(0.77, 1.0, smoothstep(0.02, 0.65, roomEdge));
        ` : `
          // Soft cool base shadow; preserves the live status colour/opacity.
          diffuseColor.rgb *= mix(vec3(0.73, 0.76, 0.84), vec3(1.0), smoothstep(0.05, 2.8, roomP.y));
        `}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + (roomGrain - 0.5) * 0.045, 0.1, 1.0);`);
  };
  material.customProgramCacheKey = () => `room-satin-v1-${floor ? 'floor' : 'wall'}${bakedAO ? '-baked' : ''}`;
  material.needsUpdate = true;
}
