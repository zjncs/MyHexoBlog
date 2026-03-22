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

function hasTaxonomyName(model, name) {
  const items = modelItems(model);
  return items.some((item) => item && item.name === name);
}

function isWikiPost(post) {
  if (!post) return false;
  if (post.wiki === true) return true;
  if (hasTaxonomyName(post.categories, 'wiki')) return true;
  if (hasTaxonomyName(post.tags, 'wiki')) return true;
  return false;
}

function isWikiPage(page) {
  if (!page) return false;
  const outputPath = String(page.path || '');
  if (!outputPath.startsWith('wiki/')) return false;
  if (outputPath === 'wiki/index.html') return false;
  if (outputPath === 'wiki/index.md') return false;
  return true;
}

function formatDate(momentLike) {
  try {
    if (!momentLike) return '';
    // moment-like objects in Hexo have format()
    if (typeof momentLike.format === 'function') return momentLike.format('YYYY-MM-DD');
  } catch (_) {
    // ignore
  }
  return '';
}

function groupKeyFromWikiPage(page) {
  const outputPath = String(page.path || '');
  const segs = outputPath.split('/').filter(Boolean);
  // wiki/<group>/...
  if (segs.length >= 2) return segs[1];
  return 'general';
}

hexo.extend.tag.register('wiki_portal', function () {
  const url_for = hexo.extend.helper.get('url_for').bind(hexo);

  const posts = hexo.locals.get('posts').sort('date', -1);
  const pages = hexo.locals.get('pages');
  const categories = hexo.locals.get('categories');
  const tags = hexo.locals.get('tags');

  const wikiPosts = modelItems(posts).filter(isWikiPost);
  const wikiPages = modelItems(pages).filter(isWikiPage);

  // ---------------------------------------------
  // 1) Wiki Pages + Recent Wiki Posts
  // ---------------------------------------------
  let pagesHtml = '';
  if (wikiPages.length === 0 && wikiPosts.length === 0) {
    pagesHtml = `
      <div class="wiki-empty">
        暂无 Wiki 条目。<br>
        你可以：
        <ul>
          <li>在 <code>source/wiki/</code> 下新增页面（例如 <code>wiki/算法/index.md</code>）</li>
          <li>或给文章加上 <code>wiki: true</code> / <code>tag: wiki</code> / <code>category: wiki</code></li>
        </ul>
      </div>
    `;
  } else {
    const groups = new Map();
    for (const page of wikiPages) {
      const key = groupKeyFromWikiPage(page);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(page);
    }

    const sortedKeys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
    pagesHtml += `<div class="wiki-entry-groups">`;
    for (const key of sortedKeys) {
      const groupPages = groups.get(key).slice().sort((a, b) => {
        const at = String(a.title || '').localeCompare(String(b.title || ''));
        if (at !== 0) return at;
        return String(a.path || '').localeCompare(String(b.path || ''));
      });

      pagesHtml += `
        <div class="wiki-entry-group">
          <div class="wiki-entry-group-title">${escapeHtml(key)}</div>
          <div class="wiki-entry-list">
            ${groupPages
              .map((p) => {
                const title = escapeHtml(p.title || p.slug || p.path || 'Untitled');
                const meta = escapeHtml(formatDate(p.updated || p.date));
                return `
                  <a class="wiki-entry" href="${url_for(p.path)}">
                    <span class="wiki-entry-title">${title}</span>
                    ${meta ? `<span class="wiki-entry-meta">${meta}</span>` : ''}
                  </a>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    }
    pagesHtml += `</div>`;

    const recent = wikiPosts.slice(0, 8);
    if (recent.length) {
      pagesHtml += `
        <div class="wiki-mini-title">最近更新</div>
        <div class="wiki-entry-list">
          ${recent
            .map((p) => {
              const title = escapeHtml(p.title || p.slug || p.path || 'Untitled');
              const meta = escapeHtml(formatDate(p.updated || p.date));
              return `
                <a class="wiki-entry" href="${url_for(p.path)}">
                  <span class="wiki-entry-title">${title}</span>
                  ${meta ? `<span class="wiki-entry-meta">${meta}</span>` : ''}
                </a>
              `;
            })
            .join('')}
        </div>
      `;
    }
  }

  // ---------------------------------------------
  // 2) Categories (Wiki-filtered)
  // ---------------------------------------------
  let catHtml = '<div class="wiki-list-container">';
  const wikiCatItems = new Map();
  for (const post of wikiPosts) {
    for (const cat of modelItems(post.categories)) {
      if (!cat || !cat.name) continue;
      wikiCatItems.set(cat.name, cat);
    }
  }
  const wikiCats = Array.from(wikiCatItems.values()).sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''))
  );

  if (wikiCats.length) {
    for (const cat of wikiCats) {
      // Count wiki posts in this category (pages are not in category model)
      const count = wikiPosts.filter((p) => hasTaxonomyName(p.categories, cat.name)).length;
      catHtml += `
        <a class="wiki-list-item" href="${url_for(cat.path)}">
          <span class="wiki-item-name">
            <i class="fas fa-folder" style="opacity:0.6; margin-right:8px;"></i>${escapeHtml(cat.name)}
          </span>
          <span class="wiki-item-count">${count}</span>
        </a>`;
    }
  } else if (categories && categories.length) {
    // Fallback: show nothing for categories if no wiki posts are tagged yet
    catHtml += '<div class="wiki-empty">暂无 Wiki 分类（给文章加 category: wiki 或 wiki: true）</div>';
  } else {
    catHtml += '<div class="wiki-empty">暂无分类数据</div>';
  }
  catHtml += '</div>';

  // ---------------------------------------------
  // 3) Tags (Wiki-filtered)
  // ---------------------------------------------
  let tagHtml = '<div class="wiki-chips-container">';
  const wikiTagItems = new Map();
  for (const post of wikiPosts) {
    for (const tag of modelItems(post.tags)) {
      if (!tag || !tag.name) continue;
      wikiTagItems.set(tag.name, tag);
    }
  }
  const wikiTags = Array.from(wikiTagItems.values()).sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''))
  );

  if (wikiTags.length) {
    for (const tag of wikiTags) {
      const opacity = Math.max(0.6, Math.random()).toFixed(2);
      tagHtml += `
        <a href="${url_for(tag.path)}" class="wiki-chip" style="--chip-opacity: ${opacity}">
          <span class="hash">#</span>${escapeHtml(tag.name)}
        </a>`;
    }
  } else if (tags && tags.length) {
    tagHtml += '<div class="wiki-empty">暂无 Wiki 标签（给文章加 tag: wiki 或 wiki: true）</div>';
  } else {
    tagHtml += '<div class="wiki-empty">暂无标签数据</div>';
  }
  tagHtml += '</div>';

  // ---------------------------------------------
  // 4) Timeline (Wiki-filtered, group by month)
  // ---------------------------------------------
  const archiveMap = new Map();
  for (const post of wikiPosts) {
    const year = post.date && typeof post.date.year === 'function' ? post.date.year() : null;
    const monthRaw = post.date && typeof post.date.month === 'function' ? post.date.month() : null;
    if (year == null || monthRaw == null) continue;
    const month = monthRaw + 1;
    const key = `${year}/${month < 10 ? '0' + month : month}`;
    const label = `${year}年 ${month}月`;

    if (!archiveMap.has(key)) {
      archiveMap.set(key, { label, count: 0, link: `archives/${year}/${month < 10 ? '0' + month : month}` });
    }
    archiveMap.get(key).count++;
  }

  let archHtml = '<div class="wiki-list-container">';
  const sortedKeys = Array.from(archiveMap.keys()).sort().reverse();
  if (sortedKeys.length > 0) {
    for (const key of sortedKeys) {
      const item = archiveMap.get(key);
      archHtml += `
        <a class="wiki-list-item" href="${url_for(item.link)}">
          <span class="wiki-item-name">
            <i class="fas fa-clock" style="opacity:0.6; margin-right:8px;"></i>${escapeHtml(item.label)}
          </span>
          <span class="wiki-item-count">${item.count}</span>
        </a>`;
    }
  } else {
    archHtml += '<div class="wiki-empty">暂无 Wiki 归档</div>';
  }
  archHtml += '</div>';

  return `
    <div class="wiki-dashboard">
      <div class="wiki-card wiki-card--entries">
        <div class="wiki-card-header">
          <div class="wiki-card-title">Entries</div>
          <div class="wiki-card-subtitle">Wiki 页面 + 最近更新</div>
        </div>
        <div class="wiki-card-body">
          ${pagesHtml}
        </div>
      </div>

      <div class="wiki-card category-card">
        <div class="wiki-card-header">
          <div class="wiki-card-title">Categories</div>
          <div class="wiki-card-subtitle">Wiki 分类索引</div>
        </div>
        <div class="wiki-card-body">
          ${catHtml}
        </div>
      </div>

      <div class="wiki-card tag-card">
        <div class="wiki-card-header">
          <div class="wiki-card-title">Tags</div>
          <div class="wiki-card-subtitle">Wiki 标签</div>
        </div>
        <div class="wiki-card-body">
          ${tagHtml}
        </div>
      </div>

      <div class="wiki-card archive-card">
        <div class="wiki-card-header">
          <div class="wiki-card-title">Timeline</div>
          <div class="wiki-card-subtitle">Wiki 时间归档</div>
        </div>
        <div class="wiki-card-body">
          ${archHtml}
        </div>
      </div>
    </div>
  `;
});

