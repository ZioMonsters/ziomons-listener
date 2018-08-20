const Contract = require('truffle-contract');
const { abi } = require('cryptomon-contracts/build/contracts/CryptoMon.json');

const network = 'http://127.0.0.1:8545';

const Token = Contract({ abi });

module.exports = callback => {
  Token.setProvider(web3.currentProvider);
  Token.defaults({ 'from': web3.eth.accounts[0], 'gas': 4000000 });

  const { address } = networks[web3.version.network];

  Token.at(address).then(contractInstance =>
    contractInstance.balanceOf.call(web3.eth.accounts[0])
  )
    .then(balance => { console.log('Account', address, 'has', balance.toString(), 'tokens'); })
    .then(callback())
    .catch(console.error);
};
