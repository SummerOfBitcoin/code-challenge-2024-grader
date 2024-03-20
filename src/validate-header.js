const {generateMerkleRoot} = require('./utils')
const {createHash} = require('crypto')
const difficulty = Buffer.from('0000ffff00000000000000000000000000000000000000000000000000000000', 'hex')

/**
 * validate block header
 *
 * @param {string} header block header
 * @param {string[]} txids transaction ids
 * @returns {void} throws error if header is invalid
 */

export const validateHeader = (header, txids) => {
  const headerBuffer = Buffer.from(header, 'hex')
  if (headerBuffer.length !== 80) throw new Error('Invalid header length')

  // double SHA256 and reverse
  const h1 = createHash('sha256').update(headerBuffer).digest()
  const h2 = createHash('sha256').update(h1).digest()
  const hash = h2.reverse()

  if (difficulty.compare(hash) < 0) throw new Error('Block does not meet target difficulty')

  const version = headerBuffer.readUInt32LE(0)
  if (version < 4) throw new Error('Invalid block version')

  const prevBlock = headerBuffer.subarray(4, 36).reverse()
  if (difficulty.compare(prevBlock) < 0) throw new Error('Invalid previous block hash')

  const merkleRoot = headerBuffer.subarray(36, 68).toString('hex')
  if (merkleRoot !== generateMerkleRoot(txids)) throw new Error('Invalid merkle root')

  const time = headerBuffer.readUInt32LE(68)
  if (time > Math.floor(Date.now() / 1000) + 2 * 60 * 60) throw new Error('Invalid block time')
  if (time < Math.floor(Date.now() / 1000) - 2 * 60 * 60) throw new Error('Invalid block time')

  const bits = headerBuffer.readUInt32LE(72)
  if (bits !== 0x1f00ffff) throw new Error('Invalid bits')

  const nonce = headerBuffer.readUInt32LE(76)
  if (nonce < 0x0 || nonce > 0xffffffff) throw new Error('Invalid nonce')
}