# devops-rn-app

[![Android](https://github.com/RootLinkFE/devops-rn-app/actions/workflows/manually-build-android.yml/badge.svg)](https://github.com/RootLinkFE/devops-rn-app/actions/workflows/manually-build-android.yml)
[![IOS](https://github.com/RootLinkFE/devops-rn-app/actions/workflows/manually-build-ios.yml/badge.svg)](https://github.com/RootLinkFE/devops-rn-app/actions/workflows/manually-build-ios.yml)

利用 Action 构建私库 gitlab rn app 代码

- 支持 Android
- 支持 IOS

## 使用

- 1、通过模板的方式引用此模板创建工程
- 2、修改 ./checkout.sh 文件内工程名称`rn-app` 为自己项目工程名称
- 3、配置 Secret

- `GITLAB_REPO_URL` 仓库 oauth2 地址
- `WECOM_WEBHOOK_KEY` 企业微信 webhook key
- `MENTION_MOBILE_LIST` 企业微信@人员手机号（可不填）
- `PGYER_API_KEY` 蒲公英 api 上传 key
- `CODE_SIGNING_IDENTITY` code-signing-identity (IOS)
- `TEAM_ID` 证书 TEAM ID （IOS）

IOS 需要额外配置:

代码文件下放对应证书 `p12` 和 `mobileprovision`

```yaml
with:
  project-path: ios/app.xcodeproj #工程文件名
  workspace-path: ios/app.xcworkspace #工程工作空间文件名
  p12-path: ios/app.p12 # 证书p12文件
  mobileprovision-path: ios/app.mobileprovision # 证书描述文件
```

- 4、修改 `manually-build-android.yml` 和 `manually-build-ios.yml` 中 `https://www.pgyer.com/xxxx` 为 APP 对应的 url 地址（消息推送时用）

## 其他

实现总结文章：[GitHub Actions 实现 RN App 自动化构建并推送到蒲公英](https://github.com/giscafer/blog/issues/53)
