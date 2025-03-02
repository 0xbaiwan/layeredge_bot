import fs from 'fs/promises'
import readline from 'readline'
import log from './utils/logger.js'
import { readFile, delay } from './utils/helper.js'
import banner from './utils/banner.js';
import LayerEdge from './utils/socket.js';
import WalletManager from './utils/wallet.js';

async function askQuestion(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

// 显示主菜单
async function showMenu() {
    console.clear();
    log.info(banner);

    try {
        const wallets = await WalletManager.loadWallets();
        log.success('系统状态', {
            '已注册钱包': wallets.length
        });
    } catch (error) {
        log.error('读取钱包信息失败:', error.message);
    }

    console.log('\n请选择操作：');
    console.log('1. 创建新钱包');
    console.log('2. 注册账号');
    console.log('3. 运行节点');
    console.log('4. 退出\n');

    return await askQuestion('请输入选项 (1-4): ');
}

// 创建新钱包
async function createNewWallet() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    const walletCount = await new Promise(resolve => {
        rl.question('请输入需要创建的钱包数量：', resolve);
    });
    rl.close();

    const count = parseInt(walletCount) || 1;
    if (count <= 0) {
        log.error('钱包数量必须大于0');
        return;
    }

    log.info(`开始创建 ${count} 个钱包...`);
    const createdWallets = [];
    
    for(let i = 0; i < count; i++) {
        const progress = Math.round(((i + 1) / count) * 100);
        const progressBar = '='.repeat(Math.floor(progress / 2)) + '>' + ' '.repeat(50 - Math.floor(progress / 2));
        
        try {
            const walletDetails = WalletManager.createNewWallet();
            log.info(`[${progress}%] [${progressBar}] 创建钱包 ${i + 1}/${count}`);
            log.info('钱包信息：', {
                '地址': walletDetails.address,
                '私钥': walletDetails.privateKey,
                '助记词': walletDetails.mnemonic
            });

            const saved = await WalletManager.saveWallet(walletDetails);
            if (saved) {
                createdWallets.push(walletDetails);
                log.success(`[${progress}%] [${progressBar}] 钱包 ${i + 1} 已保存`);
            }
        } catch (error) {
            log.error(`创建钱包 ${i + 1} 失败:`, error.message);
        }
    }

    log.success('钱包创建完成！', {
        '创建成功': `${createdWallets.length}/${count}`,
        '创建失败': `${count - createdWallets.length}/${count}`
    });

    // 等待用户按任意键继续
    const rl2 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    await new Promise(resolve => {
        rl2.question('按回车键返回主菜单...', resolve);
    });
    rl2.close();

    return createdWallets;
}

// 注册账号
async function registerAccount() {
    const wallets = await WalletManager.loadWallets();
    if (wallets.length === 0) {
        log.error('未找到钱包，请先创建钱包');
        return;
    }

    let refCode;
    let isValidCode = false;
    while (!isValidCode) {
        while (!refCode) {
            const input = await askQuestion('请输入邀请码 (直接回车使用默认值 Ppj9vbrl): ');
            refCode = input || 'Ppj9vbrl';
            if (!refCode) {
                log.error('邀请码不能为空，请重新输入');
            }
        }

        // 验证邀请码
        const testSocket = new LayerEdge(null, wallets[0].privateKey, refCode);
        log.info(`正在验证邀请码: ${refCode}...`);
        const isValid = await testSocket.checkInvite();
        if (!isValid) {
            log.error('邀请码验证失败，请重新输入有效的邀请码');
            refCode = null; // 重置邀请码，让用户重新输入
            continue;
        }
        isValidCode = true;
    }

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        const progress = Math.round(((i + 1) / wallets.length) * 100);
        const progressBar = '='.repeat(Math.floor(progress / 2)) + '>' + ' '.repeat(50 - Math.floor(progress / 2));

        try {
            const socket = new LayerEdge(null, wallet.privateKey, refCode);
            log.info(`[${progress}%] [${progressBar}] 正在注册钱包: ${wallet.address}`);
            log.info(`使用邀请码: ${refCode}`);

            const isRegistered = await socket.registerWallet();
            if (isRegistered) {
                successCount++;
                log.success(`[${progress}%] [${progressBar}] 钱包 ${wallet.address} 注册成功`);
            } else {
                errorCount++;
                log.error(`[${progress}%] [${progressBar}] 钱包 ${wallet.address} 注册失败`);
            }
        } catch (error) {
            errorCount++;
            log.error(`注册钱包出错:`, error.message);
        }
    }

    log.success('注册完成！', {
        '总钱包数': wallets.length,
        '注册成功': successCount,
        '注册失败': errorCount
    });

    // 等待用户按任意键继续
    const rl2 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    await new Promise(resolve => {
        rl2.question('按回车键返回主菜单...', resolve);
    });
    rl2.close();
}

