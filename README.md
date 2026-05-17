# Dakkk Homepage

本项目 fork 自 [gethomepage/homepage](https://github.com/gethomepage/homepage)，用于构建 `dakkk.top` 个人 VPS 导航页的自定义镜像。

## 项目定位

这是 netcup VPS 部署计划里的 S2 个人主页项目，目标是提供一个轻量、可维护、可自动更新的首页入口，用于导航到博客、文件门户、AI 聚合、密码库、备份监控等自建服务。

线上入口和镜像：

- 主入口：`https://home.dakkk.top`
- 镜像仓库：`ghcr.io/dakavin/homepage:latest`

## 当前适配内容

相对上游项目，本 fork 做了这些定制：

- 使用 `config/*.yaml` 固化 Dakkk VPS 的导航配置
- 修改 `Dockerfile`，把 `config/` 打进最终运行镜像
- 调整 `.gitignore`，允许提交 `config/*.yaml`
- 调整 `.dockerignore`，允许 Docker 构建上下文包含 `config/`
- 使用 GitHub Actions 构建并推送 `ghcr.io/dakavin/homepage:latest`
- 移除上游仓库的翻译、文档发布、PR triage、release drafter、lint、test 等非核心 workflow

## 配置文件

核心配置位于 `config/`：

- `config/settings.yaml`：页面标题、主题、布局、语言
- `config/services.yaml`：服务卡片和站点监控地址
- `config/widgets.yaml`：顶部问候语、时间、资源、搜索组件
- `config/bookmarks.yaml`：快捷书签
- `config/docker.yaml`：Docker socket 集成配置

注意：`config/*.yaml` 会进入镜像，不要在这些文件里写 API Key、密码、token 等敏感信息。

## 构建流程

推送到 `dev` 或 `main` 分支后，GitHub Actions 会构建并推送镜像：

```text
ghcr.io/dakavin/homepage:latest
ghcr.io/dakavin/homepage:<commit-sha>
```

VPS 端通过 Docker Compose 或 Watchtower 拉取新镜像并更新容器。

## 上游文档

Homepage 的完整配置能力仍然参考上游文档：

- 官方文档：[https://gethomepage.dev](https://gethomepage.dev)
- 上游仓库：[https://github.com/gethomepage/homepage](https://github.com/gethomepage/homepage)
