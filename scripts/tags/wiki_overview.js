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

hexo.extend.tag.register('wiki_overview', function () {
  const data = (hexo.locals.get('data') || {}).wiki || {};
  const quote =
    (data.intro && typeof data.intro.quote === 'string' && data.intro.quote) ||
    '建立连接，发现知识的脉络。';
  const showcase = modelItems(data.showcase);
  const quickgrid = modelItems(data.quickgrid);

  const showcaseItems = showcase.length
    ? showcase
    : [
        { title: '算法 / LeetCode', desc: '刷题笔记与题单，配合可复用的代码模板。' },
        { title: 'LLM / 论文研读', desc: '前沿 paper 摘要、实验复现踩坑、Prompt 设计备忘。' },
        { title: '开源 / 工程化', desc: '项目脚手架、CI/CD 流水线、性能调优手册。' },
      ];

  const quickItems = quickgrid.length
    ? quickgrid
    : [
        { icon: 'fas fa-network-wired', text: '知识节点索引' },
        { icon: 'fas fa-layer-group', text: '思维导图 / 结构化纲要' },
        { icon: 'fas fa-bolt', text: '快速复习卡片 & 代码片段' },
        { icon: 'fas fa-route', text: '学习路线：入门 → 进阶 → 应用' },
      ];

  return `
    <div class="wiki-intro" style="text-align: center; margin-bottom: 40px; font-family: 'Noto Serif SC', serif; color: var(--text-meta);">
      <blockquote>
        ${escapeHtml(quote)}
      </blockquote>
    </div>

    <div class="wiki-showcase">
      ${showcaseItems
        .map((item) => {
          const title = escapeHtml(item && item.title ? item.title : 'Untitled');
          const desc = escapeHtml(item && item.desc ? item.desc : '');
          return `
            <div class="card">
              <h3>${title}</h3>
              ${desc ? `<p>${desc}</p>` : ''}
            </div>
          `;
        })
        .join('')}
    </div>

    <div class="wiki-quickgrid">
      ${quickItems
        .map((item) => {
          const icon = escapeHtml(item && item.icon ? item.icon : 'fas fa-circle');
          const text = escapeHtml(item && item.text ? item.text : '');
          return `<div class="pill"><i class="${icon}"></i>${text}</div>`;
        })
        .join('')}
    </div>
  `;
});
