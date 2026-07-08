/**
 * Type declaration for the self-referencing subpath import used by
 * AppRenderer's lazy A2UI-renderer fallback. The actual module is emitted
 * at build time by scripts/emit-a2ui-renderer.mjs from the checked-in
 * a2ui-renderer.html artifact.
 */
declare module '@mcp-ui/client/a2ui-renderer' {
  /** Self-contained HTML of the bundled generic A2UI renderer. */
  export const A2UI_RENDERER_HTML: string;
}
