import * as viem from 'viem'
import { createApp, ref } from 'vue'
import erc20Json from './abi/MockERC20.json' with { type: "json" }
import * as dialog from './dialog.js'
import * as balloon from './balloon.js'
import * as util from './util.js'
import * as model from './model.js'

const addTokenPanel = createApp({
	setup() {
		function addToken() {
			dialog.showDialog('Add Token', 'Input token address:', addressConfirm)
		}
		
		return {
			addToken
		}
	}
}).mount('#addTokenPanel')


async function addressConfirm(input) {
	let tokenAddr = input.toLowerCase()
	if (!viem.isAddress(tokenAddr)) {
		setTimeout(dialog.showError, 500, 'Contract address error!')
		return
	}
	
	for (let token of model.chainInfo.tokens) {
		if (token.address == tokenAddr) {
			setTimeout(dialog.showError, 500, 'Token already exist!')
		}
	}
	
	let tokenWagmi = {
		address: tokenAddr,
		abi: erc20Json.abi
	}
	let arr = await model.publicClient.multicall({
		contracts: [
			{
				...tokenWagmi,
				functionName: 'symbol',
			},
			{
				...tokenWagmi,
				functionName: 'decimals',
			}
		],
	})
	console.log(arr)
	if (arr[0].status == 'failure') {
		dialog.showError('Token address error!')
		return
	}
	
	let symbol = arr[0].result
	let decimals = arr[1].result
	
	model.addToken({symbol, decimals, address: tokenAddr })
}