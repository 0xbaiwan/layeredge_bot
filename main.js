
import fs from 'fs/promises'
import log from './utils/logger.js'
import { readFile, delay } from './utils/helper.js'
import banner from './utils/banner.js';
import LayerEdge from './utils/socket.js';

// Function to read wallets 
async function readWallets() {
    try {
        await fs.access("wallets.json");

        const data = await fs.readFile("wallets.json", "utf-8");
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            log.info("未在wallets.json中找到钱包信息");
            return [];
        }
        throw err;
    }
}

async function run() {
    log.info(banner);
    await delay(3);

    const proxies = await readFile('proxy.txt');
    let wallets = await readWallets();
    if (proxies.length === 0) log.warn("在proxy.txt中未找到代理 - 将不使用代理运行");
    if (wallets.length === 0) {
        log.info('未找到钱包，请先运行 "npm run autoref" 创建新钱包');
        return;
    }

    log.info('开始运行程序，使用所有钱包:', wallets.length);

    while (true) {
        for (let i = 0; i < wallets.length; i++) {
            const wallet = wallets[i];
            const proxy = proxies[i % proxies.length] || null;
            const { address, privateKey } = wallet
            try {
                const socket = new LayerEdge(proxy, privateKey);
                log.info(`正在处理钱包地址: ${address} 使用代理:`, proxy);
                log.info(`正在检查节点状态: ${address}`);
                const isRunning = await socket.checkNodeStatus();

                if (isRunning) {
                    log.info(`钱包 ${address} 正在运行 - 尝试领取节点积分...`);
                    await socket.stopNode();
                }
                log.info(`尝试重新连接节点，钱包: ${address}`);
                await socket.connectNode();

                log.info(`检查节点积分，钱包: ${address}`);
                await socket.checkNodePoints();
            } catch (error) {
                log.error(`处理钱包时出错:`, error.message);
            }
        }
        log.warn(`所有钱包已处理完毕，等待1小时后重新运行...`);
        await delay(60 * 60);
    }
}

run();