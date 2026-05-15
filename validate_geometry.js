import fs from 'fs';

const geojson = JSON.parse(fs.readFileSync('src/citiesData/geojson/geojs-13-mun.json', 'utf8'));
const feature = geojson.features.find(f => f.properties && (f.properties.id === '1303205' || f.properties.externalId === '1303205' || f.properties.codmun === '1303205'));

console.log('Geometry type:', feature.geometry.type);
console.log('Number of rings:', feature.geometry.coordinates.length);

for (let i = 0; i < feature.geometry.coordinates.length; i++) {
  const ring = feature.geometry.coordinates[i];
  console.log(`Ring ${i}: ${ring.length} points`);
  console.log(`  First: [${ring[0]}]`);
  console.log(`  Last: [${ring[ring.length - 1]}]`);
  console.log(`  Closed: ${JSON.stringify(ring[0]) === JSON.stringify(ring[ring.length - 1])}`);
  
  // Check coordinate validity
  for (let j = 0; j < ring.length; j++) {
    const coord = ring[j];
    if (!Array.isArray(coord) || coord.length !== 2 || typeof coord[0] !== 'number' || typeof coord[1] !== 'number') {
      console.log(`  Invalid coordinate at index ${j}:`, coord);
    }
    if (!isFinite(coord[0]) || !isFinite(coord[1])) {
      console.log(`  Non-finite coordinate at index ${j}:`, coord);
    }
  }
}