import axe from 'axe-core';

/**
 * Runs axe-core on a mounted component and fails on any violation. jsdom has no layout or
 * painting, so colour contrast and target size are checked in a real browser instead (the dev UI
 * page under Playwright); everything structural (roles, names, ARIA, labels) is checked here.
 *
 * axe only scans nodes attached to the document, so a detached wrapper is audited as a copy.
 */
export async function expectNoA11yViolations(root: Element): Promise<void> {
  const host = document.createElement('div');
  document.body.append(host);
  const target = root.isConnected ? root : host.appendChild(root.cloneNode(true) as Element);
  try {
    const results = await axe.run(target, { rules: { 'color-contrast': { enabled: false } } });
    if (results.violations.length > 0) {
      const report = results.violations
        .map((v) => `${v.id}: ${v.help}\n${v.nodes.map((n) => `  ${n.html}`).join('\n')}`)
        .join('\n');
      throw new Error(`axe found ${results.violations.length} violation(s):\n${report}`);
    }
  } finally {
    host.remove();
  }
}
