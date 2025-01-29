
import readline from 'readline'
import log from './utils/logger.js'
import LayerEdge from './utils/socket.js';
import { readFile } from './utils/helper.js';
import WalletManager from './utils/wallet.js';

async function handleWalletCreation(privateKey = null) {
    let walletDetails;
    if (privateKey) {
        walletDetails = WalletManager.createFromPrivateKey(privateKey);
        if (!walletDetails) {
            log.error('无效的私钥');
            return null;
        }
        log.info('已从私钥导入钱包，地址:', walletDetails.address);
    } else {
        walletDetails = WalletManager.createNewWallet();
        log.info('已创建新的以太坊钱包，地址:', walletDetails.address);
    }
    return walletDetails;
}

// Function to ask a question 
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

async function autoRegister() {
    const proxies = await readFile('proxy.txt');
    if (proxies.length === 0) {
        log.warn('未找到代理，将不使用代理运行...');
    }
    
    const mode = await askQuestion("请选择操作模式 (1: 创建新钱包, 2: 导入已有钱包): ");
    const numberOfWallets = mode === '1' ? await askQuestion("请输入要创建的钱包数量: ") : 1;
    const refCode = await askQuestion("请输入您的推荐码，例如 => O8Ijyqih: ");
    
    let privateKey = null;
    if (mode === '2') {
        privateKey = await askQuestion("请输入您的钱包私钥: ");
    }
    for (let i = 0; i < numberOfWallets; i++) {
        const proxy = proxies[i % proxies.length] || null;
        try {
            log.info(`正在创建并注册钱包: ${i + 1}/${numberOfWallets} 使用代理:`, proxy);
            const walletDetails = await handleWalletCreation(privateKey);
            if (!walletDetails) continue;
            
            const socket = new LayerEdge(proxy, walletDetails.privateKey, refCode);
            await socket.checkInvite()
            const isRegistered = await socket.registerWallet();
            if (isRegistered) {
                await WalletManager.saveWallet(walletDetails);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            log.error('创建钱包时出错:', error.message);
        }
    }
}

autoRegister()