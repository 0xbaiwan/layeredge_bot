import { ethers } from 'ethers';
import fs from 'fs/promises';
import log from './logger.js';

class WalletManager {
    static createFromPrivateKey(privateKey) {
        try {
            const wallet = new ethers.Wallet(privateKey);
            return {
                address: wallet.address,
                privateKey: wallet.privateKey
            };
        } catch (error) {
            log.error('从私钥导入钱包失败:', error.message);
            return null;
        }
    }

    static createNewWallet() {
        const wallet = ethers.Wallet.createRandom();
        return {
            address: wallet.address,
            privateKey: wallet.privateKey,
            mnemonic: wallet.mnemonic.phrase
        };
    }

    static async saveWallet(walletDetails) {
        let wallets = [];
        try {
            if (await fs.stat('wallets.json').catch(() => false)) {
                const data = await fs.readFile('wallets.json', 'utf8');
                wallets = JSON.parse(data);
            }

            // 检查钱包是否已存在
            const exists = wallets.some(w => w.address === walletDetails.address);
            if (exists) {
                log.warn('钱包已存在，跳过保存');
                return false;
            }

            wallets.push(walletDetails);
            await fs.writeFile('wallets.json', JSON.stringify(wallets, null, 2));
            log.info('钱包已保存到wallets.json');
            return true;
        } catch (err) {
            log.error('保存钱包时出错:', err);
            return false;
        }
    }

    static async loadWallets() {
        try {
            if (await fs.stat('wallets.json').catch(() => false)) {
                const data = await fs.readFile('wallets.json', 'utf8');
                return JSON.parse(data);
            }
            return [];
        } catch (err) {
            log.error('读取钱包文件时出错:', err);
            return [];
        }
    }
}

export default WalletManager;