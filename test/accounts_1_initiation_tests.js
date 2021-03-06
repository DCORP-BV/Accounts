/* global assert, it, artifacts, contract, before */

/**
 * DCORP initiation tests
 *
 * Test the creation of an account through DCORP
 *
 * #created 20/02/2018
 * #author Frank Bonnet
 */

// Artifacts
var DCorpAccounts = artifacts.require('DCorpAccounts')
var MemberAccountShared = artifacts.require('DCorpMemberAccountShared')
var Token = artifacts.require('MockToken')

// Tools
var BigNumber = require('bignumber.js')
var Web3Factory = require('../modules/web3_factory')

// Modules
var web3 = Web3Factory.create({testrpc: true})
var time = require('../modules/time')
var util = require('../modules/util')
var dcorpUtil = require('../modules/dcorp_util.js')

// Config
var _config = require('../config')
var config = _config.network.test

contract('Accounts (Initiation)', function (accounts) {
  // Contracts
  let dcorpAccountsInstance
  let sharedAccountInstance
  let tokenInstance

  // Settings
  let tokenDecimals = 8

  before(async function () {
    dcorpAccountsInstance = await DCorpAccounts.deployed()
    sharedAccountInstance = MemberAccountShared.at(await dcorpAccountsInstance.shared.call())
    tokenInstance = await Token.new('Mock token 1', 'MTK1', tokenDecimals, false)
  })

  it('creates an account through dcorp', async function () {
    // Arrange
    let passphrase = '@@@ Some Random Passphrase @@@'
    let passphraseEncoded = web3.eth.abi.encodeParameter(
      'bytes32', web3.utils.fromAscii(passphrase))

    let accountCountBefore = await dcorpAccountsInstance.getAccountCount.call()

    // Act
    await dcorpAccountsInstance.createAccount(
      web3.utils.sha3(passphraseEncoded))

    let accountCountAfter = await dcorpAccountsInstance.getAccountCount.call()

    // Assert - Account count increased
    assert.isTrue(accountCountBefore.add(1).eq(accountCountAfter),
      'Account count should have been increased')
  })

  it('logs the creation of an account through dcorp', async function () {
    // Arrange
    let passphrase = '@@@ Some Random Passphrase @@@'
    let passphraseEncoded = web3.eth.abi.encodeParameter(
      'bytes32', web3.utils.fromAscii(passphrase))

    // Act
    let transaction = await dcorpAccountsInstance.createAccount(
      web3.utils.sha3(passphraseEncoded))

    // Event - Get event log
    let log = await dcorpUtil.accounts.events.created.getLog(dcorpAccountsInstance, transaction)
    let expectedLog = {
      event: 'AccountCreated',
      args: {
        account: log.args.account
      }
    }

    // Assert - Event log match
    await util.events.assert(dcorpAccountsInstance, expectedLog)
  })

  it('owner can set min ether withdraw amount', async function () {
    // Arrange
    let account = accounts[0]
    let newValue = new BigNumber(web3.utils.toWei('2', 'ether'))

    let before = new BigNumber(
      await sharedAccountInstance.minEtherWithdrawAmount.call())
    
    // Make sure we're not updating to the old value
    assert.isFalse(newValue.eq(before), 'Choose another value')

    // Act
    await sharedAccountInstance.setMinEtherWithdrawAmount(
      newValue, {from: account})

    let after = new BigNumber(
      await sharedAccountInstance.minEtherWithdrawAmount.call())

    // Assert
    assert.isTrue(after.eq(newValue), 'Value was not updated correctly')
  })

  it('non owner cannot set min ether withdraw amount', async function () {
    // Arrange
    let account = accounts[1]
    let newValue = new BigNumber(web3.utils.toWei('1', 'ether'))

    let before = new BigNumber(
      await sharedAccountInstance.minEtherWithdrawAmount.call())
    
    // Make sure we're not updating to the old value
    assert.isFalse(newValue.eq(before), 'Choose another value')

    // Act
    try {
      await sharedAccountInstance.setMinEtherWithdrawAmount(
        newValue, {from: account})
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not authenticate')
    }
    
    let after = new BigNumber(
      await sharedAccountInstance.minEtherWithdrawAmount.call())

    // Assert
    assert.isTrue(after.eq(before), 'Value was updated')
  })

  it('owner can set min token withdraw amount', async function () {
    // Arrange
    let account = accounts[0]
    let newValue = new BigNumber(25 * Math.pow(10, tokenDecimals))

    let before = new BigNumber(
      await sharedAccountInstance.getMinTokenWithdrawAmount.call(tokenInstance.address))
    
    // Make sure we're not updating to the old value
    assert.isFalse(newValue.eq(before), 'Choose another value')

    // Act
    await sharedAccountInstance.setMinTokenWithdrawAmount(
      tokenInstance.address, newValue, {from: account})

    let after = new BigNumber(
      await sharedAccountInstance.getMinTokenWithdrawAmount.call(tokenInstance.address))

    // Assert
    assert.isTrue(after.eq(newValue), 'Value was not updated correctly')
  })

  it('non owner cannot set min token withdraw amount', async function () {
    // Arrange
    let account = accounts[1]
    let newValue = new BigNumber(50 * Math.pow(10, tokenDecimals))

    let before = new BigNumber(
      await sharedAccountInstance.getMinTokenWithdrawAmount.call(tokenInstance.address))
    
    // Make sure we're not updating to the old value
    assert.isFalse(newValue.eq(before), 'Choose another value')

    // Act
    try {
      await sharedAccountInstance.setMinTokenWithdrawAmount(
        tokenInstance.address, newValue, {from: account})
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not authenticate')
    }
    
    let after = new BigNumber(
      await sharedAccountInstance.getMinTokenWithdrawAmount.call(tokenInstance.address))

    // Assert
    assert.isTrue(after.eq(before), 'Value was updated')
  })

  it('owner can set withdraw fee', async function () {
    // Arrange
    let account = accounts[0]
    let newValue = new BigNumber('50')

    let denominator = new BigNumber(await sharedAccountInstance.denominator.call())
    let before = new BigNumber(await sharedAccountInstance.withdrawFeePercentage.call())
    
    // Make sure we're not updating to the old value
    assert.isFalse(newValue.eq(before), 'Choose another value')

    // Act
    await sharedAccountInstance.setWithdrawFee(
      newValue, denominator, {from: account})

    let after = new BigNumber(
      await sharedAccountInstance.withdrawFeePercentage.call())

    // Assert
    assert.isTrue(after.eq(newValue), 'Value was not updated correctly')
  })

  it('non owner cannot set withdraw fee', async function () {
    // Arrange
    let account = accounts[1]
    let newValue = new BigNumber('200')

    let denominator = new BigNumber(await sharedAccountInstance.denominator.call())
    let before = new BigNumber(await sharedAccountInstance.withdrawFeePercentage.call())
    
    // Make sure we're not updating to the old value
    assert.isFalse(newValue.eq(before), 'Choose another value')

    // Act
    try {
      await sharedAccountInstance.setWithdrawFee(
        newValue, denominator, {from: account})
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not authenticate')
    }
    
    let after = new BigNumber(
      await sharedAccountInstance.withdrawFeePercentage.call())

    // Assert
    assert.isTrue(after.eq(before), 'Value was updated')
  })

  it('owner can set lock stake', async function () {
    // Arrange
    let account = accounts[0]
    let newValue = new BigNumber(web3.utils.toWei('250', 'finney'))

    let before = new BigNumber(
      await sharedAccountInstance.lockStake.call())
    
    // Make sure we're not updating to the old value
    assert.isFalse(newValue.eq(before), 'Choose another value')

    // Act
    await sharedAccountInstance.setLockStake(
      newValue, {from: account})

    let after = new BigNumber(
      await sharedAccountInstance.lockStake.call())

    // Assert
    assert.isTrue(after.eq(newValue), 'Value was not updated correctly')
  })

  it('non owner cannot set lock stake', async function () {
    // Arrange
    let account = accounts[1]
    let newValue = new BigNumber(web3.utils.toWei('50', 'finney'))

    let before = new BigNumber(
      await sharedAccountInstance.lockStake.call())
    
    // Make sure we're not updating to the old value
    assert.isFalse(newValue.eq(before), 'Choose another value')

    // Act
    try {
      await sharedAccountInstance.setLockStake(
        newValue, {from: account})
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not authenticate')
    }
    
    let after = new BigNumber(
      await sharedAccountInstance.lockStake.call())

    // Assert
    assert.isTrue(after.eq(before), 'Value was updated')
  })

  it('owner can set lock duration', async function () {
    // Arrange
    let account = accounts[0]
    let newValue = new BigNumber((5 * time.minutes).toString())

    let before = new BigNumber(
      await sharedAccountInstance.lockDuration.call())
    
    // Make sure we're not updating to the old value
    assert.isFalse(newValue.eq(before), 'Choose another value')

    // Act
    await sharedAccountInstance.setLockDuration(
      newValue, {from: account})

    let after = new BigNumber(
      await sharedAccountInstance.lockDuration.call())

    // Assert
    assert.isTrue(after.eq(newValue), 'Value was not updated correctly')
  })

  it('non owner cannot set lock duration', async function () {
    // Arrange
    let account = accounts[1]
    let newValue = new BigNumber((15 * time.minutes).toString())

    let before = new BigNumber(
      await sharedAccountInstance.lockDuration.call())
    
    // Make sure we're not updating to the old value
    assert.isFalse(newValue.eq(before), 'Choose another value')

    // Act
    try {
      await sharedAccountInstance.setLockDuration(
        newValue, {from: account})
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not authenticate')
    }
    
    let after = new BigNumber(
      await sharedAccountInstance.lockDuration.call())

    // Assert
    assert.isTrue(after.eq(before), 'Value was updated')
  })

  it('owner can add a node', async function () {
    // Arrange
    let account = accounts[0]
    let newNode = accounts[accounts.length - 1]

    let before = await sharedAccountInstance.isNode.call(newNode)
    
    // Make sure we're not updating to the old value
    assert.isFalse(before, 'Choose another address')

    // Act
    await sharedAccountInstance.addNode(
      newNode, true, 1, 1, 1, {from: account})

    let after = await sharedAccountInstance.isNode.call(newNode)

    // Assert
    assert.isTrue(after, 'Node was not added correctly')
  })

  it('non owner cannot add a node', async function () {
    // Arrange
    let account = accounts[1]
    let newNode = accounts[accounts.length - 2]

    let before = await sharedAccountInstance.isNode.call(newNode)
    
    // Make sure we're not updating to the old value
    assert.isFalse(before, 'Choose another address')

    // Act
    try {
      await sharedAccountInstance.addNode(
        newNode, true, 1, 1, 1, {from: account})
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not authenticate')
    }
    
    let after = await sharedAccountInstance.isNode.call(newNode)

    // Assert
    assert.isFalse(after, 'Node was added')
  })

  it('owner can remove a node', async function () {
    // Arrange
    let owner = accounts[0]
    let node = accounts[accounts.length - 3]

    await sharedAccountInstance.addNode(
      node, true, 1, 1, 1, {from: owner})

    let before = await sharedAccountInstance.isNode.call(node)
    
    // Address should be a valid node
    assert.isTrue(before, 'Invalid node')

    // Act
    await sharedAccountInstance.updateNode(
      node, false, 1, 1, 1, {from: owner})

    let after = await sharedAccountInstance.isNode.call(node)

    // Assert
    assert.isFalse(after, 'Node was not removed correctly')
  })

  it('non owner cannot remove a node', async function () {
    // Arrange
    let owner = accounts[0]
    let account = accounts[1]
    let node = accounts[accounts.length - 4]

    await sharedAccountInstance.addNode(
      node, true, 1, 1, 1, {from: owner})

    let before = await sharedAccountInstance.isNode.call(node)
  
    // Address should be a valid node
    assert.isTrue(before, 'Invalid node')

    // Act
    try {
      await sharedAccountInstance.updateNode(
        node, false, 1, 1, 1, {from: account})
      assert.isFalse(true, 'Error should have been thrown')
    } catch (error) {
      util.errors.throws(error, 'Should not authenticate')
    }
    
    let after = await sharedAccountInstance.isNode.call(node)

    // Assert
    assert.isTrue(after, 'Node was removed')
  })
})
