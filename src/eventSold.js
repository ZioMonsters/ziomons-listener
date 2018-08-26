const { dynamoDB } = require('./aws.js');

const monstersTable = `cryptomon-shop-${process.env.NODE_ENV}`;

module.exports = events => {
  // qui faccio gruppi da 25
  const groups = events.reduce((acc, { returnValues: { _id: tokenId, _price: price } }, i) => {
    if (i % 25 === 0 && i !== 0) {
      const index = Math.floor(i / 25);
      acc[index] = [{ tokenId, price }];
    } else {
      const index = Math.trunc(i / 25);
      acc[index].push({ tokenId, price });
    }
    return acc;
  }, []);

  //elimino dal db dello shop i mostri venduti
  groups.forEach(group => {
    group.forEach(({ tokenId, price }) => {
      dynamoDB.deleteItem({
        TableName: monstersTable,
        Key: {
          tokenId,
          price
        }
      });
    });
  });
};
