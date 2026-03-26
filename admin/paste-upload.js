(() => {
  const EDITOR_SELECTOR = '[data-slate-editor="true"], textarea';
  const TOAST_ID = 'paste-upload-toast';
  const HELPER_CLASS = 'paste-upload-helper';

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
    if (/TYPORAPIC_TOKEN/i.test(text)) {
      return '图床还没有完成密钥配置，请先在 Netlify 环境变量里添加 TYPORAPIC_TOKEN。';
    }
    if (/Unauthorized/i.test(text)) {
      return '登录状态已失效，请刷新后台后重新登录。';
    }
    if (/GitHub upload failed/i.test(text)) {
      return '图床上传失败，请检查 TyporaPic 仓库权限和 Token 配置。';
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

  const isEditableTarget = target => {
    if (!(target instanceof Element)) return null;
    return target.closest(EDITOR_SELECTOR);
  };

  const insertTextIntoTextarea = (textarea, text) => {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    textarea.setRangeText(text, start, end, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
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

  const handleImageFiles = async (editor, files) => {
    const image = files.find(file => file && file.type && file.type.startsWith('image/'));
    if (!image) return;

    showToast('正在上传图片到 TyporaPic...', 'info', true);

    try {
      const result = await uploadImage(image);
      const inserted = insertUploadedImage(editor, result.url);

      if (!inserted) {
        showToast('图片已上传，但没有插入成功，请手动粘贴链接', 'error', true);
        return;
      }

      showToast('图片已上传并插入正文', 'success');
    } catch (error) {
      showToast(normalizeErrorMessage(error.message), 'error', true);
    }
  };

  const bindPasteUpload = () => {
    if (document.body.dataset.pasteUploadBound === 'true') return;
    document.body.dataset.pasteUploadBound = 'true';

    document.addEventListener('paste', event => {
      const editor = isEditableTarget(event.target);
      if (!editor) return;

      const items = Array.from(event.clipboardData?.items || []);
      const imageItem = items.find(item => item.type && item.type.startsWith('image/'));

      if (!imageItem) return;

      const file = imageItem.getAsFile();
      if (!file) return;

      event.preventDefault();
      void handleImageFiles(editor, [file]);
    });

    document.addEventListener('dragover', event => {
      const editor = isEditableTarget(event.target);
      if (!editor) return;

      const hasImage = Array.from(event.dataTransfer?.items || []).some(
        item => item.kind === 'file' && item.type.startsWith('image/')
      );

      if (!hasImage) return;

      event.preventDefault();
      editor.classList.add('paste-upload-dropzone');
    });

    document.addEventListener('dragleave', event => {
      const editor = isEditableTarget(event.target);
      if (editor) editor.classList.remove('paste-upload-dropzone');
    });

    document.addEventListener('drop', event => {
      const editor = isEditableTarget(event.target);
      if (!editor) return;

      const files = Array.from(event.dataTransfer?.files || []).filter(
        file => file.type && file.type.startsWith('image/')
      );

      editor.classList.remove('paste-upload-dropzone');
      if (!files.length) return;

      event.preventDefault();
      void handleImageFiles(editor, files);
    });
  };

  const decorateEditors = () => {
    document.body.classList.add('decap-enhanced');

    document.querySelectorAll(EDITOR_SELECTOR).forEach(editor => {
      const host = editor.closest('div');
      if (!host || host.querySelector(`.${HELPER_CLASS}`)) return;

      const rect = editor.getBoundingClientRect();
      if (rect.height < 160) return;

      const helper = document.createElement('div');
      helper.className = HELPER_CLASS;
      helper.innerHTML = '<strong>截图直传已启用</strong>：在正文编辑区里直接粘贴或拖拽图片，会自动上传到 <code>zjncs/TyporaPic</code> 并插入正文。';

      host.insertBefore(helper, editor);
    });
  };

  const boot = () => {
    bindPasteUpload();
    decorateEditors();

    const observer = new MutationObserver(() => {
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
