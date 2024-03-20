const {readFileSync} = require('fs')
const {generateMerkleRoot, hash256, WITNESS_RESERVED_VALUE} = require('./utils')
const {Transaction} = require('bitcoinjs-lib')

const calculateWitnessCommitment = (wtxids) => {
  const witnessRoot = generateMerkleRoot(wtxids)
  const witnessReservedValue = WITNESS_RESERVED_VALUE.toString('hex')
  return hash256(witnessRoot + witnessReservedValue)
}

export const validateBlock = (coinbase, txids) => {
  if (txids.length === 1) {
    throw new Error(
      'Cannot validate empty block. You must include some transactions in the block to complete the challenge.',
    )
  }

  const mempool = JSON.parse(readFileSync('./valid-mempool.json'))
  const set = new Set(mempool)
  for (let i = 1; i < txids.length; i++) {
    if (!set.has(txids[i])) {
      throw new Error('Invalid txid found in block')
    }
  }

  const coinbaseTx = Transaction.fromHex(coinbase)
  if (coinbaseTx.ins.length !== 1) {
    throw new Error('Coinbase transaction has invalid input count')
  }
  if (coinbaseTx.outs.length !== 2) {
    throw new Error(
      'Coinbase transaction must have exactly 2 outputs. One for the block reward and one for the witness commitment',
    )
  }
  if (!coinbaseTx.isCoinbase()) {
    throw new Error('Coinbase transaction is not a coinbase')
  }
  if (coinbaseTx.ins[0].script.length < 2 || coinbaseTx.ins[0].script.length > 100) {
    throw new Error('Coinbase transaction input script length is invalid')
  }
  if (coinbaseTx.ins[0].witness.length === 0) {
    throw new Error('Coinbase transaction witness is missing')
  }
  if (coinbaseTx.ins[0].witness[0].compare(WITNESS_RESERVED_VALUE) !== 0) {
    throw new Error('Coinbase transaction must have witness reserved value as first witness item')
  }

  let totalWeight = BigInt(coinbaseTx.weight())
  let totalFee = 0n

  const wtxids = [coinbaseTx.getHash(true).reverse().toString('hex')]

  for (let i = 1; i < txids.length; i++) {
    const tx = JSON.parse(readFileSync(`./valid-mempool/${txids[i]}.json`))
    totalWeight += BigInt(tx.weight)
    totalFee += BigInt(tx.fee)
    const parsedTx = Transaction.fromHex(tx.hex)
    const wtxid = parsedTx.getHash(true).reverse().toString('hex')
    wtxids.push(wtxid)
  }

  if (totalWeight > 4000000n) {
    throw new Error('Block exceeds maximum weight')
  }

  const witnessCommitment = calculateWitnessCommitment(wtxids)
  const scriptPubKeyForWitnessCommitment = `6a24aa21a9ed${witnessCommitment}`
  let foundWitnessCommitment = false
  for (const output of coinbaseTx.outs) {
    if (output.script.toString('hex') === scriptPubKeyForWitnessCommitment) {
      foundWitnessCommitment = true
      break
    }
  }
  if (!foundWitnessCommitment) {
    throw new Error('Coinbase transaction does not contain a witness commitment or contains invalid witness commitment')
  }

  console.log(
    `Congratulations! Block is valid with a total fee of ${totalFee} sats and a total weight of ${totalWeight}!`,
  )
  return {
    fee: totalFee.toString(),
    weight: totalWeight.toString(),
  }
}
