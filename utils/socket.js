import axios from "axios";
import chalk from "chalk";
import { Wallet } from "ethers";
import log from "./logger.js";
import { newAgent } from "./helper.js";

class LayerEdgeConnection {
    constructor(proxy = null, privateKey = null, refCode = "Ppj9vbrl") {
        this.refCode = refCode;
        this.proxy = proxy;
        this.headers = {
            Accept: "application/json, text/plain, */*",
            Origin: "https://dashboard.layeredge.io",
        }

        this.axiosConfig = {
            ...(this.proxy && { httpsAgent: newAgent(this.proxy) }),
            timeout: 60000,
        };

        this.wallet = privateKey
            ? new Wallet(privateKey)
            : Wallet.createRandom();
    }

    getWallet() {
        return this.wallet;
    }

    async makeRequest(method, url, config = {}, retries = 30) {
        for (let i = 0; i < retries; i++) {
            try {
                const headers = { ...this.headers };
                if (method.toUpperCase() === 'POST') {
                    headers['Content-Type'] = 'application/json';
                }

                const response = await axios({
                    method,
                    url,
                    headers,
                    ...this.axiosConfig,
                    ...config,
                });
                return response;
            } catch (error) {
                if (error?.response?.status === 404 || error?.status === 404) {
                    log.error(chalk.red(`Layer Edge 连接失败，钱包尚未注册...`));
                    return 404;
                } else if (i === retries - 1) {
                    log.error(`已达到最大重试次数 - 请求失败:`, error.message);
                    if (this.proxy) {
                        log.error(`代理失败: ${this.proxy}`, error.message);
                    }
                    return null;
                }

                process.stdout.write(chalk.yellow(`请求失败: ${error.message} => 正在重试... (${i + 1}/${retries})
`));
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }
        return null;
    }

    async checkInvite() {
        const inviteData = {
            invite_code: this.refCode,
        };

        const response = await this.makeRequest(
            "post",
            "https://referralapi.layeredge.io/api/referral/verify-referral-code",
            { data: inviteData }
        );

        if (response && response.data && response.data.data.valid === true) {
            log.info("邀请码有效", response.data);
            return true;
        } else {
            log.error("检查邀请码失败",);
            return false;
        }
    }

    async registerWallet() {
        const registerData = {
            walletAddress: this.wallet.address,
        };

        const response = await this.makeRequest(
            "post",
            `https://referralapi.layeredge.io/api/referral/register-wallet/${this.refCode}`,
            { data: registerData }
        );

        if (response && response.data) {
            log.info("钱包注册成功", response.data);
            return true;
        } else {
            log.error("钱包注册失败", "error");
            return false;
        }
    }

    async connectNode() {
        const timestamp = Date.now();
        const message = `节点激活请求 ${this.wallet.address} 时间 ${timestamp}`;
        const sign = await this.wallet.signMessage(message);

        const dataSign = {
            sign: sign,
            timestamp: timestamp,
        };

        const response = await this.makeRequest(
            "post",
            `https://referralapi.layeredge.io/api/light-node/node-action/${this.wallet.address}/start`,
            { data: dataSign }
        );

        if (response && response.data && response.data.message === "node action executed successfully") {
            log.info("节点连接成功", response.data);
            return true;
        } else {
            log.info("节点连接失败");
            return false;
        }
    }
    async stopNode() {
        const timestamp = Date.now();
        const message = `节点停止请求 ${this.wallet.address} 时间 ${timestamp}`;
        const sign = await this.wallet.signMessage(message);

        const dataSign = {
            sign: sign,
            timestamp: timestamp,
        };

        const response = await this.makeRequest(
            "post",
            `https://referralapi.layeredge.io/api/light-node/node-action/${this.wallet.address}/stop`,
            { data: dataSign }
        );

        if (response && response.data) {
            log.info("停止节点并领取积分结果:", response.data);
            return true;
        } else {
            log.error("停止节点并领取积分失败");
            return false;
        }
    }

    async checkNodeStatus() {
        const response = await this.makeRequest(
            "get",
            `https://referralapi.layeredge.io/api/light-node/node-status/${this.wallet.address}`
        );

        if (response === 404) {
            log.info("未找到该钱包的节点，正在尝试注册钱包...");
            await this.registerWallet();
            return false;
        }

        if (response && response.data && response.data.data.startTimestamp !== null) {
            log.info("节点状态：运行中", response.data);
            return true;
        } else {
            log.error("节点未运行，正在尝试启动节点...");
            return false;
        }
    }

    async checkNodePoints() {
        const response = await this.makeRequest(
            "get",
            `https://referralapi.layeredge.io/api/referral/wallet-details/${this.wallet.address}`
        );

        if (response && response.data) {
            log.info(`${this.wallet.address} 总积分:`, response.data.data?.nodePoints || 0);
            return true;
        } else {
            log.error("检查总积分失败..");
            return false;
        }
    }
}

export default LayerEdgeConnection;