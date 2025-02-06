import * as viem from 'viem'
import { encodePacked, keccak256 } from 'viem'
import { createApp, ref } from 'vue'
import erc20Json from './abi/MockERC20.json' with { type: "json" }
import zkpassJson from './abi/ZKPass.json' with { type: "json" }
import safeboxJson from './abi/Safebox.json' with { type: "json" }
import * as dialog from './dialog.js'
import * as balloon from './balloon.js'
import * as util from './util.js'
import * as zkUtil from './zkUtil.js'
import * as model from './model.js'

var targetToken
const balancePanel = createApp({
	setup() {
		const safeboxTokens = ref([])
		const ownerTokens = ref([])
		
		function deposit(token) {
			targetToken = token
			dialog.showDialog('Deposit to safebox', 'Input ' + token.symbol + ' amount:', depositConfirm)
		}
		
		function withdraw(token) {
			targetToken = token
			dialog.showDialog('Withdraw to owner', 'Input ' + token.symbol + ' amount:', withdrawConfirm)
		}
		
		function formatAmount(token) {
			let f = viem.formatUnits(token.amount, token.decimals)
			return util.maxPrecision(f, 8)
		}
		
		return {
			safeboxTokens, ownerTokens,
			deposit, withdraw,
			formatAmount
		}
	}
}).mount('#balancePanel')


async function depositConfirm(input) {
	let num = parseFloat(input)
	console.log(num, targetToken.decimals)
	let amount = viem.parseUnits(num.toString(), targetToken.decimals)
	
	console.log('depositConfirm model.walletClient:', model.walletClient)
	
	let hash
	if (targetToken.address == '') {
		hash = await model.walletClient.sendTransaction({ 
			account: model.walletClient.account,
			to: model.safeboxAddr,
			value: amount
		})
		
	} else {
		hash = await model.walletClient.writeContract({
			address: targetToken.address,
			abi: erc20Json.abi,
			functionName: 'transfer',
			args: [model.safeboxAddr, amount],
			account: model.walletClient.account
		})
	}
	
	let tx = await model.publicClient.waitForTransactionReceipt( 
		{ hash, confirmations: 2 }
	)
	if (tx.status == 'success') {
		balloon.show('Deposited', '', 1000)
		model.getBalance()
	} else {
		dialog.showError('Deposit Fail')
	}
}


async function withdrawConfirm(input) {
	let num = parseFloat(input)
	let amount = viem.parseUnits(num.toString(), targetToken.decimals)
	
	let pwdhash = await model.publicClient.readContract({
		address: model.chainInfo.zkpassAddr,
		abi: zkpassJson.abi,
		args: [model.ownerAddr],
		functionName: 'pwdhashOf',
	})
	pwdhash = pwdhash.toString()
	console.log('pwdhash:', pwdhash)
	
	let nonce = await model.publicClient.readContract({
		address: model.chainInfo.zkpassAddr,
		abi: zkpassJson.abi,
		args: [model.ownerAddr],
		functionName: 'nonceOf',
	})
	
	dialog.showDialog('Withdraw to owner', 'Input Safebox password:', pwdConfirm)
	
	async function pwdConfirm(pwd) {
		let chainId = model.chainInfo.chainId
		let hash
		if (targetToken.address == '') {
			let to = model.ownerAddr
			let datahash = keccak256(encodePacked(['uint256', 'address'], [amount, to]))
			let p = await zkUtil.getProof(chainId, pwd, to, nonce, datahash)
			
			if (p.pwdhash != pwdhash) {
				console.log('p.pwdhash:', p.pwdhash)
				dialog.showError('Wrong password!')
				return
			}
			
			hash = await model.walletClient.writeContract({
				address: model.safeboxAddr,
				abi: safeboxJson.abi,
				functionName: 'withdrawETH',
				args: [p.proof, amount, to, p.expiration, p.allhash],
				account: model.walletClient.account
			})
			
		} else {
			let tokenAddr = targetToken.address
			let to = model.ownerAddr
			let datahash = keccak256(encodePacked(['address', 'uint256', 'address'], [tokenAddr, amount, to]))
			let p = await zkUtil.getProof(chainId, pwd, to, nonce, datahash)
			
			if (p.pwdhash != pwdhash) {
				console.log('p.pwdhash:', p.pwdhash)
				dialog.showError('Wrong password!')
				return
			}
			
			hash = await model.walletClient.writeContract({
				address: model.safeboxAddr,
				abi: safeboxJson.abi,
				functionName: 'withdrawERC20',
				args: [p.proof, tokenAddr, amount, to, p.expiration, p.allhash],
				account: model.walletClient.account
			})
		}
		
		let tx = await model.publicClient.waitForTransactionReceipt(
			{ hash, confirmations: 2 }
		)
		if (tx.status == 'success') {
			balloon.show('Withdraw success', '', 1000)
			model.getBalance()
		} else {
			dialog.showError('Withdraw Fail')
		}
	}
}




function onGetBalance(e) {
	console.log('onGetBalance', e)
	balancePanel.safeboxTokens = []
	balancePanel.ownerTokens = []
	balancePanel.safeboxTokens = model.safeboxTokens
	balancePanel.ownerTokens = model.ownerTokens
}

model.addEventListener('GetBalance', onGetBalance)