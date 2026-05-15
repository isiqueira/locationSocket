import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import dotenv from 'dotenv';
import City from './modules/cities/city.model.js';
import states from './citiesData/states.dictionary.js';
import statesNames from './citiesData/states-names.dictionary.js';
import { connectMongo } from './infra/mongo.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to compute signed area of a ring (array of [lon, lat] points)
// Assumes the ring is closed (first point == last point) or we treat it as closed by wrapping around.
function signedArea(ring) {
  let area = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

// Function to ensure a ring is closed (first point == last point)
function closeRing(ring) {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...ring, first];
  }
  return ring;
}

// Function to fix polygon geometry by taking the first ring (exterior) and ensuring it is valid and counterclockwise.
// We ignore any holes to avoid issues with secondary loops not being contained in the exterior.
function fixGeometry(geometry) {
  if (!geometry || !geometry.type || !geometry.coordinates) {
    return geometry;
  }

  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates;
    if (rings.length === 0) {
      // No rings, return a minimal valid polygon
      return { ...geometry, coordinates: [[[0, 0], [0, 0.001], [0.001, 0.001], [0, 0]]] };
    }

    // Take the first ring as the exterior ring
    let exteriorRing = rings[0].slice();
    // Close the ring if not already closed
    exteriorRing = closeRing(exteriorRing);
    // If the ring has less than 4 distinct points, it's not a valid polygon; use a default
    // We'll check by converting to a set of strings (with some tolerance for floating point? but we'll use exact for now)
    const pointsSet = new Set(exteriorRing.map(p => p[0] + ',' + p[1]));
    if (pointsSet.size < 3) {
      // Not enough distinct points, use a default small triangle
      exteriorRing = [[0, 0], [0, 0.001], [0.001, 0], [0, 0]];
    }
    // Make sure the exterior ring is counterclockwise (positive signed area)
    if (signedArea(exteriorRing) < 0) {
      exteriorRing.reverse();
    }

    return { ...geometry, coordinates: [exteriorRing] };
  }

  if (geometry.type === 'MultiPolygon') {
    const polygons = geometry.coordinates;
    const fixedPolygons = polygons.map(polygon => {
      if (polygon.length === 0) {
        return [[[0, 0], [0, 0.001], [0.001, 0.001], [0, 0]]];
      }
      // Take the first ring of this polygon
      let exteriorRing = polygon[0].slice();
      exteriorRing = closeRing(exteriorRing);
      const pointsSet = new Set(exteriorRing.map(p => p[0] + ',' + p[1]));
      if (pointsSet.size < 3) {
        exteriorRing = [[0, 0], [0, 0.001], [0.001, 0], [0, 0]];
      }
      if (signedArea(exteriorRing) < 0) {
        exteriorRing.reverse();
      }
      return [exteriorRing];
    });
    return { ...geometry, coordinates: fixedPolygons };
  }

  // For other geometry types (Point, LineString, etc.) we don't need to fix
  return geometry;
}

export const syncCitiesFromDictionary = async () => {
  console.log('Starting city sync from dictionary...');
  for (const state in states) {
    await syncCities(state);
  }
  console.log('Finished city sync from dictionary.');
};

const syncCities = async (state) => {
  try {
    console.log(`Starting city sync for state ${statesNames[state]}`);
    const filePath = states[state];

    // Prefer local file; fall back to remote URL if CITIES_DATA_FROM_IBGE is set
    const localPath = path.join(__dirname, 'citiesData', filePath);
    let geojsonData;
    if (fs.existsSync(localPath)) {
      geojsonData = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
      console.log(`Loaded local file for state ${statesNames[state]}: ${localPath}`);
    } else if (process.env.CITIES_DATA_FROM_IBGE) {
      const url = `${process.env.CITIES_DATA_FROM_IBGE}/${filePath}`;
      const response = await axios.get(url);
      geojsonData = response.data;
    } else {
      throw new Error(`Local file not found and CITIES_DATA_FROM_IBGE is not set: ${localPath}`);
    }

    for (const feature of geojsonData.features) {
      const { properties, geometry } = feature;

      if (!geometry || !geometry.type || !geometry.coordinates || geometry.coordinates.length === 0) {
        continue;
      }

      // Fix the geometry to meet MongoDB 2dsphere requirements
      const fixedGeometry = fixGeometry(geometry);

      const existingCity = await City.findOne({ externalId: properties.id });
      if (existingCity) {
        await City.deleteOne({ externalId: properties.id });
      }

      const newCity = new City({
        name: properties.name,
        state,
        externalId: properties.id,
        geometry: fixedGeometry,
      });
      await newCity.save();
    }

    const citiesCount = await City.countDocuments({ state });
    console.log(`Finished city sync for state ${statesNames[state]}. ${citiesCount} cities inserted. In the file we have ${geojsonData.features.length} cities.`);
  } catch (error) {
    console.error('Error syncing cities:', error);
    throw error;
  }
};

await connectMongo();
await syncCitiesFromDictionary();
