import { encodePacked, keccak256 } from 'viem'
import vKey from './zk/verification_key.json' with { type: "json" }

export async function getProof(chainId, pwd, address, nonce, datahash) {
	let expiration = parseInt(Date.now() / 1000 + 600)
	let fullhash = keccak256(encodePacked(['uint256','uint256','uint256','uint256'], [expiration, chainId, nonce, datahash]))
	fullhash = (BigInt(fullhash) / 8n).toString() //must be 254b, not 256b

	let input = [stringToHex(pwd), address, fullhash]
	console.log('input:', input)
	let data = await snarkjs.groth16.fullProve({in:input}, './js/zk/circuit_js/circuit.wasm', './js/zk/circuit_final.zkey')

	const res = await snarkjs.groth16.verify(vKey, data.publicSignals, data.proof)

	if (res === true) {
		console.log('getProof OK')

		let pwdhash = data.publicSignals[0]
		let fullhash = data.publicSignals[1]
		let allhash = data.publicSignals[2]

		let proof = [
			'0x' + BigInt(data.proof.pi_a[0]).toString(16),
			'0x' + BigInt(data.proof.pi_a[1]).toString(16),
			'0x' + BigInt(data.proof.pi_b[0][1]).toString(16),
			'0x' + BigInt(data.proof.pi_b[0][0]).toString(16),
			'0x' + BigInt(data.proof.pi_b[1][1]).toString(16),
			'0x' + BigInt(data.proof.pi_b[1][0]).toString(16),
			'0x' + BigInt(data.proof.pi_c[0]).toString(16),
			'0x' + BigInt(data.proof.pi_c[1]).toString(16)
		]

		return { proof, pwdhash, address, expiration, chainId, nonce, datahash, fullhash, allhash }

	} else {
		console.log('Invalid proof')
	}
}


export function stringToHex(string) {
	let hexStr = '0x';
	for (let i = 0; i < string.length; i++) {
		let compact = string.charCodeAt(i).toString(16)
		hexStr += compact
	}
	return hexStr
}