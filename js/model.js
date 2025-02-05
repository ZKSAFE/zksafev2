import * as viem from 'viem'
import { unichainSepolia } from 'viem/chains'
import config from './config.json' with { type: "json" }
import erc20Json from './abi/MockERC20.json' with { type: "json" }
import multicall3Json from './abi/Multicall3.json' with { type: "json" }
import factoryJson from './abi/SafeboxFactory.json' with { type: "json" }
import safeboxJson from './abi/Safebox.json' with { type: "json" }
import * as dialog from './dialog.js'


export var publicClient
export var walletClient
export var chainInfo
export var safeboxAddr
export var ownerAddr
export var safeboxTokens = []
export var ownerTokens = []

var balanceCalls
export async function reset(_chainInfo, _publicClient, _walletClient) {
	chainInfo = _chainInfo
	publicClient = _publicClient
	walletClient = _walletClient
	
	ownerAddr = walletClient.account.address
	
	await getSafeboxAddr()
	balanceCalls = []
	for (let token of chainInfo.tokens) {
		let tokenWagmi = {
			address: token.address,
			abi: erc20Json.abi
		}
		balanceCalls.push({ ...tokenWagmi, functionName: 'balanceOf', args:[safeboxAddr]})
		balanceCalls.push({ ...tokenWagmi, functionName: 'balanceOf', args:[ownerAddr]})
	}
	await getBalance()
}


export async function addToken(token) {
	let customChainInfo = localStorage.getItem('customChainInfo')
	if (customChainInfo) {
		customChainInfo = JSON.parse(customChainInfo)
	} else {
		customChainInfo = {}
		customChainInfo[chainInfo.chainId] = { tokens: [] }
	}
	
	customChainInfo[chainInfo.chainId].tokens.push(token)
	localStorage.setItem('customChainInfo', JSON.stringify(customChainInfo))
	
	chainInfo.tokens.push(token)
	
	let tokenWagmi = {
		address: token.address,
		abi: erc20Json.abi
	}
	balanceCalls.push({ ...tokenWagmi, functionName: 'balanceOf', args:[safeboxAddr]})
	balanceCalls.push({ ...tokenWagmi, functionName: 'balanceOf', args:[ownerAddr]})
	await getBalance()
}


async function getSafeboxAddr() {
	safeboxAddr = await publicClient.readContract({
		address: chainInfo.factoryAddr,
		abi: factoryJson.abi,
		args: [ownerAddr],
		functionName: 'getSafeboxAddr',
	})
	
	await dispatchEvent('GetSafeboxAddr', null)
}


export async function getBalance() {
	safeboxTokens.length = 0
	ownerTokens.length = 0
	
	let ethAmount = await publicClient.getBalance({ 
		address: safeboxAddr,
	})
	safeboxTokens.push({ symbol: chainInfo.nativeToken, address: '', amount: ethAmount, decimals: 18 })
	ethAmount = await publicClient.getBalance({ 
		address: ownerAddr,
	})
	ownerTokens.push({ symbol: chainInfo.nativeToken, address: '', amount: ethAmount, decimals: 18 })
	
	let arr = await publicClient.multicall({ contracts: balanceCalls })
	for (let i = 0; i < arr.length; i++) {
		let token = { ...chainInfo.tokens[Math.floor(i/2)] }
		token.amount = arr[i].result
		safeboxTokens.push(token)
		i++
		token = { ...token }
		token.amount = arr[i].result
		ownerTokens.push(token)
	}
	console.log(safeboxTokens, ownerTokens)
	await dispatchEvent('GetBalance', null)
}


let typeToListeners = {}
export function addEventListener(type, callback) {
	if (typeToListeners[type] == undefined) {
		typeToListeners[type] = []
	}
	let i = typeToListeners[type].indexOf(callback)
	if (i == -1) {
		typeToListeners[type].push(callback)
	}
}

export function removeEventListener(type, callback) {
	if (typeToListeners[type]) {
		let i = typeToListeners[type].indexOf(callback)
		if (i > -1) {
			typeToListeners[type].splice(i, 1)
		}
	}
}

async function dispatchEvent(type, arg) {
	if (typeToListeners[type]) {
		let e = { type, arg }
		for (let callback of typeToListeners[type]) {
			await callback(e)
		}
	}
}