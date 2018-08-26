const AWS = require('aws-sdk');
const e = module.exports;
e.lambda = new AWS.Lambda({ region: 'eu-west-1' });
e.dynamoDB = new AWS.DynamoDB({ region: 'eu-west-3' });
