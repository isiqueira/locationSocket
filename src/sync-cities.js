import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import dotenv from 'dotenv';
import City from './schemas/city.model.js';
import states from './citiesData/states.dictionary.js';
import statesNames from './citiesData/states-names.dictionary.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

    // Prefer local file; fall back to remote URL if CITIES_DATA_FORM_IBGE is set
    const localPath = path.join(__dirname, 'citiesData', filePath);
    let geojsonData;
    if (fs.existsSync(localPath)) {
      geojsonData = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
    } else if (process.env.CITIES_DATA_FORM_IBGE) {
      const url = `${process.env.CITIES_DATA_FORM_IBGE}/${filePath}`;
      const response = await axios.get(url);
      geojsonData = response.data;
    } else {
      throw new Error(`Local file not found and CITIES_DATA_FORM_IBGE is not set: ${localPath}`);
    }

    for (const feature of geojsonData.features) {
      const { properties, geometry } = feature;

      if (!geometry || !geometry.type || !geometry.coordinates || geometry.coordinates.length === 0) {
        continue;
      }

      let coords = [];

      for (let i = 0; i < geometry.coordinates.length; i++) {
        if (geometry.coordinates[i].length > 2) {
          geometry.coordinates[i].forEach(element => coords.push(element));
        } else {
          coords.push(geometry.coordinates[i]);
        }

        const existingCity = await City.findOne({ externalId: properties.id });
        if (existingCity) {
          await City.deleteOne({ externalId: properties.id });
        }

        const newCity = new City({
          name: properties.name,
          state,
          externalId: properties.id,
          geometry: { type: geometry.type, coordinates: coords },
        });
        await newCity.save();
      }
    }

    const citiesCount = await City.countDocuments({ state });
    console.log(`Finished city sync for state ${statesNames[state]}. ${citiesCount} cities inserted. In the file we have ${geojsonData.features.length} cities.`);
  } catch (error) {
    console.error('Error syncing cities:', error);
    throw error;
  }
};
