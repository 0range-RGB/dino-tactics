# 部署到 Render（免费版）

本项目是 **Node.js + WebSocket 常驻服务**，不能用 Cloudflare Pages / GitHub Pages 这类纯静态托管。

Render 免费 Web Service 可以运行联网对战；但免费实例在 15 分钟无活动后会休眠，下一次访问需要等待冷启动。对局期间有 WebSocket 消息时会保持活跃；如果双方长时间都不操作，仍可能休眠。房间数据保存在内存中，服务休眠或重启后会清空。


## 小白版：从注册到上线（不用命令行）

### 第 1 步：注册 GitHub

GitHub 用来存放代码，免费。

1. 打开 https://github.com/signup
2. 填邮箱、密码、用户名。
3. 按邮件提示完成验证。
4. 登录后进入 GitHub 首页。

### 第 2 步：创建仓库

1. 点右上角 **+** → **New repository**。
2. Repository name 填：dino-tactics
3. 选择 **Public**（公开）最简单。
4. 不要勾选 “Add a README file”。
5. 点 **Create repository**。

### 第 3 步：上传项目文件

1. 把 dino-tactics-online-deploy.zip 解压到桌面，得到一个普通文件夹。
2. 打开文件夹，里面应该直接看到 index.html、package.json、render.yaml 等文件。
3. 在 GitHub 新仓库页面点 **uploading an existing file**。
4. 回到文件夹，按 Ctrl + A 全选**文件**，拖进 GitHub 上传框。
   - 不要把整个外层文件夹拖进去。
   - 不要上传 node_modules。
5. 等文件列表出现后，点绿色 **Commit changes**。
6. 回到仓库首页，确认 index.html、package.json、render.yaml 都在最外层。

### 第 4 步：注册 Render

1. 打开 https://render.com
2. 点 **Get Started** 或 **Sign Up**。
3. 选择 **GitHub** 登录/注册。
4. 授权 Render 访问 GitHub。
5. 按提示验证邮箱。
6. 进入 Render Dashboard。

### 第 5 步：创建 Blueprint

1. 点右上角 **New +** → **Blueprint**。
2. 如果提示连接 GitHub，选择你的 GitHub 账号并授权。
3. 选择刚创建的 dino-tactics 仓库。
4. Render 会自动读取 render.yaml。
5. 确认页面里出现：
   - Service type: Web Service
   - Plan: Free
   - Build Command: npm install
   - Start Command: npm start
   - Health Check Path: /health
6. 点 **Apply** 或 **Create**。
7. 等待状态变成 **Live**（第一次可能要几分钟）。

### 第 6 步：打开网站

部署完成后，Render 会显示一个地址，形如：

https://dino-tactics-xxxx.onrender.com

打开它：

1. 首页能正常显示。
2. 访问地址后面的 /health，应看到 {"ok":true,...}。
3. 用两个浏览器窗口测试创建房间、加入、准备、布阵、开战。

### 如果 Blueprint 找不到

改用手动方式：

1. **New +** → **Web Service**
2. 选择仓库
3. Name 填 dino-tactics
4. Language 选 **Node**
5. Build Command 填 npm install
6. Start Command 填 npm start
7. Instance Type 选 **Free**
8. 环境变量加一条：HOST = 0.0.0.0
9. Health Check Path 填 /health
10. 点 **Create Web Service**

### 免费版会怎样

- 15 分钟没人访问会休眠，下次打开要等几十秒。
- 对局中有人操作、WebSocket 有消息时会保持唤醒。
- 房间存在内存里，服务休眠或重启后房间会清空。
- 朋友约战时，先双方打开页面把服务唤醒，再创建房间。

## 进阶：先确认本地能运行（不会命令行可跳过）

在项目目录执行：

```bash
npm install
npm start
```

打开 `http://127.0.0.1:4173`，确认页面和联网房间正常。

## 2. 上传到 GitHub

把 **dino-tactics 目录里面的文件**作为仓库根目录，不要再套一层文件夹。

需要上传：

- `index.html`
- `styles.css`
- `engine.js`
- `app.js`
- `server.js`
- `package.json`
- `package-lock.json`
- `render.yaml`
- `Dockerfile`（可选）
- `README.md` / `RENDER_DEPLOY.md`

**不要上传 `node_modules`。**

命令行方式：

```bash
git init
git add .
git commit -m "deploy dino tactics"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库.git
git push -u origin main
```

如果仓库根目录是上一级文件夹，在 Render 里把 **Root Directory** 填成 `dino-tactics`。

## 3. 在 Render 创建 Blueprint

1. 登录 https://dashboard.render.com
2. 点击 **New → Blueprint**
3. 连接 GitHub，选择刚才的仓库
4. Render 会读取根目录的 `render.yaml`
5. 确认服务：
   - Runtime: Node
   - Plan: Free
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/health`
   - 环境变量：`HOST=0.0.0.0`
6. 点击 **Apply / Deploy**

如果不用 Blueprint，也可以 **New → Web Service** 手动填写同样的 Build/Start Command。

## 4. 验证部署

部署完成后 Render 会给出：

```
https://你的服务名.onrender.com
```

依次检查：

1. 打开首页能进入游戏。
2. 访问 `/health` 返回类似：

```json
{"ok":true,"rooms":0,"online":true,"uptime":123.4}
```

3. 用两个浏览器窗口测试：
   - 窗口 A 创建房间
   - 窗口 B 输入房间码加入
   - 双方准备、布阵、开战

## 5. 免费版注意事项

- **冷启动**：15 分钟无活动后休眠；再次打开可能要等几十秒。
- **房间会丢**：服务休眠/重启会清空内存中的房间，这是正常的。
- **适合朋友约战**：先双方打开页面把服务唤醒，再创建/加入房间。
- **不要用定时探活强行 24/7 保活**，免费额度有限，且可能违反平台使用条款。

## 6. 以后更新

修改代码后：

```bash
git add .
git commit -m "update"
git push
```

Render 默认会在推送后自动重新部署。

## 7. 自定义域名（可选）

Render 服务设置里有 **Custom Domains**，添加域名后按提示配置 DNS 即可。免费版也可以绑定自定义域名。

## 8. 常见问题

**Build 失败：找不到 package.json**

仓库根目录不对。把项目文件放在仓库根目录，或在 Render 设置 Root Directory。

**页面能开，但联网创建房间失败**

确认服务是 Web Service，不是 Static Site；WebSocket 需要 Node 常驻进程。

**访问很慢**

免费实例在冷启动，等一会儿再刷新。

**HOST 不设置可以吗**

Render 通常会自动注入，但本项目建议显式设置 `HOST=0.0.0.0`。
