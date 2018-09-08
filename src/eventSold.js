const { dynamoDB } = require('./aws.js');
const { createBlocks } = require('./utils.js');

const monstersTable = `cryptomon-shop-${process.env.NODE_ENV}`;

module.exports = events => {
  //estrapolo dagli eventi solo i dati necessari
  const data = events.reduce((acc, { returnValues: { _id: tokenId, _price: price } }) =>
    [...acc, [tokenId, price]], []);

  //qui creo i blocchi da 25
  const blocks = createBlocks(data);

  //elimino dal db dello shop i mostri venduti
  blocks.forEach(block => {
    block.forEach(([tokenId, price]) => {
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
