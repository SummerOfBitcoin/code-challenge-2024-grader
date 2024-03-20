const {validateBlock} = require('./validate-block')
const {validateHeader} = require('./validate-header')

const {readFileSync} = require('fs')

export const validate = () => {
  console.log('Running the tests')
  try {
    const data = readFileSync('output.txt', 'utf8').trim().split('\n')
    const header = data[0]
    const coinbase = data[1]
    const txids = data.slice(2)

    // Validate the block header
    validateHeader(header, txids)

    // Validate the block
    return validateBlock(coinbase, txids)
  } catch (error) {
    console.log(error.message)
    throw error
  }
}