// 运行节点
async function runNodes() {
    const proxies = await readFile('proxy.txt');
    const wallets = await WalletManager.loadWallets();

    if (wallets.length === 0) {
        log.error('未找到钱包，请先创建钱包并注册账号');
        return;
    }

    if (proxies.length === 0) {
        log.warn('未找到代理配置，将不使用代理运行');
    }

    while (true) {
        let totalPoints = 0;
        let totalTasks = 0;
        let successTasks = 0;

        for (let i = 0; i < wallets.length; i++) {
            const wallet = wallets[i];
            const proxy = proxies[i % proxies.length] || null;
            const { address, privateKey } = wallet;
            
            try {
                const socket = new LayerEdge(proxy, privateKey);
                log.progress(address, 'Processing Started', 'start');

                const tasks = [
                    { name: 'Daily Check-in', fn: () => socket.dailyCheckIn() },
                    { name: 'Submit Proof', fn: () => socket.submitProof() },
                    { name: 'Check Node Status', fn: async () => {
                        const isRunning = await socket.checkNodeStatus();
                        if (isRunning) {
                            await socket.stopNode();
                        }
                        return true;
                    }},
                    { name: 'Connect Node', fn: () => socket.connectNode() },
                    { name: 'Claim Light Node Points', fn: () => socket.claimLightNodePoints() },
                    { name: 'Check Node Points', fn: async () => {
                        const points = await socket.checkNodePoints();
                        totalPoints += points;
                        return true;
                    }}
                ];

                for (const task of tasks) {
                    totalTasks++;
                    log.progress(address, task.name, 'processing');
                    const result = await task.fn();
                    if (result) {
                        successTasks++;
                        log.progress(address, task.name, 'success');
                    } else {
                        log.progress(address, task.name, 'failed');
                    }
                    await delay(2);
                }

                log.progress(address, 'All Tasks Complete', 'success');
            } catch (error) {
                log.error(`处理钱包失败: ${address}`, '', error);
                log.progress(address, 'Processing Failed', 'failed');
            }
            await delay(5);
        }
        
        // 显示本轮统计信息
        log.success('本轮运行统计', {
            '总钱包数': wallets.length,
            '总任务数': totalTasks,
            '成功任务': successTasks,
            '失败任务': totalTasks - successTasks,
            '成功率': `${((successTasks / totalTasks) * 100).toFixed(2)}%`,
            '总积分': totalPoints
        });
        
        log.warn('完成一轮处理，等待1小时后继续...');
        await delay(60 * 60);
    }
}

// 读取钱包信息
async function readWallets() {
    return await WalletManager.loadWallets();
}

// 异步获取节点状态信息
async function getNodesStatus(wallets) {
    let runningNodes = 0;
    let totalPoints = 0;

    for (const wallet of wallets) {
        try {
            const socket = new LayerEdge(null, wallet.privateKey);
            const isRunning = await socket.checkNodeStatus();
            if (isRunning) runningNodes++;
            const points = await socket.checkNodePoints();
            if (points) totalPoints += points;

            // 更新状态信息
            log.success('节点状态更新', {
                '运行中节点': runningNodes,
                '总积分': totalPoints
            });
        } catch (error) {
            log.error(`获取节点 ${wallet.address} 状态失败:`, error.message);
        }
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
                break;
            case '4':
                log.info('感谢使用，再见！');
                process.exit(0);
            default:
                log.error('无效的选项，请重新选择');
        }
        await delay(2);
    }
}

main().catch(error => {
    log.error('程序发生致命错误', '', error);
    process.exit(1);
});