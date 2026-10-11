const mongoose = require('mongoose');
async function check() {
  await mongoose.connect('mongodb://localhost:27017/hackmatrix');
  const encounters = await mongoose.connection.collection('encounters').find({}).toArray();
  console.log('Total encounters in DB:', encounters.length);
  const withoutRegion = encounters.filter(e => !e.region);
  console.log('Encounters without region:', withoutRegion.length);
  const diseases = [...new Set(encounters.map(e => e.diseaseCategory).filter(Boolean))];
  console.log('Existing disease categories in DB:', diseases);
  await mongoose.disconnect();
}
check();
