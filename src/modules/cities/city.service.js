import City from './city.model.js';

export async function findCityByPoint(lat, lng) {
  const point = { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] };
  return City.findOne({ geometry: { $geoIntersects: { $geometry: point } } });
}

export async function findCities(filter = {}) {
  return City.find(filter);
}

export async function findCityById(externalId) {
  return City.findOne({ externalId });
}
