const Web3 = require('web3');
const isLambda = !!(process.env.LAMBDA_TASK_ROOT && process.env.LAMBDA_RUNTIME_DIR);
const e = module.exports;

let provider;
if (isLambda) {
  provider = '';
} else {
  provider = 'http://127.0.0.1:8545/';
}
const web3 = e.web3 = new Web3(provider);
const { abi } = require('cryptomon-contracts/build/contracts/CryptoMon.json');
let networks;
if (isLambda) {
  networks = {};
} else {
  networks = require('../resources/blockchain/build/state/tokenAddress.json');
}


e.getContractInstance = () => {
  return web3.eth.net.getId()
    .then(networkId => {
      return new web3.eth.Contract(abi, networks[networkId].address);
    });
};
