/* Snapshot history includes DOM annotations, article terms, and footnotes. */
(() => {
  if (typeof changed !== 'function' || typeof state !== 'function' || typeof TERMS === 'undefined') return;
  const snapshot = () => {
    const data = state();
    return JSON.stringify({bodyHTML: data.bodyHTML, terms: data.terms, footnotes: data.footnotes});
  };
  const history = [snapshot()];
  let position = 0, restoring = false;
  const buttons = [...document.querySelectorAll('[data-command="undo"], [data-command="redo"]')];
  const sync = () => buttons.forEach(button => {
    button.disabled = button.dataset.command === 'undo' ? position === 0 : position === history.length - 1;
  });
  const record = () => {
    if (restoring) return;
    const next = snapshot();
    if (next === history[position]) return;
    history.splice(position + 1);
    history.push(next);
    if (history.length > 100) history.shift();
    position = history.length - 1;
    sync();
  };
  const originalChanged = changed;
  changed = function(...args) { originalChanged(...args); record(); };
  // The editor's original input listener already holds the old function reference.
  editor.addEventListener('input', record);
  footnoteList.addEventListener('input', record);
  const move = direction => {
    record();
    const target = position + direction;
    if (target < 0 || target >= history.length) return;
    restoring = true;
    try {
      const data = JSON.parse(history[target]);
      TERMS.splice(0, TERMS.length, ...data.terms);
      loadState(data);
      savedRange = null;
      getSelection()?.removeAllRanges();
      position = target;
      originalChanged();
      if (typeof loadMediaRecords === 'function') loadMediaRecords();
    } finally { restoring = false; sync(); }
  };
  buttons.forEach(button => {
    button.addEventListener('mousedown', event => event.preventDefault());
    button.onclick = () => move(button.dataset.command === 'undo' ? -1 : 1);
  });
  document.addEventListener('keydown', event => {
    const target = event.target;
    if (target.closest?.('input,textarea') || !(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'z' || key === 'y') {
      event.preventDefault();
      move(key === 'y' || event.shiftKey ? 1 : -1);
    }
  });
  editor.addEventListener('beforeinput', event => {
    if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
      event.preventDefault();
      move(event.inputType === 'historyUndo' ? -1 : 1);
    }
  });
  // Repair only the exact old prepend bug: ruby(term) followed by term again.
  let repaired = false;
  editor.querySelectorAll('.notation[data-term] > .term-anchor').forEach(anchor => {
    const ruby = anchor.firstChild;
    if (ruby?.nodeName !== 'RUBY') return;
    const trailing = [...anchor.childNodes].slice(1);
    const base = ruby.cloneNode(true);
    base.querySelectorAll('rt,rp').forEach(node => node.remove());
    const term = anchor.parentElement.dataset.term;
    if (!term || base.textContent !== term || !trailing.length ||
        trailing.some(node => node.nodeType !== Node.TEXT_NODE) ||
        trailing.map(node => node.textContent).join('') !== term) return;
    trailing.forEach(node => node.remove());
    repaired = true;
  });
  if (repaired) changed();
  sync();
})();
