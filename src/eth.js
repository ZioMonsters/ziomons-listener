const Web3  = require("web3")
const provider = new Web3.providers.HttpProvider("https://rinkeby.infura.io/v3/1201996cee964d44a66b1a4615f72b4a")
const web3 = new Web3(provider)

const e = module.exports

const { abi } = require("./CryptoMon.json")
const contractAddress = "0x76C6bA0CF7a5031A895d7DC57272DaC903d69647"

const contract = new web3.eth.Contract(abi, contractAddress)

e.getLastBlockNumber = () => {
  return web3.eth.getBlockNumber()
    .then(result => result.toString())
    .catch(console.error)
}

e.getEvents = ({ from, to }) => contract.getPastEvents("allEvents", { fromBlock: from, toBlock: to })
