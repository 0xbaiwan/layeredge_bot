import axios from "axios";
import { Wallet } from "ethers";
import log from "./logger.js";
import { newAgent } from "./helper.js";

class LayerEdgeConnection {
    constructor(proxy = null, privateKey = null, refCode = "knYyWnsE") {
        this.refCode = refCode;
        this.proxy = proxy;
        this.retryCount = 30;

        this.headers = {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': 'https://layeredge.io',
            'Referer': 'https://layeredge.io/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        };

        this.axiosConfig = {
            ...(this.proxy && { httpsAgent: newAgent(proxy) }),
            timeout: 60000,
            headers: this.headers,
            validateStatus: (status) => status < 500
        };

        this.wallet = privateKey ? new Wallet(privateKey) : Wallet.createRandom();
    }

    getWallet() {
        return this.wallet;
    }

    async makeRequest(method, url, config = {}) {
        for (let i = 0; i < this.retryCount; i++) {
            try {
                const response = await axios({
                    method,
                    url,
                    ...this.axiosConfig,
                    ...config,
                    headers: { ...this.headers, ...(config.headers || {}) }
                });
                return response;
            } catch (error) {
                if (i === this.retryCount - 1) {
                    log.error(`Request failed after ${this.retryCount} retries`, '', error);
                    return null;
                }
                log.warn(`Attempt ${i + 1}/${this.retryCount} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        return null;
    }

    async checkInvite() {
        const inviteData = {
            invite_code: this.refCode,
        };

        try {
            const response = await this.makeRequest(
                "post",
                "https://referralapi.layeredge.io/api/referral/verify-referral-code",
                { data: inviteData },
                30
            );

            if (!response) {
                log.error("检查邀请码失败: 网络请求失败，请稍后重试");
                return false;
            }

            if (response === 404) {
                log.error("检查邀请码失败: API接口暂时不可用，请稍后再试");
                return false;
            }

            // 输出完整的响应内容以便调试
            log.info("服务器响应:", JSON.stringify(response.data, null, 2));

            // 更灵活地处理响应格式
            const responseData = response.data;
            if (typeof responseData === 'object') {
                // 尝试从不同的可能的响应结构中获取验证结果
                const result = responseData.data || responseData;
                const valid = result.valid || result.success || result.status === 'success';
                const message = responseData.message || result.message || result.msg || '';

                if (valid) {
                    log.success("邀请码验证成功");
                    return true;
                } else {
                    // 处理特定的错误情况
                    if (message.toLowerCase().includes('referral limit exceeded')) {
                        log.error('该邀请码已达到使用上限，请使用其他邀请码');
                    } else {
                        const errorMsg = message || '请确认邀请码是否正确';
                        log.error(`邀请码验证失败: ${errorMsg}`);
                    }
                    return false;
                }
            } else {
                log.error("检查邀请码失败: 响应格式异常", responseData);
                return false;
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            log.error(`检查邀请码时发生错误: ${errorMessage}`);
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

        if (response?.data?.data) {
            const points = response.data.data.nodePoints || 0;
            log.info(`${this.wallet.address} 总积分:`, points);
            return points;
        } else {
            log.error("检查总积分失败..");
            return 0;
        }
    }

    async submitProof() {
        try {
            const timestamp = new Date().toISOString();
            const message = `I am submitting a proof for LayerEdge at ${timestamp}`;
            const signature = await this.wallet.signMessage(message);
            
            const proofData = {
                proof: "GmEdgesss",
                signature: signature,
                message: message,
                address: this.wallet.address
            };

            const response = await this.makeRequest(
                "post",
                "https://dashboard.layeredge.io/api/send-proof",
                { data: proofData }
            );

            if (response?.data?.success) {
                log.success("Proof submitted successfully");
                return true;
            }
            return false;
        } catch (error) {
            log.error("Error submitting proof", '', error);
            return false;
        }
    }

    async claimLightNodePoints() {
        try {
            const timestamp = Date.now();
            const message = `I am claiming my light node run task node points for ${this.wallet.address} at ${timestamp}`;
            const signature = await this.wallet.signMessage(message);

            const response = await this.makeRequest(
                "post",
                "https://referralapi.layeredge.io/api/task/node-points",
                {
                    data: {
                        walletAddress: this.wallet.address,
                        timestamp,
                        sign: signature
                    }
                }
            );

            if (response?.data?.message === "node points task completed successfully") {
                log.success("Light node points claimed successfully");
                return true;
            }
            return false;
        } catch (error) {
            log.error("Error claiming light node points", '', error);
            return false;
        }
    }

    async dailyCheckIn() {
        try {
            const timestamp = Date.now();
            const message = `I am claiming my daily node point for ${this.wallet.address} at ${timestamp}`;
            const sign = await this.wallet.signMessage(message);
            
            const response = await this.makeRequest(
                "post",
                "https://referralapi.layeredge.io/api/light-node/claim-node-points",
                {
                    data: {
                        sign,
                        timestamp,
                        walletAddress: this.wallet.address
                    }
                }
            );

            if (response?.data) {
                if (response.data.statusCode === 405) {
                    const cooldownMatch = response.data.message.match(/after\s+([^!]+)!/);
                    const cooldownTime = cooldownMatch ? cooldownMatch[1].trim() : "unknown time";
                    log.info("Daily Check-in Already Completed", `Come back after ${cooldownTime}`);
                    return true;
                }
                log.success("Daily Check-in Successful", response.data);
                return true;
            }
            return false;
        } catch (error) {
            log.error("Daily Check-in Failed", '', error);
            return false;
        }
    }
}

export default LayerEdgeConnection;