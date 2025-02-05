import { createApp, ref } from 'vue'
import * as viem from 'viem'
			
const dialog = createApp({
	setup() {
		const title = ref('ATTENTION')
		const content = ref('This is content')
		const userInput = ref('')
		const hasCancel = ref(true)
		const hasInput = ref(true)
		
		function onConfirm() {
			onConfirmFunc && onConfirmFunc(userInput.value.toString())
		}
		
		return {
			title, content, userInput, hasCancel, hasInput, onConfirm
		}
	}
}).mount('#dialog-rounded')


export function showError(content) {
	dialog.title = 'ERROR:'
	dialog.content = content
	dialog.hasCancel = false
	dialog.hasInput = false
	onConfirmFunc = null
	document.getElementById('dialog-rounded').showModal()
}


export function showTip(content) {
	dialog.title = 'TIP:'
	dialog.content = content
	dialog.hasCancel = false
	dialog.hasInput = false
	onConfirmFunc = null
	document.getElementById('dialog-rounded').showModal()
}

var onConfirmFunc
export function showDialog(title, content, onConfirm) {
	dialog.title = title
	dialog.content = content
	dialog.hasCancel = true
	dialog.hasInput = true
	dialog.userInput = ''
	onConfirmFunc = onConfirm
	document.getElementById('dialog-rounded').showModal()
}