import fs from 'fs';

const geojson = JSON.parse(fs.readFileSync('src/citiesData/geojson/geojs-13-mun.json', 'utf8'));
let invalidCount = 0;
const invalidFeatures = [];

for (const feature of geojson.features) {
  if (!feature.geometry || !feature.geometry.coordinates) continue;
  
  let isInvalid = false;
  for (let i = 0; i < feature.geometry.coordinates.length; i++) {
    const ring = feature.geometry.coordinates[i];
    // Check if ring has less than 4 points or all points are identical
    if (ring.length < 4) {
      isInvalid = true;
      break;
    }
    
    // Check if all points in ring are identical
    const firstPoint = ring[0];
    let allIdentical = true;
    for (let j = 1; j < ring.length; j++) {
      if (ring[j][0] !== firstPoint[0] || ring[j][1] !== firstPoint[1]) {
        allIdentical = false;
        break;
      }
    }
    if (allIdentical) {
      isInvalid = true;
      break;
    }
  }
  
  if (isInvalid) {
    invalidCount++;
    invalidFeatures.push({
      id: feature.properties?.id || feature.properties?.externalId || feature.properties?.codmun || 'unknown',
      name: feature.properties?.name || 'unknown'
    });
  }
}

console.log(`Total features: ${geojson.features.length}`);
console.log(`Invalid features: ${invalidCount}`);
if (invalidFeatures.length > 0) {
  console.log('First 10 invalid features:');
  invalidFeatures.slice(0, 10).forEach(f => {
    console.log(`  ID: ${f.id}, Name: ${f.name}`);
  });
}