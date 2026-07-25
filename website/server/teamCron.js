/* eslint-disable global-require, import/no-commonjs, import/order, no-console */

const setupNconf = require('./libs/setupNconf').default;

setupNconf();
require('./libs/selfhostConfig').default();

const mongoose = require('mongoose');
const connectToMongoDB = require('./libs/mongoose').default;
const processTeamsCron = require('./libs/teamCron').default;

async function run () {
  try {
    await connectToMongoDB();
    await processTeamsCron();
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    await mongoose.disconnect();
    process.exitCode = 1;
  }
}

run();
