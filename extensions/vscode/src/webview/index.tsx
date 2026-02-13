import { UIResourceRenderer } from '@mcp-ui/client'
import { createRoot } from 'react-dom/client'
import { useState } from 'react'

// The resource is injected into the HTML as a global variable.
const resource = (window as any).initialResource

const vscode = acquireVsCodeApi()

const App = () => {
	const state = vscode.getState() as { height: string }
	const [height, setHeight] = useState(state?.height || '420px')

	if (!resource) {
		return null
	}

	return (
		<div>
			<UIResourceRenderer
				resource={resource}
				htmlProps={{
					style: {
						height,
						width: '100%',
						border: 'none',
						display: 'block',
					},
				}}
				onUIAction={async (result: any) => {
					if (result.type === 'size-change' && result.payload?.height) {
						setHeight(`${result.payload.height}px`)
						vscode.setState({ height: `${result.payload.height}px` })
                        return
					}

					vscode.postMessage(result)
					return {
						status: 'handled',
					}
				}}
			/>
		</div>
	)
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
