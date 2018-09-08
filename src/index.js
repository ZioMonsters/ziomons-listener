const AWS = require("aws-sdk")
const { getLastBlockNumber, getEvents } = require("./eth.js")
const sqs = new AWS.SQS({ region: "eu-west-3" })
const documentClient = new AWS.DynamoDB.DocumentClient({ region: "eu-west-3" })

let fromBlock = 0

exports.handler = (event, context, callback) => {
  let toBlock
  return getLastBlockNumber()
    .then(lastBlock => {
      toBlock = lastBlock
      return getEvents({ from: fromBlock, to: lastBlock })
    })
    .then(events => {
      console.log("events", events)
      return Promise.all(events.reduce((acc, event) => {
        let type
        switch (event.event) {
          case "Unboxed": {
            type = "unbox"
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
