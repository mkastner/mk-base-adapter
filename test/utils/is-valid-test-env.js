module.exports = function checkTestEnv() {
  if (!(process.env.NODE_ENV === 'test')) {
    throw new Error(`Tests must be run in NODE_ENV=test but not in env ${process.env.NODE_ENV}`);
  }
};
