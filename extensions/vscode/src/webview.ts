import * as vscode from 'vscode'

console.log('Activating webview')

export function getNonce() {
	let text = ''
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length))
	}
	return text
}

export async function getHtmlForWebview(
	webview: vscode.Webview,
	extensionUri: vscode.Uri,
	resource: any,
): Promise<string> {
	const nonce = getNonce()
	const webviewUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'index.js'),
	)
	const styleUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'index.css'),
	)

	const cspSource = webview.cspSource

	return /* html */ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="
              default-src 'none';
              style-src ${cspSource} 'unsafe-inline';
              script-src 'nonce-${nonce}';
              frame-src ${cspSource} https: vscode-webview:;
              connect-src ${cspSource};
          ">
          <link rel="stylesheet" href="${styleUri}">
          <title>MCP UI</title>
        </head>
        <body>
          <script nonce="${nonce}">
            window.initialResource = ${JSON.stringify(resource)};
          </script>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
        </body>
      </html>
    `
}
