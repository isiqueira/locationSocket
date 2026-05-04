import ForbiddenArea from './forbidden-area.model.js';

export async function findAll() {
  return ForbiddenArea.find({});
}

export async function findById(id) {
  return ForbiddenArea.findById(id);
}

export async function create(data) {
  const area = new ForbiddenArea(data);
  await area.save();
  return area;
}

export async function update(id, data) {
  return ForbiddenArea.findByIdAndUpdate(id, data, { new: true, runValidators: true });
}

export async function remove(id) {
  return ForbiddenArea.findByIdAndDelete(id);
}
