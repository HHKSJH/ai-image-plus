# GitHub Pages 发布

当前项目已经调整为适合 GitHub Pages 的配置：

- 路由模式：`hash`
- Vite `base`：`./`

发布后的访问地址示例：

- `https://<用户名>.github.io/<仓库名>/#/studio/generate`
- `https://<用户名>.github.io/<仓库名>/#/studio/edit`

## 本地打包

```powershell
cd D:\A工作\文件管理\my-test\gpt-img-2\gpt-img-demo\v3-img
npm.cmd install
npm.cmd run build
```

打包产物目录：

```text
v3-img/dist
```

## GitHub Actions 自动部署

仓库根目录已经补了工作流：

```text
.github/workflows/deploy-v3-img-pages.yml
```

它会在你推送 `main` 分支时自动：

1. 安装 `v3-img` 依赖
2. 构建 `v3-img/dist`
3. 发布到 GitHub Pages

## 你还需要做的设置

1. 把代码推到 GitHub 仓库
2. 打开仓库 `Settings`
3. 进入 `Pages`
4. 在 `Build and deployment` 中选择 `GitHub Actions`

完成后，每次 push 到 `main`，页面都会自动更新。

## 注意

- GitHub Pages 下请使用带 `#` 的路由地址
- 不要再使用无 `#` 的 history 路由访问方式
