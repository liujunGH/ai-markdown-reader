"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTimeoutHandler = createTimeoutHandler;
exports.createRateLimiter = createRateLimiter;
exports.validateFilePath = validateFilePath;
exports.validateFileSize = validateFileSize;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
function createTimeoutHandler(handler, timeoutMs, handlerName) {
    return async (...args) => {
        return Promise.race([
            Promise.resolve(handler(...args)),
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`IPC handler '${handlerName}' timed out after ${timeoutMs}ms`));
                }, timeoutMs);
            })
        ]);
    };
}
function createRateLimiter(maxCalls, windowMs) {
    const calls = [];
    return function checkRateLimit() {
        const now = Date.now();
        while (calls.length > 0 && calls[0] < now - windowMs) {
            calls.shift();
        }
        if (calls.length >= maxCalls) {
            return false;
        }
        calls.push(now);
        return true;
    };
}
function validateFilePath(filePath) {
    if (!filePath || typeof filePath !== 'string')
        return false;
    // Reject paths with parent directory traversal
    if (filePath.includes('..'))
        return false;
    // Reject null bytes
    if (filePath.includes('\0'))
        return false;
    // Resolve and ensure it's absolute
    const resolved = path_1.default.resolve(filePath);
    if (!path_1.default.isAbsolute(resolved))
        return false;
    // Allow common safe base directories only
    const homeDir = electron_1.app.getPath('home');
    const userDataDir = electron_1.app.getPath('userData');
    const tempDir = electron_1.app.getPath('temp');
    const desktopDir = electron_1.app.getPath('desktop');
    const documentsDir = electron_1.app.getPath('documents');
    const downloadsDir = electron_1.app.getPath('downloads');
    const safeRoots = [homeDir, userDataDir, tempDir, desktopDir, documentsDir, downloadsDir, '/tmp'];
    return safeRoots.some(root => resolved.startsWith(root));
}
function validateFileSize(filePath, maxBytes) {
    try {
        const stats = fs_1.default.statSync(filePath);
        if (!stats.isFile()) {
            return { valid: false, error: 'Path is not a file' };
        }
        if (stats.size > maxBytes) {
            return {
                valid: false,
                size: stats.size,
                error: `File size (${stats.size} bytes) exceeds maximum allowed (${maxBytes} bytes)`
            };
        }
        return { valid: true, size: stats.size };
    }
    catch (err) {
        return { valid: false, error: `Cannot access file: ${err}` };
    }
}
