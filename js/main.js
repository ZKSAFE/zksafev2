import { createApp, ref, toRef } from 'vue'
import * as viem from 'viem'
import { mainnet, optimism, arbitrum, bsc, polygon } from 'viem/chains'
import config from './config.json' with { type: "json" }
import * as dialog from './dialog.js'
import * as balloon from './balloon.js'
import * as util from './util.js'
import * as model from './model.js'
import * as addressPanel from './addressPanel.js'
import * as balancePanel from './balancePanel.js'
import * as addTokenPanel from './addTokenPanel.js'


for (let id in config) {
	let tokens = config[id].tokens
	for (let token of tokens) {
		token.address = token.address.toLowerCase()
	}
}
let customChainInfo = localStorage.getItem('customChainInfo')
console.log('customChainInfo:', customChainInfo)
if (customChainInfo) {
	customChainInfo = JSON.parse(customChainInfo)
	for (let chainId in customChainInfo) {
		let tokens = customChainInfo[chainId].tokens
		if (config[chainId]) {
			config[chainId].tokens = config[chainId].tokens.concat(tokens)
		}
	}
}
	
var currChain = mainnet
currChain.info = config['1']

var publicClient
var walletClient

window.onload = async () => {
	const accounts = await window.ethereum.request({
		method: 'eth_accounts'
	})
	if (accounts.length > 0) {
		await createConnect()
	}
}

const titlePanel = createApp({
	setup() {
		const connect = ref('Connect')
		
		return {
			connect,
			onConnectBtn: createConnect,
			onSelectChain: switchChain
		}
	}
}).mount('#titlePanel')


async function switchChain(e) {
	let chainInfo = config[e.target.value]
	if (chainInfo == undefined) {
		dialog.showError('ChainInfo error:' + e.target.value)
		return
	}
	switch (e.target.value){
		case '1':
			currChain = mainnet
			break
		case '10':
			currChain = optimism
			break	
		case '42161':
			currChain = arbitrum
			break	
		case '56':
			currChain = bsc
			break	
		case '137':
			currChain = polygon
			break
		default:
			dialog.showError('ChainInfo error:' + e.target.value)
			return
	}
	console.log('chainInfo:', chainInfo, 'currChain:', currChain)
	currChain.info = chainInfo
	await createConnect()
}


async function createConnect() {
	if (window.ethereum == undefined) {
		dialog.showError('It seems that you dont have wallet extension..')
	}
	
	util.loading(toRef(titlePanel, 'connect'), 'Connect *')
	
	try {
		publicClient = viem.createPublicClient({
			chain: currChain,
			transport: viem.http()
		})
		
		if (walletClient) {
			const [address] = await window.ethereum.request({
				method: "wallet_requestPermissions",
				params: [{
					eth_accounts: {}
				}]
			}).then(() => ethereum.request({
				method: 'eth_requestAccounts'
			}))
		
			walletClient = viem.createWalletClient({
				account: address,
				chain: currChain,
				transport: viem.custom(window.ethereum)
			})
		
		} else {
			const [address] = await window.ethereum.request({
				method: 'eth_requestAccounts'
			})
			walletClient = viem.createWalletClient({
				account: address,
				chain: currChain,
				transport: viem.custom(window.ethereum)
			})
		}
		
		await window.ethereum.request({
			method: "wallet_switchEthereumChain",
			params: [{
				chainId: '0x' + currChain.id.toString(16)
			}]
		})
	} catch(e) {
		dialog.showError('Connect wallet failed')
		titlePanel.connect = 'Connect'
		return
	}

	await model.reset(currChain.info, publicClient, walletClient)
	updateView()
}


function updateView() {
	let user = viem.getAddress(walletClient.account.address)
	let addr = user.slice(0, 5) + '..' + user.slice(-4)
	titlePanel.connect = addr
}