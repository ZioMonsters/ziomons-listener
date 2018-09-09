const AWS = require("aws-sdk")
const { contractInstance, getLastBlockNumber, getEvents } = require("./eth.js")
const sqs = new AWS.SQS({ region: "eu-west-3" })
const documentClient = new AWS.DynamoDB.DocumentClient({ region: "eu-west-3" })
const uuidv1 = require("uuid/v1")
const flatten = require("array-flatten")

const eventsQueueNameParser = {
  "Unboxed": "unbox"
}

let toBlock
exports.handler = (_, context, callback) => {
  //blocco del deploydel contratto su rinkeby
  //andra' fuori perche' si conservera' lo state

  const fromBlock = 2956160
  const allEvents = ["Unboxed"]
  /*, "ForSale", "Transfer", "Results", "Upgraded"]*/
  return getLastBlockNumber()
    .then(lastBlock => {
      toBlock = lastBlock
      return Promise.all(
        allEvents.map(eventName => {
          return getEvents(eventName, { fromBlock, toBlock: lastBlock })
            .then(events => ({ eventName, events }))
        })
      )
    })
    .then(eventGroups => {
      return Promise.all(flatten(eventGroups.map(({ eventName, events }) => {
        return events.map(({ returnValues: { _player, _ids } }) => {
          return _ids.map(id => {
            return contractInstance().methods.monsters(id).call()
              .then(data => ({ _player, ...data, eventName, transactionId: uuidv1() }))
          })
        })
      })))
    })
    .then(messageParams => {
      const filteredMessages = messageParams.reduce((acc, message) => {
        const { eventName } = message
        if (!acc[eventName]) {
          acc[eventName] = [message]
        } else {
          acc[eventName].push(message)
        }

        return acc
      }, {})

      return Promise.all(Object.entries(filteredMessages).map(([eventName, messages]) => {

        return sqs.sendMessage({
          QueueUrl: `https://sqs.eu-west-3.amazonaws.com/477398036046/cryptomon-${eventsQueueNameParser[eventName]}`,
          MessageBody: JSON.stringify(messages)
        }).promise()
      }))

    })
    .then(sqsResponses => callback(null, sqsResponses))
    .catch(err => {
      console.log("error")
      console.log(err)
    })
}
