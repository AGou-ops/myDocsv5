---
title: Jenkins Plugins
description: This is a document about Jenkins Plugins.
---

# Jenkins 常用插件列表

---

1. 角色策略插件: [Role-based Authorization Strateg](https://plugins.jenkins.io/role-strategy)

`Configure Global Security --> Role-Based Strategy`

2. 简洁`jenkins UI`界面: [Blue Ocean](https://www.jenkins.io/doc/book/blueocean/)
3. pipeline中直接发送邮件：`Extended E-mail Notification`

```bash
# pipeline中的测试语句
    emailext to: 'xx@gmail.com', subject: "test", body:  "email content"
```

4. 带验证的webhook触发器: `Generic Webhook Trigger`
5. 多分支pipeline webhook触发：`multibranch-scan-webhook-trigger-plugin`
6. `Conditional BuildStep`
7. 配置文件管理（可以配合上面的`extended email`插件进行使用）：` Config File Provider`
8. 制品管理软件：`nexus`
9. jenkins备份插件：`thinBackup`





客户端监控工具：[catlight](https://catlight.io/)
