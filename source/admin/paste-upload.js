(() => {
  const EDITOR_SELECTOR = '[data-slate-editor="true"], textarea';
  const TOAST_ID = 'paste-upload-toast';
  const HELPER_CLASS = 'paste-upload-helper';
  const RAW_TOOLBAR_CLASS = 'codex-raw-toolbar';
  const SELECTED_IMAGE_CLASS = 'decap-editor-image-selected';
  const DECORATED_BUTTON_ATTR = 'data-admin-button';
  const RAW_TOOLBAR_ACTIONS = [
    { action: 'bold', aria: 'Bold', html: '<strong>B</strong>' },
    { action: 'italic', aria: 'Italic', html: '<em>I</em>' },
    { action: 'strikethrough', aria: 'Strikethrough', html: '<span>S</span>' },
    { action: 'code', aria: 'Code', html: '<code>&lt;/&gt;</code>' },
    { action: 'link', aria: 'Link', html: 'Link' },
    { action: 'heading', aria: 'Heading', html: 'H2' },
    { action: 'quote', aria: 'Quote', html: '"' },
    { action: 'bulleted list', aria: 'Bulleted List', html: '• List' },
    { action: 'numbered list', aria: 'Numbered List', html: '1. List' },
    { action: 'image', aria: 'Image', html: 'Image' }
  ];
  let lastFocusedEditor = null;
  let lastTextareaSelection = { start: 0, end: 0 };

  const extByType = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg'
  };

  const normalizeErrorMessage = message => {
    const text = String(message || '').trim();

    if (!text) return '图片上传失败';
    if (/Unauthorized/i.test(text)) {
      return '登录状态已失效，请刷新后台后重新登录。';
    }

    return text;
  };

  const showToast = (message, type = 'info', sticky = false) => {
    let toast = document.getElementById(TOAST_ID);

    if (!toast) {
      toast = document.createElement('div');
      toast.id = TOAST_ID;
      toast.className = 'paste-upload-toast';
      document.body.appendChild(toast);
    }

    toast.dataset.type = type;
    toast.textContent = message;

    if (!sticky) {
      window.clearTimeout(showToast.timer);
      showToast.timer = window.setTimeout(() => {
        toast.remove();
      }, type === 'success' ? 2600 : 3400);
    }
  };

  const toDataUrl = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('无法读取剪贴板图片'));
    reader.readAsDataURL(file);
  });

  const safeName = (name, fallbackExt) => {
    const base = (name || `paste-${Date.now()}.${fallbackExt}`)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9._-]/g, '');

    return base || `paste-${Date.now()}.${fallbackExt}`;
  };

  const formatBytes = size => {
    if (!Number.isFinite(size) || size <= 0) return '0 B';
    const units = ['B', 'KB', 'MB'];
    let value = size;
    let index = 0;

    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index += 1;
    }

    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
  };

  const normalizeButtonText = value =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const isVisibleElement = element => {
    if (!(element instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.offsetParent !== null;
  };

  const isEditableTarget = target => {
    if (!(target instanceof Element)) return null;
    return target.closest(EDITOR_SELECTOR);
  };

  const rememberEditor = target => {
    const editor = isEditableTarget(target);
    if (editor) {
      lastFocusedEditor = editor;
      if (editor instanceof HTMLTextAreaElement) {
        lastTextareaSelection = {
          start: editor.selectionStart ?? 0,
          end: editor.selectionEnd ?? 0
        };
      }
    }
    return editor;
  };

  const rememberTextareaSelection = textarea => {
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    lastTextareaSelection = {
      start: textarea.selectionStart ?? 0,
      end: textarea.selectionEnd ?? 0
    };
  };

  const restoreTextareaSelection = textarea => {
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    textarea.focus();
    textarea.setSelectionRange(lastTextareaSelection.start ?? 0, lastTextareaSelection.end ?? 0);
  };

  const insertTextIntoTextarea = (textarea, text) => {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    textarea.setRangeText(text, start, end, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.focus();
    return true;
  };

  const wrapTextareaSelection = (textarea, before, after = before, placeholder = '') => {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const selected = textarea.value.slice(start, end);
    const content = selected || placeholder;
    const insert = `${before}${content}${after}`;

    textarea.setRangeText(insert, start, end, 'end');
    const cursor = selected ? start + insert.length : start + before.length + content.length;
    textarea.setSelectionRange(cursor, cursor);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.focus();
    return true;
  };

  const transformTextareaLines = (textarea, transformer) => {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const value = textarea.value;
    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const lineEndIdx = value.indexOf('\n', end);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const block = value.slice(lineStart, lineEnd);
    const lines = block.split('\n');
    const next = lines.map(transformer).join('\n');

    textarea.setRangeText(next, lineStart, lineEnd, 'end');
    textarea.setSelectionRange(lineStart, lineStart + next.length);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.focus();
    return true;
  };

  const insertTextareaLink = textarea => {
    const href = window.prompt('输入链接 URL');
    if (!href) return false;

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const selected = textarea.value.slice(start, end) || 'link';
    const insert = `[${selected}](${href})`;

    textarea.setRangeText(insert, start, end, 'end');
    textarea.setSelectionRange(start + insert.length, start + insert.length);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.focus();
    return true;
  };

  const insertIntoContentEditable = (editable, url) => {
    const markdown = `\n\n![](${url})\n\n`;

    if (document.queryCommandSupported && document.queryCommandSupported('insertImage')) {
      try {
        if (document.execCommand('insertImage', false, url)) {
          editable.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }));
          editable.focus();
          return true;
        }
      } catch (error) {
        console.warn('insertImage failed', error);
      }
    }

    if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
      try {
        if (document.execCommand('insertText', false, markdown)) {
          editable.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: markdown }));
          editable.focus();
          return true;
        }
      } catch (error) {
        console.warn('insertText failed', error);
      }
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(markdown);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    editable.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: markdown }));
    editable.focus();
    return true;
  };

  const insertUploadedImage = (editor, url) => {
    if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
      return insertTextIntoTextarea(editor, `\n\n![](${url})\n\n`);
    }

    if (editor instanceof HTMLElement) {
      return insertIntoContentEditable(editor, url);
    }

    return false;
  };

  const pickNearestTextarea = (root, anchorBox) => {
    const textareas = Array.from(root.querySelectorAll('textarea'))
      .filter(node => node instanceof HTMLTextAreaElement && isVisibleElement(node));

    if (textareas.length === 0) return null;
    if (!anchorBox) return textareas[0];

    return textareas
      .map(textarea => {
        const box = textarea.getBoundingClientRect();
        const dx = Math.abs(box.left - anchorBox.left);
        const dy = Math.abs(box.top - anchorBox.top);
        const dw = Math.abs(box.width - anchorBox.width) / 4;
        return { textarea, score: dx + dy * 2 + dw };
      })
      .sort((a, b) => a.score - b.score)[0]?.textarea || null;
  };

  const waitForTextarea = (root, anchorBox, timeout = 1500) => new Promise(resolve => {
    const start = Date.now();

    const tick = () => {
      const textarea = pickNearestTextarea(root, anchorBox);

      if (textarea instanceof HTMLTextAreaElement) {
        resolve(textarea);
        return;
      }

      if (Date.now() - start >= timeout) {
        resolve(null);
        return;
      }

      window.setTimeout(tick, 50);
    };

    tick();
  });

  const stopNativeHandling = event => {
    event.preventDefault();
    event.stopPropagation();

    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
  };

  const isRichTextEditor = editor =>
    editor instanceof HTMLElement &&
    editor.matches('[data-slate-editor="true"]');

  const dispatchEditorInput = (editor, inputType, data = '') => {
    if (!(editor instanceof HTMLElement)) return;

    try {
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType, data }));
    } catch (error) {
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }

    editor.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const clearSelectedEditorImages = scope => {
    const root = scope instanceof Element ? scope : document;
    root.querySelectorAll(`img.${SELECTED_IMAGE_CLASS}`).forEach(image => {
      image.classList.remove(SELECTED_IMAGE_CLASS);
    });
  };

  const placeCaretNearNode = (editor, node, preferAfter = true) => {
    if (!(editor instanceof HTMLElement)) return;

    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();

    if (node instanceof Text) {
      const offset = preferAfter ? node.textContent.length : 0;
      range.setStart(node, offset);
      range.collapse(true);
    } else if (node instanceof Element && node !== editor) {
      if (preferAfter) {
        range.setStartAfter(node);
      } else {
        range.setStartBefore(node);
      }
      range.collapse(true);
    } else {
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    selection.removeAllRanges();
    selection.addRange(range);
    editor.focus();
  };

  const selectEditorImage = image => {
    const editor = image?.closest?.('[data-slate-editor="true"]');
    if (!(editor instanceof HTMLElement) || !(image instanceof HTMLImageElement)) return false;

    clearSelectedEditorImages(editor);
    image.classList.add(SELECTED_IMAGE_CLASS);
    image.setAttribute('tabindex', '-1');
    placeCaretNearNode(editor, image, true);
    return true;
  };

  const removeSelectedEditorImage = (editor, direction = 'backward') => {
    if (!(editor instanceof HTMLElement)) return false;

    const image = editor.querySelector(`img.${SELECTED_IMAGE_CLASS}`);
    if (!(image instanceof HTMLImageElement)) return false;

    const focusNode = direction === 'forward'
      ? image.nextSibling || image.previousSibling || editor
      : image.previousSibling || image.nextSibling || editor;

    image.remove();
    clearSelectedEditorImages(editor);
    placeCaretNearNode(editor, focusNode, direction !== 'forward');
    dispatchEditorInput(editor, direction === 'forward' ? 'deleteContentForward' : 'deleteContentBackward');
    return true;
  };

  const getSelectionElement = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const node = selection.anchorNode || selection.getRangeAt(0).startContainer;
    if (node instanceof Element) return node;
    return node?.parentElement || null;
  };

  const getCurrentRichTextEditor = target => {
    const active = document.activeElement instanceof Element ? document.activeElement : null;
    const direct = isEditableTarget(target) || active?.closest?.('[data-slate-editor="true"]') || lastFocusedEditor;
    return direct instanceof HTMLElement && isRichTextEditor(direct) ? direct : null;
  };

  const isRiskyRichTextDelete = editor => {
    if (!(editor instanceof HTMLElement) || !isRichTextEditor(editor)) return false;

    const element = getSelectionElement();
    if (!(element instanceof Element)) return false;
    if (!editor.contains(element)) return false;

    const listItem = element.closest('li, ul, ol');
    if (listItem instanceof HTMLElement) return true;

    const slateElement = element.closest('[data-slate-node="element"]');
    if (slateElement instanceof HTMLElement) {
      if (slateElement.querySelector('br')) return true;
      if (slateElement.previousElementSibling || slateElement.nextElementSibling) return true;
    }

    return false;
  };

  const switchRichTextEditorToMarkdown = editor => {
    if (!(editor instanceof HTMLElement)) return false;

    const root = editor.closest('main, [data-testid="editor"], form') || document;
    const editorBox = editor.getBoundingClientRect();
    const toggles = Array.from(root.querySelectorAll('button[role="switch"]'))
      .filter(button => isVisibleElement(button))
      .map(button => {
        const box = button.getBoundingClientRect();
        const dx = Math.abs(box.left - editorBox.left);
        const dy = Math.abs(box.top - editorBox.top);
        return { button, score: dx + dy * 2 };
      })
      .sort((a, b) => a.score - b.score);

    const toggle = toggles[0]?.button;
    if (!(toggle instanceof HTMLButtonElement)) return false;

    const checked = toggle.getAttribute('aria-checked');
    if (checked === 'false') return true;

    toggle.click();
    return true;
  };

  const insertUploadedImageReliably = async (editor, url) => {
    if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
      return insertUploadedImage(editor, url);
    }

    if (!isRichTextEditor(editor)) {
      return insertUploadedImage(editor, url);
    }

    const root = editor.closest('main, [data-testid="editor"], form') || document;
    const anchorBox = editor.getBoundingClientRect();
    const switched = switchRichTextEditorToMarkdown(editor);
    if (!switched) return false;

    const textarea = await waitForTextarea(root, anchorBox);
    if (!(textarea instanceof HTMLTextAreaElement)) return false;

    rememberEditor(textarea);
    restoreTextareaSelection(textarea);
    return insertUploadedImage(textarea, url);
  };

  const guardDangerousRichTextDelete = event => {
    const inputType = event.inputType || '';
    const isDeleteKey = event.key === 'Backspace' || event.key === 'Delete';
    const isDeleteInput = inputType === 'deleteContentBackward' || inputType === 'deleteContentForward';

    if (!isDeleteKey && !isDeleteInput) return false;

    const editor = getCurrentRichTextEditor(event.target);
    if (!(editor instanceof HTMLElement)) return false;

    const removed = isDeleteKey
      ? removeSelectedEditorImage(editor, event.key === 'Delete' ? 'forward' : 'backward')
      : false;

    if (removed) {
      stopNativeHandling(event);
      return true;
    }

    if (!isRiskyRichTextDelete(editor)) return false;

    stopNativeHandling(event);
    const switched = switchRichTextEditorToMarkdown(editor);
    showToast(
      switched
        ? 'Rich Text 在列表里按删除键会触发编辑器崩溃，已自动切到 Markdown。'
        : 'Rich Text 在列表里按删除键会触发编辑器崩溃，请切到 Markdown 后再删除。',
      'error',
      true
    );
    return true;
  };

  const decorateEditorImages = scope => {
    const root = scope instanceof Element ? scope : document;
    root.querySelectorAll('[data-slate-editor="true"] img').forEach(image => {
      image.classList.add('decap-editor-inline-image');
      image.setAttribute('draggable', 'false');
    });
  };

  const classifyButton = button => {
    if (!(button instanceof HTMLButtonElement || button instanceof HTMLAnchorElement)) return null;

    if (button.closest('[role="toolbar"]')) return 'tool';
    if (button.matches('[role="tab"]')) return 'tab';

    const text = normalizeButtonText(button.textContent);

    if (/delete|remove|discard|unpublish/.test(text)) return 'danger';
    if (/^publish$|^published$|^draft$/.test(text)) return 'status';
    if (/new post|save|create|quick add/.test(text)) return 'primary';
    if (/choose an image|insert from url|sort by/.test(text)) return 'ghost';
    if (/media|contents|posts/.test(text)) return 'tab';

    return 'ghost';
  };

  const findSaveActionButton = () => {
    const candidates = Array.from(document.querySelectorAll('button, a[role="button"]'))
      .filter(isVisibleElement)
      .filter(button => !button.closest('[role="toolbar"]'));

    const scoreButton = button => {
      const text = normalizeButtonText(button.textContent);
      const kind = button.getAttribute(DECORATED_BUTTON_ATTR) || classifyButton(button);
      const route = window.location.hash || '';

      let score = 0;
      if (/save/.test(text)) score += 100;
      if (/publish|published|draft/.test(text)) score += 80;
      if (/create|new post/.test(text)) score += 60;
      if (kind === 'primary') score += 40;
      if (kind === 'status') score += 30;
      if (/entries\//.test(route)) score += 20;
      if (button.closest('header') || button.closest('main')) score += 10;
      if (/delete|remove|discard/.test(text)) score = -1;

      return score;
    };

    return candidates
      .map(button => ({ button, score: scoreButton(button) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.button || null;
  };

  const saveCurrentEntry = () => {
    const button = findSaveActionButton();
    if (!button) {
      showToast('没有找到可用的保存按钮', 'error');
      return false;
    }

    button.click();
    return true;
  };

  const getCurrentRawEditor = () => {
    if (lastFocusedEditor instanceof HTMLTextAreaElement) return lastFocusedEditor;
    if (document.activeElement instanceof HTMLTextAreaElement) return document.activeElement;
    return document.querySelector('textarea');
  };

  const findTextareaForToolbar = toolbar => {
    if (!(toolbar instanceof HTMLElement)) return null;

    const parent = toolbar.parentElement;
    if (parent instanceof HTMLElement) {
      const direct = parent.querySelector('textarea');
      if (direct instanceof HTMLTextAreaElement) return direct;
    }

    let sibling = toolbar.nextElementSibling;
    while (sibling) {
      if (sibling instanceof HTMLTextAreaElement) return sibling;
      const nested = sibling.querySelector?.('textarea');
      if (nested instanceof HTMLTextAreaElement) return nested;
      sibling = sibling.nextElementSibling;
    }

    return null;
  };

  const togglePrefixOnLines = (textarea, buildPrefix, pattern) => {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const value = textarea.value;
    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const lineEndIdx = value.indexOf('\n', end);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const block = value.slice(lineStart, lineEnd);
    const lines = block.split('\n');
    const allHavePrefix = lines.every(line => pattern.test(line));

    let index = 0;
    const next = lines.map(line => {
      index += 1;
      if (allHavePrefix) return line.replace(pattern, '');
      return `${buildPrefix(index)}${line.replace(pattern, '')}`;
    }).join('\n');

    textarea.setRangeText(next, lineStart, lineEnd, 'end');
    textarea.setSelectionRange(lineStart, lineStart + next.length);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.focus();
    rememberTextareaSelection(textarea);
    return true;
  };

  const applyHeadingToTextarea = (textarea, level = 2) =>
    togglePrefixOnLines(textarea, () => `${'#'.repeat(level)} `, /^#{1,6}\s+/);

  const toggleQuoteOnTextarea = textarea =>
    togglePrefixOnLines(textarea, () => '> ', /^>\s?/);

  const toggleBulletedListOnTextarea = textarea =>
    togglePrefixOnLines(textarea, () => '- ', /^[-*+]\s+/);

  const toggleNumberedListOnTextarea = textarea =>
    togglePrefixOnLines(textarea, index => `${index}. `, /^\d+\.\s+/);

  const insertCodeBlockToTextarea = textarea => {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const selected = textarea.value.slice(start, end);
    const content = selected || 'code';
    const insert = `\n\`\`\`text\n${content}\n\`\`\`\n`;

    textarea.setRangeText(insert, start, end, 'end');
    textarea.setSelectionRange(start + insert.length, start + insert.length);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.focus();
    rememberTextareaSelection(textarea);
    return true;
  };

  const insertImagePlaceholderToTextarea = textarea => {
    const insert = '\n\n![](https://)\n\n';
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    textarea.setRangeText(insert, start, end, 'end');
    const cursor = start + 6;
    textarea.setSelectionRange(cursor, cursor);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.focus();
    rememberTextareaSelection(textarea);
    return true;
  };

  const handleRawToolbarAction = (button, textarea) => {
    if (!(button instanceof HTMLElement) || !(textarea instanceof HTMLTextAreaElement)) return false;

    restoreTextareaSelection(textarea);

    const label = normalizeButtonText(
      button.getAttribute('data-raw-action') ||
      button.getAttribute('aria-label') ||
      button.getAttribute('title') ||
      button.textContent
    );

    if (label === 'bold') return wrapTextareaSelection(textarea, '**', '**', 'bold');
    if (label === 'italic') return wrapTextareaSelection(textarea, '*', '*', 'italic');
    if (label === 'strikethrough') return wrapTextareaSelection(textarea, '~~', '~~', 'text');
    if (label === 'code') return wrapTextareaSelection(textarea, '`', '`', 'code');
    if (label === 'link') return insertTextareaLink(textarea);
    if (label === 'quote') return toggleQuoteOnTextarea(textarea);
    if (label === 'bulleted list') return toggleBulletedListOnTextarea(textarea);
    if (label === 'numbered list') return toggleNumberedListOnTextarea(textarea);
    if (label === 'heading') return applyHeadingToTextarea(textarea, 2);
    if (label === 'code block') return insertCodeBlockToTextarea(textarea);
    if (label === 'image') return insertImagePlaceholderToTextarea(textarea);

    return false;
  };

  const decorateNativeRawToolbar = (toolbar, textarea) => {
    if (!(toolbar instanceof HTMLElement) || !(textarea instanceof HTMLTextAreaElement)) return;

    toolbar.setAttribute('data-admin-toolbar', 'native');
    toolbar.__codexTextarea = textarea;

    const buttons = Array.from(toolbar.querySelectorAll('button'));
    buttons.forEach((button, index) => {
      const config = RAW_TOOLBAR_ACTIONS[index];
      if (!(button instanceof HTMLButtonElement)) return;

      if (!config) {
        button.style.display = 'none';
        return;
      }

      button.style.display = '';
      button.setAttribute('data-raw-action', config.action);
      button.setAttribute('aria-label', config.aria);
      button.removeAttribute('title');
      button.innerHTML = config.html;
    });
  };

  const buildRawToolbar = textarea => {
    if (!(textarea instanceof HTMLTextAreaElement)) return null;

    const toolbar = document.createElement('div');
    toolbar.className = RAW_TOOLBAR_CLASS;
    toolbar.__codexTextarea = textarea;
    toolbar.innerHTML = `
      <button type="button" data-raw-action="bold" aria-label="Bold"><strong>B</strong></button>
      <button type="button" data-raw-action="italic" aria-label="Italic"><em>I</em></button>
      <button type="button" data-raw-action="strikethrough" aria-label="Strikethrough"><span>S</span></button>
      <button type="button" data-raw-action="code" aria-label="Code"><code>&lt;/&gt;</code></button>
      <button type="button" data-raw-action="link" aria-label="Link">Link</button>
      <button type="button" data-raw-action="heading" aria-label="Heading">H2</button>
      <button type="button" data-raw-action="quote" aria-label="Quote">"</button>
      <button type="button" data-raw-action="bulleted list" aria-label="Bulleted List">• List</button>
      <button type="button" data-raw-action="numbered list" aria-label="Numbered List">1. List</button>
      <button type="button" data-raw-action="code block" aria-label="Code Block">{ }</button>
      <button type="button" data-raw-action="image" aria-label="Image">Image</button>
      <button type="button" data-raw-action="save" aria-label="Save">Save</button>
    `;

    toolbar.addEventListener('mousedown', event => {
      event.preventDefault();
      rememberTextareaSelection(textarea);
    });

    toolbar.addEventListener('click', event => {
      const button = event.target instanceof Element
        ? event.target.closest('button[data-raw-action]')
        : null;

      if (!(button instanceof HTMLButtonElement)) return;

      event.preventDefault();
      textarea.focus();
      restoreTextareaSelection(textarea);

      const action = button.getAttribute('data-raw-action');
      if (action === 'save') {
        if (saveCurrentEntry()) {
          showToast('已触发保存', 'success');
        }
        return;
      }

      if (handleRawToolbarAction(button, textarea)) {
        rememberTextareaSelection(textarea);
      }
    });

    return toolbar;
  };

  const bindSaveShortcut = () => {
    if (document.body.dataset.saveShortcutBound === 'true') return;
    document.body.dataset.saveShortcutBound = 'true';

    document.addEventListener('keydown', event => {
      const key = String(event.key || '').toLowerCase();
      if (key !== 's') return;
      if (!event.metaKey && !event.ctrlKey) return;
      if (event.altKey) return;

      const button = findSaveActionButton();
      if (!button) return;

      stopNativeHandling(event);
      button.click();
      showToast('已触发保存快捷键', 'success');
    }, true);
  };

  const decorateAdminButtons = scope => {
    const root = scope instanceof Element ? scope : document;

    root.querySelectorAll('button, a[role="button"]').forEach(button => {
      const kind = classifyButton(button);
      if (!kind) return;
      button.setAttribute(DECORATED_BUTTON_ATTR, kind);

      if (kind === 'tool' && button.hasAttribute('title')) {
        if (!button.getAttribute('aria-label')) {
          button.setAttribute('aria-label', button.getAttribute('title'));
        }
        button.removeAttribute('title');
      }
    });
  };

  const getIdentityToken = async () => {
    if (!window.netlifyIdentity) throw new Error('Netlify Identity 未就绪');
    const user = window.netlifyIdentity.currentUser();
    if (!user) throw new Error('请先登录后台，再粘贴图片');
    return user.jwt();
  };

  const uploadImage = async file => {
    const jwt = await getIdentityToken();
    const contentType = file.type || 'image/png';
    const ext = extByType[contentType] || 'png';
    const payload = {
      imageBase64: await toDataUrl(file),
      contentType,
      originalName: safeName(file.name, ext)
    };

    const response = await fetch('/.netlify/functions/upload-typorapic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(normalizeErrorMessage(result.error || '图片上传失败'));
    }

    return result;
  };

  const inlineImage = async (editor, file) => {
    const dataUrl = await toDataUrl(file);
    const inserted = insertUploadedImage(editor, dataUrl);

    if (!inserted) {
      throw new Error('图片已转为内联数据，但没有插入成功，请手动重试。');
    }

    return {
      ok: true,
      mode: 'inline',
      url: dataUrl
    };
  };

  const handleImageFiles = async (editor, files) => {
    const image = files.find(file => file && file.type && file.type.startsWith('image/'));
    if (!image) return;
    const richTextMode = isRichTextEditor(editor);

    showToast('正在上传图片到后台图床...', 'info', true);

    try {
      const result = await uploadImage(image);
      const inserted = await insertUploadedImageReliably(editor, result.url);

      if (!inserted) {
        showToast('图片已上传，但没有插入成功，请手动粘贴链接', 'error', true);
        return;
      }

      const storageLabel = result.storage === 'catbox' ? '外部图床' : '站内图床';
      showToast(
        richTextMode
          ? `图片已上传到${storageLabel}，已切到 Markdown 并插入正文：${result.path}`
          : `图片已上传到${storageLabel}并插入正文：${result.path}`,
        'success'
      );
    } catch (error) {
      if (richTextMode) {
        showToast(`Rich Text 模式上传失败：${normalizeErrorMessage(error.message)}。当前不会再伪装成已上传图片。`, 'error', true);
        return;
      }

      const size = image.size || 0;

      if (size > 5 * 1024 * 1024) {
        showToast(`${normalizeErrorMessage(error.message)} 当前图片 ${formatBytes(size)}，不适合转成内联图片。请压缩后重试。`, 'error', true);
        return;
      }

      showToast('图片存储不可用，正在改为内联图片插入正文...', 'info', true);

      try {
        await inlineImage(editor, image);
        showToast(`图片存储不可用，已以内联图片写入正文 (${formatBytes(size)})`, 'success', true);
      } catch (fallbackError) {
        showToast(normalizeErrorMessage(fallbackError.message || error.message), 'error', true);
      }
    }
  };

  const bindPasteUpload = () => {
    if (document.body.dataset.pasteUploadBound === 'true') return;
    document.body.dataset.pasteUploadBound = 'true';

    document.addEventListener('paste', event => {
      const editor = rememberEditor(event.target);
      if (!editor) return;

      const items = Array.from(event.clipboardData?.items || []);
      const imageItem = items.find(item => item.type && item.type.startsWith('image/'));

      if (!imageItem) return;

      const file = imageItem.getAsFile();
      if (!file) return;

      stopNativeHandling(event);

      if (isRichTextEditor(editor)) {
        showToast('检测到 Rich Text 模式，已接管图片粘贴并上传到后台图床。', 'info');
      }

      void handleImageFiles(editor, [file]);
    }, true);

    document.addEventListener('dragover', event => {
      const editor = rememberEditor(event.target);
      if (!editor) return;

      const hasImage = Array.from(event.dataTransfer?.items || []).some(
        item => item.kind === 'file' && item.type.startsWith('image/')
      );

      if (!hasImage) return;

      stopNativeHandling(event);
      editor.classList.add('paste-upload-dropzone');
    }, true);

    document.addEventListener('dragleave', event => {
      const editor = isEditableTarget(event.target);
      if (editor) editor.classList.remove('paste-upload-dropzone');
    }, true);

    document.addEventListener('drop', event => {
      const editor = rememberEditor(event.target);
      if (!editor) return;

      const files = Array.from(event.dataTransfer?.files || []).filter(
        file => file.type && file.type.startsWith('image/')
      );

      editor.classList.remove('paste-upload-dropzone');
      if (!files.length) return;

      stopNativeHandling(event);

      if (isRichTextEditor(editor)) {
        showToast('检测到 Rich Text 模式，已接管图片拖拽并上传到后台图床。', 'info');
      }

      void handleImageFiles(editor, files);
    }, true);

    document.addEventListener('mousedown', event => {
      const button = event.target instanceof Element
        ? event.target.closest('[role="toolbar"][data-admin-toolbar="native"] button[data-raw-action]')
        : null;

      if (!(button instanceof HTMLButtonElement)) return;

      const toolbar = button.closest('[role="toolbar"]');
      const textarea = toolbar?.__codexTextarea instanceof HTMLTextAreaElement
        ? toolbar.__codexTextarea
        : getCurrentRawEditor();

      if (!(textarea instanceof HTMLTextAreaElement)) return;
      rememberTextareaSelection(textarea);
      event.preventDefault();
    }, true);

    document.addEventListener('click', event => {
      const button = event.target instanceof Element
        ? event.target.closest('[role="toolbar"][data-admin-toolbar="native"] button[data-raw-action]')
        : null;

      if (button instanceof HTMLButtonElement) {
        const toolbar = button.closest('[role="toolbar"]');
        const textarea = toolbar?.__codexTextarea instanceof HTMLTextAreaElement
          ? toolbar.__codexTextarea
          : getCurrentRawEditor();

        if (textarea && handleRawToolbarAction(button, textarea)) {
          stopNativeHandling(event);
          return;
        }
      }

      const image = event.target instanceof Element
        ? event.target.closest('[data-slate-editor="true"] img')
        : null;

      if (image instanceof HTMLImageElement) {
        stopNativeHandling(event);
        selectEditorImage(image);
        showToast('已选中图片，按 Delete 或 Backspace 删除。', 'info');
        return;
      }

      if (!(event.target instanceof Element)) return;
      rememberEditor(event.target);
      const editor = event.target.closest('[data-slate-editor="true"]');
      clearSelectedEditorImages(editor || document);
    }, true);

    document.addEventListener('keydown', event => {
      guardDangerousRichTextDelete(event);
    }, true);

    document.addEventListener('beforeinput', event => {
      guardDangerousRichTextDelete(event);
    }, true);

    document.addEventListener('focusin', event => {
      rememberEditor(event.target);
    }, true);

    document.addEventListener('selectionchange', () => {
      if (document.activeElement instanceof HTMLTextAreaElement) {
        rememberTextareaSelection(document.activeElement);
      }
    }, true);
  };

  const decorateEditors = () => {
    document.body.classList.add('decap-enhanced');
    decorateEditorImages();
    decorateAdminButtons();

    document.querySelectorAll(`.${RAW_TOOLBAR_CLASS}, .${HELPER_CLASS}`).forEach(node => node.remove());

    document.querySelectorAll('[role="toolbar"]').forEach(toolbar => {
      const textarea = findTextareaForToolbar(toolbar);
      if (!(textarea instanceof HTMLTextAreaElement)) return;
      decorateNativeRawToolbar(toolbar, textarea);
    });
  };

  const boot = () => {
    bindPasteUpload();
    bindSaveShortcut();
    decorateEditors();

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          decorateEditorImages(node);
          decorateAdminButtons(node);
        });
      }

      decorateEditors();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
