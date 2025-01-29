
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

    try {
        // 获取钱包信息
        const wallets = await readWallets();
        const walletCount = wallets.length;
        
        // 显示基本状态信息
        log.success('系统状态', {
            '已注册钱包': walletCount
        });

        // 不再自动检查节点状态，仅显示钱包数量信息
    } catch (error) {
        log.error('读取钱包信息失败:', error.message);
    }

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
    const rl2 = createInterface();
    await new Promise(resolve => {
        rl2.question('按回车键返回主菜单...', resolve);
    });
    rl2.close();

    return createdWallets;
}

// 注册账号
async function registerAccount() {
    const wallets = await readWallets();
    if (wallets.length === 0) {
        log.error('未找到钱包，请先创建钱包');
        return;
    }

    let refCode;
    let isValidCode = false;
    while (!isValidCode) {
        while (!refCode) {
            const rl = createInterface();
            const input = await new Promise(resolve => {
                rl.question('请输入邀请码 (直接回车使用默认值 Ppj9vbrl): ', resolve);
            });
            rl.close();

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
    const rl2 = createInterface();
    await new Promise(resolve => {
        rl2.question('按回车键返回主菜单...', resolve);
    });
    rl2.close();
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
                break; // 运行完节点后返回主菜单
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