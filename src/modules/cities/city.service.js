import City from './city.model.js';

export async function findCityByPoint(lat, lng) {
  const point = { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] };
  return City.findOne({ geometry: { $geoIntersects: { $geometry: point } } });
}

export async function findCities(filter = {}, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    City.find(filter).skip(skip).limit(limit).lean(),
    City.countDocuments(filter),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findCityById(externalId) {
  return City.findOne({ externalId });
}
