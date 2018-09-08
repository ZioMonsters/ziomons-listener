const AWS = require("aws-sdk")
const { contractInstance, getLastBlockNumber, getEvents } = require("./eth.js")
const sqs = new AWS.SQS({ region: "eu-west-3" })
const documentClient = new AWS.DynamoDB.DocumentClient({ region: "eu-west-3" })

exports.handler = (event, context, callback) => {
  //blocco del deploydel contratto su rinkeby
  //andra' fuori perche' si conservera' lo state
  let fromBlock = 2946603

  let toBlock
  return getLastBlockNumber()
    .then(lastBlock => {
      toBlock = lastBlock
      return getEvents({ from: fromBlock, to: fromBlock+50 })
    })
    .then(events => {
      //events e' vuoto perche' nessuno sta lavorando sulla testnet per ora
      console.log("events", events)
      return Promise.all(events.reduce((acc, event) => {
        console.log(event);
        let type
        let params
        let { returnValues: { Result } } = event
        switch (event.event) {
          case "Unboxed": {
            type = "unbox"
            const { atk, def, spd, lvl, exp } = contractInstance().Monsters(Result._tokenId);
            Result = {
              tokenId: Result._tokenId,
              to: Result._to,
              atk,
              def,
              spd,
              lvl,
              exp
            }
            break
          }
          case "Results": {
            type = "clash"
            break
          }
          case "ForSale": {
            type = "sell"
            break
          }
          case "Transfer": {
            if (event.address !== "0x0000000000000000000000000000000000000000") {
              type = "buy"
            }
            break
          }
          default: {
            return acc
          }
        }
        acc.push(
          sqs.sendMessage({
            QueueUrl: `https://sqs.eu-west-3.amazonaws.com/477398036046/cryptomon-${type}`,
            MessageBody: JSON.stringify(event)
          }).promise()
        )
        const transactionId = event.transactionHash
        delete event.transactionHash
        acc.push(
          documentClient.put({
            TableName: `cryptomon-events-${process.env.NODE_ENV}`,
            Item: Object.assign({
              transactionId,
              type
            }, event.returnValues)
          }).promise()
        )
        return acc
      }, []))
    })
    .then(() => {
      fromBlock = toBlock
      callback(null, event)
    })
    .catch(err => callback(err))
  // let toBlock
  // let listenerEvents
  //
  // getContractInstance()
  //   .then(({ getPastEvents }) => {
  //     listenerEvents = getPastEvents
  //     return getBlockNumber()
  //   })
  //   .then(currentBlock => {
  //     toBlock = currentBlock
  //     return listenerEvents("Transfer", {
  //       fromBlock,
  //       toBlock
  //     })
  //   })
  //   .then(eventTransfer)
  //   .then(log => {
  //     console.log(log)
  //     return listenerEvents("ForSale", {
  //       fromBlock,
  //       toBlock
  //     })
  //   })
  //   .then(eventForSale)
  //   .then(log => {
  //     console.log(log)
  //     return listenerEvents("Results", {
  //       fromBlock,
  //       toBlock
  //     })
  //   })
  //   .then(eventResults)
  //   .then(log => {
  //     console.log(log)
  //     return listenerEvents("Sold", {
  //       fromBlock,
  //       toBlock
  //     })
  //   })
  //   .then(eventSold)
  //   .then(log => {
  //     console.log(log)
  //     fromBlock = toBlock
  //   })
  //   .catch(console.log)
}
