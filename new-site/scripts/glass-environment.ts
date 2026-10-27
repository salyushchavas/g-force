// Build-time only. The browser never compiles an HDR environment during a page visit.
import { Color, DataUtils, EquirectangularReflectionMapping, Mesh, MeshBasicMaterial, PlaneGeometry, PMREMGenerator, Scene, WebGLRenderer } from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

export async function bakeGlassEnvironment() {
  const renderer = new WebGLRenderer({ antialias: false });
  const hdr = await new HDRLoader().loadAsync('/3d/sky-1k.hdr');
  hdr.mapping = EquirectangularReflectionMapping;
  const environment = new Scene();
  environment.background = hdr;
  for (const card of [
    { size: [5, 7], position: [-4, 3, 5], strength: 5, color: 0xffffff },
    { size: [1.5, 8], position: [3, 1, 4], strength: 6, color: 0xe3f6ff },
    { size: [5, 3], position: [0, 5, -3], strength: 4, color: 0xffffff },
    { size: [4, 2], position: [-3, -3, 3], strength: 2, color: 0xffddb2 },
    { size: [3, 5], position: [0, -1, 6], strength: 0.03, color: 0x21303d },
  ]) {
    const mesh = new Mesh(new PlaneGeometry(card.size[0], card.size[1]), new MeshBasicMaterial({ color: new Color(card.color).multiplyScalar(card.strength), toneMapped: false }));
    mesh.position.set(card.position[0], card.position[1], card.position[2]);
    mesh.lookAt(0, 0, 0);
    environment.add(mesh);
  }
  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(environment, 0.015, 0.1, 100, { size: 128 });
  const pixels = new Uint16Array(target.width * target.height * 4);
  renderer.readRenderTargetPixels(target, 0, 0, target.width, target.height, pixels);
  const range = 8;
  const image = new ImageData(target.width, target.height);
  for (let i = 0; i < pixels.length; i += 4) {
    for (let channel = 0; channel < 3; channel++) image.data[i + channel] = Math.min(255, Math.round(DataUtils.fromHalfFloat(pixels[i + channel]) / range * 255));
    image.data[i + 3] = 255;
  }
  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;
  canvas.getContext('2d')!.putImageData(image, 0, 0);
  return { png: canvas.toDataURL('image/png').split(',')[1], width: target.width, height: target.height, range };
}
