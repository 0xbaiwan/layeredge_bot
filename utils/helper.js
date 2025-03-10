import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import fs from 'fs/promises';
import log from './logger.js';

export function delay(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Save data to a file
export async function saveToFile(filename, data) {
    try {
        await fs.appendFile(filename, `${data}\n`, 'utf-8');
        log.info(`Data saved to ${filename}`);
    } catch (error) {
        log.error(`Failed to save data to ${filename}: ${error.message}`);
    }
}

// Read the file
export async function readFile(pathFile) {
    try {
        const data = await fs.readFile(pathFile, 'utf8');
        return data.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

// Create an agent
export const newAgent = (proxy = null) => {
    if (proxy) {
        if (proxy.startsWith('http://')) {
            return new HttpsProxyAgent(proxy);
        } else if (proxy.startsWith('socks4://') || proxy.startsWith('socks5://')) {
            return new SocksProxyAgent(proxy);
        } else {
            log.warn(`Unsupported proxy type: ${proxy}`);
            return null;
        }
    }
    return null;
};
