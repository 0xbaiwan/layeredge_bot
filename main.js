
import fs from 'fs/promises'
import readline from 'readline'
import log from './utils/logger.js'
import { readFile, delay } from './utils/helper.js'
import banner from './utils/banner.js';
import LayerEdge from './utils/socket.js';
import WalletManager from './utils/wallet.js';

// 创建readline接口
function createInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

// 显示主菜单
async function showMenu() {
    console.clear();
    log.info(banner);

    // 获取钱包和节点状态信息
    const wallets = await readWallets();
    const walletCount = wallets.length;
    let runningNodes = 0;
    let totalPoints = 0;

    if (walletCount > 0) {
        for (const wallet of wallets) {
            const socket = new LayerEdge(null, wallet.privateKey);
            const isRunning = await socket.checkNodeStatus();
            if (isRunning) runningNodes++;
            const points = await socket.checkNodePoints();
            if (points) totalPoints += points;
        }
    }

    // 显示状态信息
    log.success('系统状态', {
        '已注册钱包': walletCount,
        '运行中节点': runningNodes,
        '总积分': totalPoints
    });

    console.log('\n请选择操作：');
    console.log('1. 创建新钱包');
    console.log('2. 注册账号');
    console.log('3. 运行节点');
    console.log('4. 退出\n');

    const rl = createInterface();
    const answer = await new Promise(resolve => {
        rl.question('请输入选项 (1-4): ', resolve);
    });
    rl.close();
    return answer;
}

// 创建新钱包
async function createNewWallet() {
    const rl = createInterface();
    const refCode = await new Promise(resolve => {
        rl.question('请输入推荐码: ', resolve);
    });
    rl.close();

    const walletDetails = WalletManager.createNewWallet();
    log.info('已创建新钱包，地址:', walletDetails.address);

    const socket = new LayerEdge(null, walletDetails.privateKey, refCode);
    if (await socket.checkInvite()) {
        await WalletManager.saveWallet(walletDetails);
        log.info('钱包创建成功并已保存');
    }
}

// 注册账号
async function registerAccount() {
    const wallets = await readWallets();
    if (wallets.length === 0) {
        log.error('未找到钱包，请先创建钱包');
        return;
    }

    for (const wallet of wallets) {
        const socket = new LayerEdge(null, wallet.privateKey);
        await socket.registerWallet();
    }
}

// 运行节点
async function runNodes() {
    const proxies = await readFile('proxy.txt');
    const wallets = await readWallets();

    if (wallets.length === 0) {
        log.error('未找到钱包，请先创建钱包并注册账号');
        return;
    }

    if (proxies.length === 0) {
        log.warn('未找到代理配置，将不使用代理运行');
    }

    while (true) {
        log.info('开始处理所有钱包节点...');
        let totalPoints = 0;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < wallets.length; i++) {
            const wallet = wallets[i];
            const proxy = proxies[i % proxies.length] || null;
            const { address, privateKey } = wallet;
            const progress = Math.round(((i + 1) / wallets.length) * 100);
            const progressBar = '='.repeat(Math.floor(progress / 2)) + '>' + ' '.repeat(50 - Math.floor(progress / 2));

            try {
                const socket = new LayerEdge(proxy, privateKey);
                log.info(`[${progress}%] [${progressBar}] 处理钱包: ${address} 使用代理: ${proxy || '无'}`);
                
                const isRunning = await socket.checkNodeStatus();
                if (isRunning) {
                    log.info(`[${progress}%] [${progressBar}] 钱包 ${address} 正在运行，尝试领取积分...`);
                    await socket.stopNode();
                }

                log.info(`[${progress}%] [${progressBar}] 重新连接节点: ${address}`);
                await socket.connectNode();
                const points = await socket.checkNodePoints();
                if (points) totalPoints += points;
                successCount++;

                // 显示当前进度和统计信息
                log.success(`处理进度`, {
                    '当前进度': `${progress}% [${progressBar}]`,
                    '已处理钱包': `${i + 1}/${wallets.length}`,
                    '成功': successCount,
                    '失败': errorCount,
                    '当前总积分': totalPoints
                });
            } catch (error) {
                errorCount++;
                log.error(`处理钱包出错:`, error.message);
            }
        }
        log.warn('所有钱包处理完毕，1小时后重新运行...');
        log.success('本轮运行统计', {
            '总钱包数': wallets.length,
            '成功': successCount,
            '失败': errorCount,
            '总积分': totalPoints
        });
        await delay(60 * 60);
    }
}

// 读取钱包信息
async function readWallets() {
    try {
        await fs.access('wallets.json');
        const data = await fs.readFile('wallets.json', 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            log.info('未找到钱包信息');
            return [];
        }
        throw err;
    }
}

// 主函数
async function main() {
    while (true) {
        const choice = await showMenu();
        switch (choice) {
            case '1':
                await createNewWallet();
                break;
            case '2':
                await registerAccount();
                break;
            case '3':
                await runNodes();
                return; // 运行节点后退出程序
            case '4':
                log.info('感谢使用，再见！');
                return;
            default:
                log.error('无效的选项，请重新选择');
        }
        await delay(2); // 暂停2秒后显示菜单
    }
}

main();