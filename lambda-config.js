module.exports = env => ({
  Region: 'eu-west-3',
  ConfigOptions: {
    FunctionName: `cryptomon-listener-${env}`,
    Description: '',
    Role: 'arn:aws:iam::477398036046:role/cryptomon-listener',
    Handler: 'index.handler',
    MemorySize: 128,
    Timeout: 10,
    Runtime: 'nodejs8.10',
    Environment: {
      Variables: {
        NODE_ENV: env
      }
    }
  }
});