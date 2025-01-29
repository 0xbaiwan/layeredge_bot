# Layer Edge 自动节点运行工具

<img width="1143" alt="image" src="https://github.com/user-attachments/assets/98261dc6-ddac-4968-bfea-420d7431065c" />

- 官网：https://dashboard.layeredge.io/

## 功能特点

- **自动运行节点**
- **自动创建账号**
- **自动推荐注册**
- **支持代理使用**
- **每小时自动领取积分**

## 环境要求

- 需要在您的机器上安装 Node.js


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
3. 在 `proxy.txt` 中添加代理：
-  格式为 `http://用户名:密码@ip:端口` 或 `socks5://用户名:密码@ip:端口`
    ```sh
    nano proxy.txt
    ```
4. 自动推荐注册/创建新钱包
    ```sh
    npm run autoref
    ```
4. 运行脚本：
    ```sh
    npm run start
    ```

所有钱包信息保存在 `wallets.json` 中

## 保持会话在后台运行（可选）
1. 运行 `screen` 建立新会话窗口；
2. 运行脚本；
3. 成功后， 按 ctrl+A+D 分离会话，此时会话就会在后台运行；
4. 重命名会话。首先 `screen -ls` 查看所有会话列表，找到想要重命名的会话id，如17170，运行 `screen -S 17170 -X sessionname new_name(新名字）`；
5. 运行 `screen -ls` 看看名称是不是变更成功；

## 购买代理（可选）

- 免费静态住宅代理：
   - [WebShare](https://www.webshare.io/?referral_code=gtw7lwqqelgu)
   - [ProxyScrape](https://proxyscrape.com/)
   - [MonoSans](https://github.com/monosans/proxy-list)
- 付费高级静态住宅代理：
   - [922proxy](https://www.922proxy.com/register?inviter_code=d6416857)
   - [Proxy-Cheap](https://app.proxy-cheap.com/r/Pd6sqg)
   - [Infatica](https://dashboard.infatica.io/aff.php?aff=580)
- 付费动态IP代理
   - [IPRoyal](https://iproyal.com/?r=733417)
