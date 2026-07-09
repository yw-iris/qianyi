# 千载一瞬 · 古人互动传记

> **历史不是过去，它是选择留下的形状。**

以各朝古人传记为基底，构建分支抉择式互动网页。每解锁一种结局，
传世作品上的尘埃便会少去一块——全部拂净后可三维观赏。
通关后推荐相关传记书籍及图书馆馆藏位置。

## 在线体验

（GitHub Pages 部署后在此填入链接）

## 快速开始

```bash
# 1. 克隆仓库
git clone <your-repo-url>
cd <repo>

# 2. 本地预览（无需任何构建步骤）
python3 -m http.server 8123
# 浏览器打开 http://localhost:8123

# 3. 或直接双击 index.html 用浏览器打开
```

**零依赖、零构建、纯静态站点。**

## 部署到 GitHub Pages

### 方法一：使用 GitHub CLI（推荐）

```bash
# 1. 初始化仓库并推送
cd /path/to/qianyi
gh repo create qianyi --public --source=. --push --description "千载一瞬 · 古人互动传记"

# 2. 开启 Pages（或手动在仓库 Settings → Pages 中操作）
#    Source: Deploy from a branch → main → / (root) → Save

# 3. 等待约 1-2 分钟后访问：
#    https://<你的 GitHub 用户名>.github.io/qianyi/
```

### 方法二：手动部署

1. 在 [GitHub](https://github.com) 创建新仓库 `qianyi`
2. 本地执行：
   ```bash
   git init
   git add .
   git commit -m "千载一瞬 v0.1"
   git remote add origin https://github.com/<你的用户名>/qianyi.git
   git push -u origin main
   ```
3. 进入仓库 → **Settings** → 左侧 **Pages**
4. Source 选 **Deploy from a branch** → Branch 选 **main** → Folder 选 **/ (root)**
5. 点 **Save**，等待 Actions 构建完成
6. 访问 `https://<你的用户名>.github.io/qianyi/`

## 项目结构

```
├── index.html              # 入口：人物长廊(Hub) + 抉择之台(Stage)
├── css/style.css           # 国风样式
├── js/
│   ├── router.js           # 路由/角色加载器（核心枢纽）
│   ├── app.js              # 通用控制器（剧情/图鉴/书籍）
│   ├── viewer.js           # Three.js 3D 查看器（画卷+灰尘系统）
│   └── characters/
│       └── ximeng.js       # 角色模块：王希孟（剧情+结局+书籍）
├── assets/
│   ├── three.min.js        # Three.js r128
│   ├── OrbitControls.js    # 轨道控制器
│   └── paintings/
│       └── qianli_4k.png   # 千里江山图贴图（故宫博物院数字文物库）
└── README.md               # 本文件
```

## 核心玩法

1. **人物长廊**：选择一位古人进入其命运剧本
2. **分支抉择**：每步 2 个选择导向不同剧情路径
3. **6 种结局**：每结局对应画作上一块"尘"，解锁后擦除
4. **三维鉴赏**：全部解锁后画卷完整可见，支持拖拽旋转
5. **延伸阅读**：通关后展示相关传记书籍 + 公共图书馆馆藏信息

## 如何添加新角色

只需 4 步：

1. **创建角色脚本** `js/characters/<id>.js`，导出标准接口：
   ```js
   window.CHARACTERS = window.CHARACTERS || {};
   window.CHARACTERS.<id> = {
     id: '<id>',
     meta: { title, en, tagline, intro, era, quote, scrollName, scrollImage },
     endings: [...],      // 结局定义
     story: { ... },       // 剧情树节点
     books: [...]          // 推荐书籍 + 图书馆信息
   };
   ```

2. **放入代表作贴图** 到 `assets/paintings/<image>.png`

3. **在 router.js 的 REGISTRY 数组中注册一行**：
   ```js
   { id: '<id>', name: '姓名', en: 'ENGLISH NAME', era: '朝代',
     script: 'js/characters/<id>.js', thumb: 'assets/paintings/<image>.png', ... }
   ```

4. **推送即可**——无需改 app.js 或 viewer.js

## 技术栈

| 组件 | 技术 |
|------|------|
| 3D 渲染 | Three.js r128 (WebGL) |
| 降级方案 | Canvas 2D (无 WebGL 时自动切换) |
| 路由 | 自研轻量 SPA Router |
| 持久化 | localStorage (按角色隔离) |
| 部署 | GitHub Pages (纯静态) |

## 数据来源

- **王希孟叙事**：蔡京题跋、《宣和画谱》、故宫博物院研究文献
- **千里江山图图像**：故宫博物院数字文物库 (digicol.dpm.org.cn)
- **书籍数据**：ISBN 数据 + 主要公共图书馆公开馆藏信息（MVP 预置）

## License

MIT
