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

function defaultAvatar(url) {
  return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}`;
}

hexo.extend.tag.register('link_portal', function () {
  const data = (hexo.locals.get('data') || {}).link || {};
  const intro =
    (typeof data.intro === 'string' && data.intro) ||
    '收藏一些常用的学习与灵感来源，持续补充。';
  const sections = modelItems(data.sections);
  const closing =
    (typeof data.closing === 'string' && data.closing) ||
    '如果你也想互换友链，直接提 issue 或邮件联系。';

  const sectionItems = sections.length
    ? sections
    : [
        {
          title: '朋友 / 博客',
          items: [
            { name: '阮一峰的网络日志', url: 'https://www.ruanyifeng.com/blog/', desc: '体系化前端与技术杂谈。' },
            { name: 'Overreacted', url: 'https://overreacted.io/', desc: 'Dan Abramov 的思考与前端设计实践。' },
          ],
        },
      ];

  return `
    <blockquote>
      <p>${escapeHtml(intro)}</p>
    </blockquote>

    <div class="flink">
      ${sectionItems
        .map((section) => {
          const title = escapeHtml(section && section.title ? section.title : 'Untitled');
          const desc = escapeHtml(section && section.desc ? section.desc : '');
          const items = modelItems(section && section.items);
          return `
            <h2>${title}</h2>
            ${desc ? `<div class="flink-desc">${desc}</div>` : ''}
            <div class="flink-list">
              ${items
                .map((item) => {
                  const name = escapeHtml(item && item.name ? item.name : 'Untitled');
                  const url = escapeHtml(item && item.url ? item.url : '#');
                  const itemDesc = escapeHtml(item && item.desc ? item.desc : '');
                  const avatar = escapeHtml(
                    item && item.avatar ? item.avatar : defaultAvatar(item && item.url ? item.url : '')
                  );
                  return `
                    <div class="flink-list-item">
                      <a href="${url}" title="${name}" target="_blank" rel="noopener noreferrer">
                        <div class="flink-item-icon">
                          <img class="no-lightbox" src="${avatar}" alt="${name}" />
                        </div>
                        <div class="flink-item-name">${name}</div>
                        ${itemDesc ? `<div class="flink-item-desc" title="${itemDesc}">${itemDesc}</div>` : ''}
                      </a>
                    </div>
                  `;
                })
                .join('')}
            </div>
          `;
        })
        .join('')}
    </div>

    <p>${escapeHtml(closing)}</p>
  `;
});
