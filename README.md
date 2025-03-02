# Layer Edge 自动节点运行工具

<img width="1143" alt="image" src="https://github.com/user-attachments/assets/98261dc6-ddac-4968-bfea-420d7431065c" />

- 官网：https://dashboard.layeredge.io/

## 功能特点

- **自动运行节点**：定时检查节点状态并自动重连
- **自动创建账号**：支持批量创建和导入钱包
- **自动推荐注册**：支持使用推荐码批量注册
- **支持代理使用**：支持HTTP和SOCKS5代理
- **每日自动签到**：自动执行每日签到任务
- **自动提交证明**：定期提交节点证明
- **自动领取积分**：包括节点积分和任务积分
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
   - 运行主程序：
     ```sh
     npm run start
     ```
   - 仅运行自动注册：
     ```sh
     npm run autoref
     ```

## 使用说明

### 主菜单功能

1. **创建新钱包**
   - 自动生成新的以太坊钱包
   - 保存钱包信息到 wallets.json
   - 显示详细的钱包信息（地址、私钥、助记词）
   - 支持批量创建多个钱包

2. **注册账号**
   - 自动为所有钱包注册Layer Edge账号
   - 支持自定义或默认推荐码
   - 显示注册进度和结果
   - 自动验证推荐码有效性

3. **运行节点**
   - 自动管理所有注册的节点
   - 执行以下自动化任务：
     * 每日签到
     * 提交节点证明
     * 检查节点状态
     * 重启离线节点
     * 领取节点积分
     * 领取任务积分
   - 显示详细的任务执行状态
   - 统计成功率和积分情况

### 数据存储

- 钱包信息保存在 `wallets.json` 中，格式如下：
  ```json
  [
    {
      "address": "0x...",
      "privateKey": "0x...",
      "mnemonic": "word1 word2 ..."
    }
  ]
  ```
- 代理配置保存在 `proxy.txt` 中，每行一个代理地址

### 运行统计

程序会显示以下统计信息：
- 总钱包数量
- 总任务数量
- 成功任务数
- 失败任务数
- 任务成功率
- 总积分统计

## 保持会话在后台运行

1. 使用 screen 或 tmux：
   ```sh
   # 创建新会话
   screen -S layeredge
   
   # 运行程序
   npm run start
   
   # 分离会话 (Ctrl+A+D)
   
   # 恢复会话
   screen -r layeredge
   ```

2. 使用 PM2：
   ```sh
   # 安装PM2
   npm install -g pm2
   
   # 启动程序
   pm2 start main.js --name layeredge
   
   # 查看日志
   pm2 logs layeredge
   
   # 停止程序
   pm2 stop layeredge
   ```

## 代理服务推荐

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
- 建议使用代理以提高成功率
- 不要频繁重启节点
- 保持程序持续运行以获得最佳收益

## 常见问题

1. 如何备份钱包？
   - 定期复制 wallets.json 文件
   - 保存好每个钱包的助记词

2. 代理不可用怎么办？
   - 检查代理格式是否正确
   - 确认代理是否过期
   - 尝试更换新的代理

3. 节点无法连接？
   - 检查网络连接
   - 确认钱包是否已注册
   - 尝试使用代理
   - 等待一段时间后重试

## 免责声明

本工具仅供学习研究使用，使用本工具所产生的任何后果由使用者自行承担。

## 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目。

## 许可证

MIT License
