# 云函数共享常量

## 使用方式

由于云函数独立部署，不能直接引用 `_shared` 目录外的文件。
使用前需要将 `_shared` 目录复制到目标云函数目录下。

### 方案一：手动复制（简单直接）

将 `_shared` 文件夹整个复制到你的云函数目录下，然后：

```js
const { ROLES, COLLECTIONS } = require("./_shared/index");
```

### 方案二：使用同步脚本（推荐）

在项目根目录运行：

```bash
node scripts/sync-shared.js
```

会自动将 `_shared` 目录同步到所有云函数目录。

## 与小程序端保持同步

小程序端的常量在 `config/` 目录下。
修改常量时，请确保两端同步更新：

- 小程序端：`config/roles.js`
- 云函数端：`cloudfunctions/_shared/roles.js`

建议以小程序端的 `config/` 为单一真相源，修改后运行同步脚本更新云函数端。
