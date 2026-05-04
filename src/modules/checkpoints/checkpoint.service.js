import CheckPoint from './checkpoint.model.js';

export async function findAll() {
  return CheckPoint.find({});
}

export async function findById(id) {
  return CheckPoint.findById(id);
}

export async function create(data) {
  const checkpoint = new CheckPoint(data);
  await checkpoint.save();
  return checkpoint;
}

export async function update(id, data) {
  return CheckPoint.findByIdAndUpdate(id, data, { new: true, runValidators: true });
}

export async function remove(id) {
  return CheckPoint.findByIdAndDelete(id);
}
