import * as viem from 'viem'
import { createApp, ref } from 'vue'
import zkpassJson from './abi/ZKPass.json' with { type: "json" }
import factoryJson from './abi/SafeboxFactory.json' with { type: "json" }
import * as dialog from './dialog.js'
import * as balloon from './balloon.js'
import * as util from './util.js'
import * as zkUtil from './zkUtil.js'
import * as model from './model.js'


const addressPanel = createApp({
	setup() {
		const safeboxAddr = ref('..')
		const ownerAddr = ref('..')
		const needsActivate = ref(false)
		
		async function copy(type) {
			if (type == 'safebox') {
				await navigator.clipboard.writeText(model.safeboxAddr)
			} else {
				await navigator.clipboard.writeText(model.walletClient.account.address)
			}
			balloon.show('Copied', '', 1000)
		}
		
		function activate() {
			activateNext()
		}
		
		return {
			safeboxAddr, ownerAddr, needsActivate, copy, activate
		}
	}
}).mount('#addressPanel')


async function activateNext() {
	if (!(await isActivated())) {
		let hash = await model.walletClient.writeContract({
			address: model.chainInfo.factoryAddr,
			abi: factoryJson.abi,
			functionName: 'createSafebox',
			account: model.walletClient.account
		})
		console.log('activateNext hash:', hash)
	}
	
	if (!(await hasPwd())) {
		dialog.showDialog('', 'set your Safebox Password:', confirmPwd)
	} else {
		dialog.showTip('Activate success !')
	}
}


async function confirmPwd(pwd) {
	let chainId = model.chainInfo.chainId
	let nonce = '1'
	let datahash = '0'
	let p = await zkUtil.getProof(chainId, pwd, model.ownerAddr, nonce, datahash)
	
	await model.walletClient.writeContract({
		address: model.chainInfo.zkpassAddr,
		abi: zkpassJson.abi,
		functionName: 'resetPassword',
		args: [p.proof, 0, 0, p.proof, p.pwdhash, p.expiration, p.allhash],
		account: model.walletClient.account
	})

	dialog.showTip('Activate success !')
}


async function isActivated() {
	let safeboxAddr = await model.publicClient.readContract({
		address: model.chainInfo.factoryAddr,
		abi: factoryJson.abi,
		functionName: 'userToSafebox',
		args: [model.ownerAddr],
	})
	return safeboxAddr != util.ZERO_ADDRESS
}


async function hasPwd() {
	let nonce = await model.publicClient.readContract({
		address: model.chainInfo.zkpassAddr,
		abi: zkpassJson.abi,
		functionName: 'nonceOf',
		args: [model.ownerAddr],
	})
	// console.log('hasPwd nonce:', nonce)
	return nonce > 0n
}


async function onGetSafeboxAddr(e) {
	let addr = model.safeboxAddr
	addressPanel.safeboxAddr = addr.slice(0, 5) + '..' + addr.slice(-4)
	
	addr = viem.getAddress(model.walletClient.account.address)
	addressPanel.ownerAddr = addr.slice(0, 5) + '..' + addr.slice(-4)
	
	if ((await isActivated()) && (await  hasPwd())) {
		addressPanel.needsActivate = false
	} else {
		addressPanel.needsActivate = true
	}
}
model.addEventListener('GetSafeboxAddr', onGetSafeboxAddr)