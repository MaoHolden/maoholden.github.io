import assert from 'node:assert'
import Web3 from 'web3'
// import { isETHStrAddress } from './utils.js'
import * as queries from '../queries.js'
import logger from '../../../../lib/logger.js'
import { wallet } from '../../../../config.js'

// TODO: wait for x confirmations
// TODO: Handle Ethereum reorgs

const log = logger.child({ source: 'depositor/shibarium/daemon' })

const web3 = new Web3('https://www.shibrpc.com')

// Contract address of SHIBA INU Token
const shibContractAddress = '0x495eea66B0f8b636D441dC6a98d8F5C3D455C4c0'
  .toLowerCase()

const functionSignature = 'transfer(address,uint256)'

// if a transaction starts with this function selector its a ERC-20 transfer() call
// 0xa9059cbb
const functionSelector = web3.utils.keccak256(functionSignature).substring(
  0,
  10,
)

const LOG_EACH_BLOCKS = 8000

const AVERAGE_BLOCK_TIME = 5000

const PULL_INTERVAL = AVERAGE_BLOCK_TIME

// when error next pull internal is in x milliseconds
const ERROR_INTERVAL = 5000

let daemonOn = wallet.depositor.on

let timeoutId = null

let errorCount = 0

export const toggleDaemon = () => {
  daemonOn = !daemonOn

  if (daemonOn) {
    startBlockLoop()
  } else {
    clearTimeout(timeoutId)
  }
}

// Initialize with last block in db
let lastBlockCount = -1

if (daemonOn) {
  log.info({
    msg: 'starting Shibarium daemon',
    AVERAGE_BLOCK_TIME,
    ERROR_INTERVAL,
  })
  startBlockLoop()
}

async function startBlockLoop() {
  log.debug({ msg: 'initializing blook loop with last db block' })

  try {
    const lastBlock = await queries.getLastBlock()
    log.debug({ msg: 'lastBlock fetched db', lastBlock })
    lastBlockCount = lastBlock.height

    blockLoop()
  } catch (err) {
    log.error({ err, notice: 'failed to start block loop' })
    // crash the server on fail
    throw err
  }
}

// lapse = pull | error | immediate
function scheduleBlockLoop(lapse) {
  if (!daemonOn) {
    log.debug({ msg: 'stopping block loop, next block loop not scheduled' })
    return
  }

  const times = {
    pull: PULL_INTERVAL,
    error: ERROR_INTERVAL,
    immediate: 1,
  }
  const time = times[lapse]
  assert(time)
  log.debug({ msg: `scheduling blook loop in ${time}` })

  // TEMPORARY
  if (lapse === ERROR_INTERVAL) {
    log.info({ msg: 'retry disabled, stopping daemon' })
    return
  }

  log.debug({ msg: `next pull scheduled in ${time}` })
  setTimeout(blockLoop, time)
}

async function blockLoop() {
  const logf = log.child({ fn: 'blockLoop' })
  // let depositsFound

  try {
    // try fetching next block
    let nextBlock = undefined
    let nextBlockCount = lastBlockCount + 1
    try {
      nextBlock = await web3.eth.getBlock(nextBlockCount, true)
    } catch (err) {
      scheduleBlockLoop('error')
      return
    }

    if (!nextBlock) {
      // logf.debug({
      //   msg: 'no new block, scheduling pull for later',
      //   lastBlockCount,
      // })
      scheduleBlockLoop('pull')
      return
    }

    // logf.debug({
    //   msg: 'fetched new block',
    //   nextBlockCount,
    //   nextBlockHash: nextBlock?.hash,
    // })

    await processBlock(nextBlock)

    await queries.insertBlock(nextBlockCount)
    lastBlockCount = nextBlockCount

    if (lastBlockCount % LOG_EACH_BLOCKS === 0) {
      logf.notif({ msg: `Block ${lastBlockCount} processed sucessfully` })
    }
  } catch (err) {
    // TODO: check this comments
    // if the error is while processing txs some could be process and some could not be
    // we just reprocess the block again, anyway is recommended to manually check
    // block transactions in db
    //
    // if the error is while inserting block in db, we need to manually introduce it
    //
    // TODO: Detect network timeouts and network errors

    errorCount++

    // calls sometimes fail due to network issues
    log.error({
      err,
      notice:
        `failed to process block, scheduling next try in ${ERROR_INTERVAL}`,
      lastBlockCount,
      errorCount,
    })

    scheduleBlockLoop('error')

    return
  }

  // all good, process next block immediately
  // log.info({
  //   msg: 'block processed sucessfully',
  //   depositsFound,
  //   blockHeight: lastBlockCount,
  // })
  scheduleBlockLoop('immediate')
}

/**
 * @param {Object} block - hydrated block
 * if there's any error just throw and block will be re-processed
 *
 * TODO: if this functions fails we need to take urgent action
 * is there any way to make it more important?
 * for the time being it should be an error and we treat any error as bug
 */
async function processBlock(block) {
  const logf = log.child({ fn: 'processBlock' })

  // logf.debug({ msg: 'processing block' })

  const startDate = Date.now()
  let depositsFoundAmount = 0

  if (!block.transactions?.length) {
    return
  }

  try {
    for (const shibTx of block.transactions) {
      // found ERC-20 transfer() call
      if (shibTx.input?.toLowerCase().startsWith(functionSelector)) {
        // TODO: do all transactions have a to?
        if (!shibTx.to) {
          logf.warn({ msg: 'found transaction without to', shibTx })
          continue
        }

        if (shibTx.to.toLowerCase() === shibContractAddress) {
          // decode the address and the amount from the contract using eth ABI since its mostly the same
          const decodedData = web3.eth.abi.decodeParameters([
            'address',
            'uint256',
          ], shibTx.input.slice(10))

          const recipientAddress = decodedData[0]
          const amountTransferredWei = decodedData[1]
          assert(typeof amountTransferredWei === 'bigint')

          const userAddress = await queries.getUserAddress(recipientAddress)

          // if address belong to one of our users :) create a deposit
          if (userAddress) {
            assert(userAddress.user_id)

            const amountInShib = web3.utils.fromWei(
              amountTransferredWei,
              'ether',
            )
            assert(typeof amountInShib === 'string')

            logf.notif({
              msg: 'recieved user deposit',
              userId: userAddress.user_id,
              amountInShib,
            })

            await queries.addDeposit(
              userAddress.user_id,
              shibTx.hash,
              amountTransferredWei,
            )

            depositsFoundAmount++
          }
        }
      }
    }
  } catch (err) {
    const seconds = (Date.now() - startDate) / 1000
    log.error({
      err,
      notice: 'error processing transaction ids',
      secondsSpent: seconds,
    })
    throw err
  }

  //const seconds = (new Date() - startDate) / 1000
  //log.debug({
  //  msg: `processed ${transactionsIds.length}`,
  //  secondsSpent: seconds,
  //})

  return depositsFoundAmount
}
