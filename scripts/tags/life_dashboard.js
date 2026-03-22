'use strict';

function escapeHtml(input) {
  return String(input)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function modelItems(model) {
  if (!model) return [];
  if (Array.isArray(model)) return model;
  if (Array.isArray(model.data)) return model.data;
  return [];
}

function asTextItem(item) {
  if (item == null) return null;
  if (typeof item === 'string') return { text: item };
  if (typeof item === 'object' && typeof item.text === 'string') return { text: item.text };
  return null;
}

function asFocusItem(item) {
  if (item == null) return null;
  if (typeof item === 'string') return { title: item, desc: '' };
  if (typeof item === 'object' && typeof item.title === 'string') {
    return { title: item.title, desc: typeof item.desc === 'string' ? item.desc : '' };
  }
  return null;
}

function asChecklistItem(item) {
  if (item == null) return null;
  if (typeof item === 'string') return { icon: '•', text: item };
  if (typeof item === 'object' && typeof item.text === 'string') {
    return {
      icon: typeof item.icon === 'string' ? item.icon : '•',
      text: item.text,
    };
  }
  return null;
}

function formatDate(momentLike) {
  try {
    if (!momentLike) return '';
    if (typeof momentLike.format === 'function') return momentLike.format('YYYY-MM-DD');
  } catch (_) {
    // ignore
  }
  return '';
}

function renderTextList(items) {
  if (!items.length) return '<div class="life-empty">暂无</div>';
  return `<ul class="life-list">${items
    .map((i) => `<li>${escapeHtml(i.text)}</li>`)
    .join('')}</ul>`;
}

hexo.extend.tag.register('life_dashboard', function () {
  const url_for = hexo.extend.helper.get('url_for').bind(hexo);

  const data = (hexo.locals.get('data') || {}).life || null;
  if (!data) {
    return `
      <div class="life-empty">
        未找到 <code>source/_data/life.yml</code>。<br>
        你可以在该文件里维护「最近在做 / 灵感 / 关注方向 / 清单」。
      </div>
    `;
  }

  const now = modelItems(data.now).map(asTextItem).filter(Boolean);
  const ideas = modelItems(data.ideas).map(asTextItem).filter(Boolean);
  const focus = modelItems(data.focus).map(asFocusItem).filter(Boolean);
  const checklist = modelItems(data.checklist).map(asChecklistItem).filter(Boolean);
  const noteText =
    (data.note && typeof data.note.text === 'string' && data.note.text) ||
    (typeof data.note === 'string' && data.note) ||
    '';

  const posts = hexo.locals.get('posts').sort('date', -1);
  const recentPosts = modelItems(posts).slice(0, 6);

  const recentHtml = recentPosts.length
    ? `<div class="life-recent-list">${recentPosts
        .map((p) => {
          const title = escapeHtml(p.title || p.slug || p.path || 'Untitled');
          const meta = escapeHtml(formatDate(p.updated || p.date));
          return `
            <a class="life-recent-item" href="${url_for(p.path)}">
              <span class="life-recent-title">${title}</span>
              ${meta ? `<span class="life-recent-meta">${meta}</span>` : ''}
            </a>
          `;
        })
        .join('')}</div>`
    : '<div class="life-empty">暂无文章</div>';

  const focusHtml =
    focus.length === 0
      ? '<div class="life-empty">暂无</div>'
      : `<div class="life-focus">${focus
          .map((f) => {
            const title = escapeHtml(f.title);
            const desc = escapeHtml(f.desc || '');
            return `
              <div class="life-focus-item">
                <div class="life-focus-title">${title}</div>
                ${desc ? `<div class="life-focus-desc">${desc}</div>` : ''}
              </div>
            `;
          })
          .join('')}</div>`;

  const checklistHtml =
    checklist.length === 0
      ? '<div class="life-empty">暂无</div>'
      : `<ul class="life-checklist">${checklist
          .map((c) => `<li><span class="life-check-icon">${escapeHtml(c.icon)}</span>${escapeHtml(c.text)}</li>`)
          .join('')}</ul>`;

  return `
    <div class="life-grid">
      <section class="life-card">
        <div class="life-card-title">最近在做</div>
        ${renderTextList(now)}
      </section>

      <section class="life-card">
        <div class="life-card-title">灵感碎片</div>
        ${renderTextList(ideas)}
      </section>

      <section class="life-card">
        <div class="life-card-title">关注方向</div>
        ${focusHtml}
      </section>

      <section class="life-card">
        <div class="life-card-title">清单</div>
        ${checklistHtml}
      </section>

      <section class="life-card life-card--recent">
        <div class="life-card-title">最近文章</div>
        ${recentHtml}
      </section>

      ${
        noteText
          ? `<section class="life-card life-card--note">
               <div class="life-note">${escapeHtml(noteText)}</div>
             </section>`
          : ''
      }
    </div>
  `;
});

