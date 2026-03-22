# 写作/发布（不插硬盘）

本仓库当前有两条发布链路：

- Web 后台（Decap CMS / Netlify Admin）写入 `main` 分支，随后由 GitHub Actions 自动生成并发布到 GitHub Pages。
- 本地或手动 Git 工作流也可以继续推送到 `source` 分支，同样会触发 GitHub Actions 自动发布。

## 1) 在手机/浏览器写（最省事）

1. 打开 GitHub 仓库（`zjncs/zjncs.github.io`）
2. 切到 `source` 分支
3. 直接编辑或新建文件：
   - 博客文章：`source/_posts/xxx.md`
   - Wiki 页面：`source/wiki/主题/index.md`（或 `source/wiki/主题/条目.md`）
   - Life 数据：`source/_data/life.yml`
4. Commit（提交）后等待 Actions 跑完即可上线

## 2) 在任意电脑写（不依赖外接盘）

```bash
git clone https://github.com/zjncs/zjncs.github.io.git
cd zjncs.github.io
git checkout source
npm i
npm run server
```

写完 `git push`，由 Actions 自动部署。

## 3) GitHub Pages 设置（只需做一次）

在仓库 Settings → Pages：

- Source 选择 **GitHub Actions**

之后每次 push 到 `source` 都会自动发布。
