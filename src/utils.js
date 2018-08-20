const e = module.exports;

e.promiseWaterfall = callbacks => {
  return callbacks.reduce((acc, cb) => {
    return acc.then(cb);
  }, Promise.resolve());
};
