/* eslint-disable global-require, import/no-commonjs, import/order, no-console */

// This is a one-shot process: importing the models would otherwise start
// long-lived background work (Blocker change streams, the NewsPost cache
// refresh interval) that turns the final mongoose.disconnect() into
// MongoClientClosedError/MongoPoolClosedError noise and keeps the event loop
// alive forever. Must be set before setupNconf() reads the env.
process.env.ONE_SHOT_PROCESS = 'true';

const setupNconf = require('./libs/setupNconf').default;

setupNconf();
require('./libs/selfhostConfig').default();

const mongoose = require('mongoose');

// The API server owns index builds; a one-shot must not start background
// createIndex calls on connect — they hold checked-out connections that the
// final disconnect interrupts (MongoClientClosedError / MongoPoolClosedError).
mongoose.set('autoIndex', false);

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
