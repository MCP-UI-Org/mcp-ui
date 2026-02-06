import { createUIResource } from '@mcp-ui/server'
import * as vscode from 'vscode'
import { getHtmlForWebview } from './webview'

const mime = 'application/vnd.chat-output-renderer.mcp-ui'

console.log('Activating extension')

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.lm.registerTool<{ url: string }>('renderUrl', {
			invoke: async (options) => {
				console.log('Invoking renderUrl with options:', options)
				const resource = createUIResource({
					uri: `ui://mcp-ui-sample/${new Date().getTime()}`,
					content: {
						type: 'externalUrl',
						iframeUrl: options.input.url,
					},
					encoding: 'text',
				})

				const result = new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Rendering URL: ${options.input.url}`)]);
				(result as vscode.ExtendedLanguageModelToolResult2).toolResultDetails2 = {
					mime,
					value: new TextEncoder().encode(JSON.stringify(resource)),
				}

				console.log('Created UI resource:', result)
				return result
			},
		}),
	)
	console.log('Tool registered successfully')

	const participant = vscode.chat.createChatParticipant('mcp-ui.toolInvoker', async (request, context, response, token) => {
		const models = await vscode.lm.selectChatModels({ family: 'gpt-4o' })
		const model = models?.[0]
		if (!model) {
			response.markdown('No suitable language model found.')
			return {}
		}

		const messages = [
			vscode.LanguageModelChatMessage.User(request.prompt),
		]

		const chatResponse = await model.sendRequest(messages, {}, token)

		for await (const fragment of chatResponse.stream) {
			if (token.isCancellationRequested) {
				break
			}
			// The fragment is a union type, so we need to check its type
			if ((fragment as any)?.value && typeof (fragment as any).value === 'string') {
				response.markdown((fragment as any).value)
			}
		}

		return {}
	})
	context.subscriptions.push(participant)

	context.subscriptions.push(
		(vscode.chat as any).registerChatOutputRenderer(mime, {
			async renderChatOutput(data: any, webview: vscode.Webview, _ctx: vscode.CancellationToken, _token: vscode.CancellationToken) {
				(webview as any).options = {
					enableScripts: true,
					retainContextWhenHidden: true,
					localResourceRoots: [
						vscode.Uri.joinPath(context.extensionUri, 'out'),
					],
				}

				const decoded = new TextDecoder().decode(data)
				const resourceData = JSON.parse(decoded)

				// Pass the resource directly into the HTML to avoid postMessage race conditions.
				webview.html = await getHtmlForWebview(webview, context.extensionUri, resourceData.resource)

				webview.onDidReceiveMessage(async (message: any) => {
					console.log('Received message from webview:', message)
					switch (message.type) {
						case 'link':
							await vscode.env.openExternal(vscode.Uri.parse(message.payload.url))
							vscode.window.showInformationMessage(`Opened external link: ${message.payload.url}`)
							break
						case 'notify':
							vscode.window.showInformationMessage(message.payload.message)
							break
						case 'tool':
							{
								const { toolName, params } = message.payload
								const prompt = `Call the tool ${toolName} with the following parameters: ${JSON.stringify(params)}. If the response is an EmbeddedResource with URL, render it in the chat.`

								await vscode.commands.executeCommand(
									'workbench.action.chat.open',
									prompt,
								)

								vscode.window.showInformationMessage(`Sent tool request to chat: ${toolName}`)
							}
							break
						case 'intent':
							{
								const { intent, params } = message.payload
								let prompt = `The user expressed intent to ${intent} with the following parameters: ${JSON.stringify(params)}`

								// TODO remove after demo
								if (intent === 'view_details') {
									prompt = 'renderUrl https://cdn.shopify.com/storefront/product-details.component?store_domain=aloyoga.com&product_handle=w2783r-washed-alosoft-sweet-talker-tank-cool-grey-wash&inline=true'
								}

								await vscode.commands.executeCommand(
									'workbench.action.chat.open',
									prompt,
								)

								vscode.window.showInformationMessage(`Sent intent to chat: ${intent}`)
							}
							break
						case 'prompt':
							{
								const { prompt } = message.payload

								await vscode.commands.executeCommand(
									'workbench.action.chat.open',
									prompt,
								)

								vscode.window.showInformationMessage(`Sent prompt to chat`)
							}
							break
					}
				})
			},
		}),
	)
}
