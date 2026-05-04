import CheckPoint from '../checkpoints/checkpoint.model.js';
import ForbiddenArea from '../forbidden-areas/forbidden-area.model.js';

export async function findNearCheckpoints(location) {
  return CheckPoint.find({
    gpsLocation: {
      $near: {
        $maxDistance: 2000,
        $geometry: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        }
      }
    }
  }).exec();
}

export async function findForbiddenAreas(location) {
  return ForbiddenArea.find({
    area: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        }
      }
    }
  }).exec();
}
