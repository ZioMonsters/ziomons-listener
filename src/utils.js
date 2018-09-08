const e = module.exports;

e.promiseWaterfall = callbacks => {
  return callbacks.reduce((acc, cb) => {
    return acc.then(cb);
  }, Promise.resolve());
};

e.createBlocks = events => {
  return events.reduce((acc, event, i) => {
    if (i % 25 === 0 && i !== 0) {
      const index = Math.floor(i / 25);
      acc[index] = event;
    } else {
      const index = Math.trunc(i / 25);
      acc[index].push(event);
    }
    return acc;
  }, []);
};

