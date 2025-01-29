# Layer Edge 自动节点运行工具

<img width="1143" alt="image" src="https://github.com/user-attachments/assets/98261dc6-ddac-4968-bfea-420d7431065c" />

- 官网：https://dashboard.layeredge.io/

## 功能特点

- **自动运行节点**：定时检查节点状态并自动重连
- **自动创建账号**：支持批量创建和导入钱包
- **自动推荐注册**：支持使用推荐码批量注册
- **支持代理使用**：支持HTTP和SOCKS5代理
- **每小时自动领取积分**：自动检测并领取节点积分
- **实时状态监控**：显示详细的运行状态和进度条
- **统计信息展示**：展示成功率、积分统计等信息

## 环境要求

- Node.js 16.0.0 或更高版本
- 稳定的网络连接
- （可选）代理服务

## 安装步骤

1. 克隆仓库：
    ```sh
    git clone https://github.com/0xbaiwan/layeredge_bot
    cd layeredge_bot
    ```

2. 安装所需依赖：
    ```sh
    npm install
    ```

3. 配置代理（可选）：
   在 `proxy.txt` 中添加代理，支持以下格式：
   - HTTP代理：`http://用户名:密码@ip:端口`
   - SOCKS5代理：`socks5://用户名:密码@ip:端口`
   ```sh
   nano proxy.txt
   ```

4. 运行方式：
   - 运行节点管理脚本：
     ```sh
     npm run start
     ```

## 使用说明

### 主菜单功能

1. **创建新钱包**
   - 自动生成新的以太坊钱包
   - 保存钱包信息到 wallets.json
   - 支持使用推荐码

2. **注册账号**
   - 自动为所有钱包注册Layer Edge账号
   - 显示注册进度和结果

3. **运行节点**
   - 自动管理所有注册的节点
   - 实时显示运行状态和进度条
   - 每小时自动检查并领取积分
   - 显示详细的统计信息

### 数据存储

- 所有钱包信息保存在 `wallets.json` 中
- 代理配置保存在 `proxy.txt` 中

## 保持会话在后台运行（可选）

1. 运行 `screen` 建立新会话窗口
2. 运行脚本
3. 按 `Ctrl+A+D` 分离会话，使其在后台运行
4. 管理会话：
   - 查看会话列表：`screen -ls`
   - 重命名会话：`screen -S <会话ID> -X sessionname <新名字>`
   - 恢复会话：`screen -r <会话名>`

## 代理服务（可选）

### 免费静态住宅代理
- [WebShare](https://www.webshare.io/?referral_code=gtw7lwqqelgu)
- [ProxyScrape](https://proxyscrape.com/)
- [MonoSans](https://github.com/monosans/proxy-list)

### 付费高级静态住宅代理
- [922proxy](https://www.922proxy.com/register?inviter_code=d6416857)
- [Proxy-Cheap](https://app.proxy-cheap.com/r/Pd6sqg)
- [Infatica](https://dashboard.infatica.io/aff.php?aff=580)

### 付费动态IP代理
- [IPRoyal](https://iproyal.com/?r=733417)


## 注意事项

- 定期备份 wallets.json 文件
- 确保网络连接稳定
