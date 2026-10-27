#!/usr/bin/env node
/**
 * Build the hero's coherent glass sculpture ahead of time.
 *
 * This builder extrudes the traced original company wordmark outlines, and ships indexed, quantized
 * geometry so visitors do not have to parse fonts or construct bevels.
 *
 * Reproduce without changing the app's dependency tree:
 *   npm install --prefix /tmp/gforce-art-build potrace @xmldom/xmldom polygon-clipping
 *   GFORCE_ART_DEPENDENCIES=/tmp/gforce-art-build node scripts/trace-original-brand.mjs
 *   GFORCE_ART_DEPENDENCIES=/tmp/gforce-art-build node scripts/prepare-glass-geometry.mjs
 *
 * The optional module path may also point to an installed package entry point.
 * Binary offsets are bytes, lengths are typed-array element counts. Positions
 * and normals are signed normalized Int16. Multiply the
 * decoded normalized positions by metadata.scale. Each mesh's count is its
 * index count. All offsets are aligned to four bytes.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { Box3, ExtrudeGeometry, Path, Shape, ShapeUtils } from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { mergeVertices, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const assetDirectory = path.resolve(scriptDirectory, '../public/3d');
const assetRequire = createRequire(path.resolve(process.env.GFORCE_ART_DEPENDENCIES ?? '.', 'package.json'));
const { DOMParser: XMLDOMParser } = assetRequire('@xmldom/xmldom');
const clippingModule = process.env.GFORCE_POLYGON_CLIPPING_MODULE;
let polygonClipping;
try {
  const imported = clippingModule ? await import(pathToFileURL(path.resolve(clippingModule)).href) : assetRequire('polygon-clipping');
  polygonClipping = imported.default ?? imported;
} catch (error) {
  throw new Error('Install polygon-clipping, or set GFORCE_POLYGON_CLIPPING_MODULE as documented at the top of this script.', { cause: error });
}

// Geometry follows the supplied original G-FORCE wordmark, including its actual letter shapes.
globalThis.DOMParser = class extends XMLDOMParser {
  parseFromString(...args) { const document = super.parseFromString(...args); document.querySelectorAll = () => []; return document; }
};
async function originalOutlines(name) {
  const svg = await fs.readFile(path.resolve(assetDirectory, `../brand/original-${name}.svg`), 'utf8');
  const paths = new SVGLoader().parse(svg).paths;
  const shapes = paths.flatMap(path => path.toShapes());
  return { generateShapes: (_text, size) => shapes.map(shape => ({ extractPoints: count => {
    const points = shape.extractPoints(count);
    const scale = size / 62;
    const convert = ring => ring.map(point => ({ x: point.x * scale, y: -point.y * scale }));
    return { shape: convert(points.shape), holes: points.holes.map(convert) };
  }})) };
}
const [scriptFont, descriptorFont] = await Promise.all([originalOutlines('name'), originalOutlines('descriptor')]);

// Ramer–Douglas–Peucker on two arcs retains closed contours without using the
// arbitrary font contour start as a degenerate start/end segment.
const distanceToSegmentSquared = (point, a, b) => {
  let x = a[0];
  let y = a[1];
  const dx = b[0] - x;
  const dy = b[1] - y;
  if (dx || dy) {
    const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
    if (t >= 1) { x = b[0]; y = b[1]; }
    else if (t > 0) { x += dx * t; y += dy * t; }
  }
  return (point[0] - x) ** 2 + (point[1] - y) ** 2;
};

function simplifyArc(points, toleranceSquared) {
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    let farthest = -1;
    let distance = toleranceSquared;
    for (let i = start + 1; i < end; i++) {
      const current = distanceToSegmentSquared(points[i], points[start], points[end]);
      if (current > distance) { distance = current; farthest = i; }
    }
    if (farthest !== -1) {
      keep[farthest] = 1;
      stack.push([start, farthest], [farthest, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function simplifyRing(input, tolerance) {
  const points = [];
  for (const point of input) {
    const previous = points.at(-1);
    if (!previous || Math.abs(point[0] - previous[0]) + Math.abs(point[1] - previous[1]) > 1e-10) points.push(point);
  }
  if (points.length > 1 && Math.abs(points[0][0] - points.at(-1)[0]) + Math.abs(points[0][1] - points.at(-1)[1]) < 1e-10) points.pop();
  if (points.length < 4) return [...points, points[0]];
  let split = 1;
  let farthest = 0;
  for (let i = 1; i < points.length; i++) {
    const distance = (points[i][0] - points[0][0]) ** 2 + (points[i][1] - points[0][1]) ** 2;
    if (distance > farthest) { farthest = distance; split = i; }
  }
  const first = simplifyArc(points.slice(0, split + 1), tolerance * tolerance);
  const second = simplifyArc([...points.slice(split), points[0]], tolerance * tolerance);
  const result = [...first.slice(0, -1), ...second];
  return result.length >= 4 ? result : [...points, points[0]];
}

function filledPolygons(font, text, size, tracking, tolerance) {
  const polygons = [];
  let advance = 0;
  const glyphGroups = tracking ? [...text].map((character) => ({ character, shapes: font.generateShapes(character, size) })) : [{ character: text, shapes: font.generateShapes(text, size) }];
  for (const { character, shapes } of glyphGroups) {
    for (const shape of shapes) {
      const { shape: outline, holes } = shape.extractPoints(24);
      const rings = [outline, ...holes].map((ring) => simplifyRing(ring.map(({ x, y }) => [x + advance, y]), tolerance));
      if (rings[0].length >= 4) polygons.push(rings);
    }
    if (tracking) advance += ((font.data.glyphs[character]?.ha ?? font.data.resolution * 0.3) / font.data.resolution + tracking) * size;
  }
  return polygons;
}

function shapesFromUnion(polygons, tolerance) {
  const union = polygonClipping.union(...polygons);
  const shapes = union.map((polygon) => {
    const rings = polygon.map((ring) => simplifyRing(ring, tolerance));
    const outer = rings[0].slice(0, -1).map(([x, y]) => ({ x, y }));
    if (!ShapeUtils.isClockWise(outer)) outer.reverse();
    const shape = new Shape();
    outer.forEach(({ x, y }, i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
    shape.closePath();
    for (const ring of rings.slice(1)) {
      const points = ring.slice(0, -1).map(([x, y]) => ({ x, y }));
      if (ShapeUtils.isClockWise(points)) points.reverse();
      const hole = new Path();
      points.forEach(({ x, y }, i) => i ? hole.lineTo(x, y) : hole.moveTo(x, y));
      hole.closePath();
      shape.holes.push(hole);
    }
    return shape;
  });
  return { shapes, inputIslands: polygons.length, unionIslands: union.length, outlinePoints: union.reduce((sum, polygon) => sum + polygon.reduce((total, ring) => total + ring.length - 1, 0), 0) };
}

function extrude(font, text, { size, tracking = 0, tolerance, bevelSegments, descriptor = false }) {
  const union = shapesFromUnion(filledPolygons(font, text, size, tracking, tolerance), tolerance);
  const raw = new ExtrudeGeometry(union.shapes, {
    depth: size * 0.1,
    steps: 1,
    curveSegments: 1, // Curves were adaptively flattened before the planar union.
    bevelEnabled: true,
    bevelThickness: size * (descriptor ? 0.045 : 0.075),
    bevelSize: size * (descriptor ? 0.025 : 0.045),
    bevelSegments,
  });
  raw.deleteAttribute('uv');
  const smooth = toCreasedNormals(raw, Math.PI / 3);
  const geometry = mergeVertices(smooth, 1e-5);
  geometry.clearGroups();
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  geometry.translate(-(box.max.x + box.min.x) / 2, 0, -(box.max.z + box.min.z) / 2);
  geometry.computeBoundingBox();
  if (smooth !== raw) smooth.dispose();
  raw.dispose();
  return { geometry, union: { inputIslands: union.inputIslands, unionIslands: union.unionIslands, outlinePoints: union.outlinePoints } };
}

function pack(meshes, dimensions) {
  let range = 0;
  for (const mesh of meshes) {
    for (const value of mesh.geometry.getAttribute('position').array) range = Math.max(range, Math.abs(value));
  }
  // A small margin ensures integer rounding never saturates an outermost vertex.
  range *= 1.00001;
  const chunks = [];
  let byteOffset = 0;
  const append = (array) => {
    const padding = (4 - byteOffset % 4) % 4;
    if (padding) { chunks.push(Buffer.alloc(padding)); byteOffset += padding; }
    const descriptor = { offset: byteOffset, length: array.length };
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    chunks.push(bytes);
    byteOffset += bytes.length;
    return descriptor;
  };
  const entries = meshes.map(({ name, geometry, union }) => {
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const positions = Int16Array.from(position.array, (value) => Math.round(Math.max(-1, Math.min(1, value / range)) * 32767));
    // Glancing glass highlights amplify small angular errors. Int16 normals
    // retain the smooth bevels without Int8's visible specular quantization.
    const normals = Int16Array.from(normal.array, (value) => Math.round(Math.max(-1, Math.min(1, value)) * 32767));
    const IndexArray = position.count <= 65535 ? Uint16Array : Uint32Array;
    const indices = IndexArray.from(geometry.index.array);
    return {
      name,
      count: indices.length,
      vertexCount: position.count,
      positions: append(positions),
      normals: { ...append(normals), type: 'int16' },
      indices: { ...append(indices), type: IndexArray === Uint16Array ? 'uint16' : 'uint32' },
      union,
    };
  });
  return {
    metadata: {
      version: 2,
      scale: range,
      width: dimensions.width,
      height: dimensions.height,
      depth: dimensions.depth,
      encoding: { positions: 'int16-normalized', normals: 'int16-normalized', byteOrder: 'little-endian', offsets: 'bytes', lengths: 'elements' },
      meshes: entries,
    },
    binary: Buffer.concat(chunks),
  };
}

for (const [variant, settings] of Object.entries({
  desktop: { tolerance: 0.001, bevelSegments: 6 },
  mobile: { tolerance: 0.0025, bevelSegments: 4 },
})) {
  const name = extrude(scriptFont, 'G-FORCE', { size: 1.7, ...settings });
  const descriptor = extrude(descriptorFont, 'IT SERVICES INC.', {
    size: 0.3,
    tracking: 0,
    tolerance: settings.tolerance * 0.4,
    bevelSegments: variant === 'desktop' ? 3 : 2,
    descriptor: true,
  });
  // Every mesh is baked into one shared world frame, centred on the complete
  // lockup. The renderer can fade the descriptor without managing line offsets.
  descriptor.geometry.translate(0, name.geometry.boundingBox.min.y - 0.2 - descriptor.geometry.boundingBox.max.y, 0);
  descriptor.geometry.computeBoundingBox();
  const bounds = new Box3().union(name.geometry.boundingBox).union(descriptor.geometry.boundingBox);
  const centreY = (bounds.max.y + bounds.min.y) / 2;
  name.geometry.translate(0, -centreY, 0);
  descriptor.geometry.translate(0, -centreY, 0);
  const dimensions = { width: bounds.max.x - bounds.min.x, height: bounds.max.y - bounds.min.y, depth: bounds.max.z - bounds.min.z };
  const { metadata, binary } = pack([{ name: 'name', ...name }, { name: 'descriptor', ...descriptor }], dimensions);
  const basename = `gforce-glass-original-${variant}`;
  await Promise.all([
    fs.writeFile(path.join(assetDirectory, `${basename}.json`), `${JSON.stringify(metadata, null, 2)}\n`),
    fs.writeFile(path.join(assetDirectory, `${basename}.bin`), binary),
  ]);
  for (const entry of metadata.meshes) console.log(`${variant}/${entry.name}: ${entry.vertexCount.toLocaleString()} vertices, ${(entry.count / 3).toLocaleString()} triangles; outlines ${entry.union.inputIslands}→${entry.union.unionIslands}`);
  console.log(`${basename}: ${(binary.length / 1024).toFixed(1)} KiB binary, ${metadata.width.toFixed(3)}×${metadata.height.toFixed(3)} world units`);
  name.geometry.dispose();
  descriptor.geometry.dispose();
}
