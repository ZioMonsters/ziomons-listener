const AWS = require("aws-sdk")
const { contractInstance, getLastBlockNumber, getEvents } = require("./eth.js")
const sqs = new AWS.SQS({ region: "eu-west-3" })
const documentClient = new AWS.DynamoDB.DocumentClient({ region: "eu-west-3" })
//const uuid = require()

exports.handler = (_, context, callback) => {
  //blocco del deploydel contratto su rinkeby
  //andra' fuori perche' si conservera' lo state

  let fromBlock = 2955454
  let allEvents = ["Unboxed"]/*, "ForSale", "Transfer", "Results", "Upgraded"]*/
  let toBlock
  return getLastBlockNumber()
    .then(lastBlock => {
      toBlock = lastBlock
      return Promise.all(
        allEvents.map(eventName => getEvents(eventName, { fromBlock, toBlock }))
      )
    })
    .then(groupEvents => {
      console.log('step1', groupEvents)
      const groupParams = [];
      groupEvents.map(events => {
        console.log('events', events)
        switch (events[0].event) {
          case "Unboxed":
            const params = events.map(event => {
              console.log('event', event)
              const {returnValues: { Result }} = event;
              const { _player, _ids } = Result
              const {atk, def, spd, lvl, exp, rarity} = contractInstance().Monsters(Result._tokenId);
              return {
                tokenId: Result._tokenId,
                to: Result._to,
                atk,
                def,
                spd,
                lvl,
                exp,
                rarity
              }
            })
            groupParams.push(params);
            break
          case "Forsale":
            groupParams.push(events.map(event => {
              const {returnValues: {Result}} = event;
              return Result
            }))
            break
          case "Transfer":
            groupParams.push(events.map(event => {
              const {returnValues: {Result}} = event;
              if (Result._from.substr(0, 3) !== '0x0') {
                return Result
              }
            }))
            break
          default:
            groupParams.push(events.map(event => {
              const {returnValues: {Result}} = event;
              return Result
            }))
            break
        }
        groupParams.forEach((params, index) => {
          params.forEach(e => {
            console.log(e)
            /*sqs.sendMessage({
              QueueUrl: `https://sqs.eu-west-3.amazonaws.com/477398036046/cryptomon-${allEvents[index]}`,
              MessageBody: JSON.stringify(e)
            }).promise()
              .then(console.log)
              .catch(console.error)*/
          })

        })

      })
    })
}
      /*
      let params = []

      groupEvents.forEach((events, index) => {
        let type
        switch (index) {
          case 0:
            type = "unbox"
            params.push(events.map(event => {
              return {
                tokenId: Result._tokenId,
                to: Result._to,
                atk,
                def,
                spd,
                lvl,
                exp
              }
            }))
            break
          case 1:
            type = "sell"
            params.push(event.map(event => {
              const { returnValues: { Result } } = event;
              return Result;
            }))
            break
          case 2:
            type = "clash"
            params.push(event.map(event => {
              const { returnValues: { Result } } = event;
              return Result;
            }))
            break
          case 3:
            type = "upgrade"
            params.push(event.map(event => {
              const { returnValues: { Result } } = event;
              return Result;
            }))
            break
          case 4:
            if (event.address !== "0x0000000000000000000000000000000000000000") {
              type = "buy"
              params.push(event.map(event => {
                const { returnValues: { Result } } = event;
                return Result;
              }))
            }
            break
        }
      })

      params.map((eventsParams, index) => {

        sqs.sendMessage({
          QueueUrl: `https://sqs.eu-west-3.amazonaws.com/477398036046/cryptomon-${type}`,
          MessageBody: JSON.stringify(event)
        }).promise()
      })
              }
        acc.push(

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
    }
    .then(() => {
      fromBlock = toBlock
      callback(null, event)
    })
    .catch(err => callback(err))
}
*/
