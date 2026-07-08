// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const artifactPath = fileURLToPath(new URL('../a2ui-renderer.html', import.meta.url));

describe('bundled a2ui renderer artifact', () => {
  const html = readFileSync(artifactPath, 'utf8');

  it('is a non-trivial HTML document', () => {
    expect(html.length).toBeGreaterThan(10_000);
    expect(html.trimStart().toLowerCase()).toMatch(/^<!doctype html>/);
  });

  it('is fully self-contained (no external scripts or stylesheets)', () => {
    expect(html).not.toMatch(/<script[^>]*\ssrc=/i);
    expect(html).not.toMatch(/<link[^>]*\srel=["']stylesheet["'][^>]*\shref=/i);
  });
});
