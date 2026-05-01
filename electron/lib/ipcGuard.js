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
    // Require an absolute input path before resolving. path.resolve() would
    // otherwise turn relative renderer input into a cwd-relative absolute path.
    if (!path_1.default.isAbsolute(filePath))
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
    const safeRootRealPaths = safeRoots.map(root => getRealPathOrResolved(root));
    const targetRealPath = getTargetRealPath(resolved);
    if (!targetRealPath)
        return false;
    return safeRootRealPaths.some(root => isPathWithinRoot(root, targetRealPath));
}
function getRealPathOrResolved(filePath) {
    try {
        return fs_1.default.realpathSync.native(filePath);
    }
    catch {
        return path_1.default.resolve(filePath);
    }
}
function getTargetRealPath(resolvedPath) {
    try {
        return fs_1.default.realpathSync.native(resolvedPath);
    }
    catch {
        const parentPath = path_1.default.dirname(resolvedPath);
        try {
            const parentStats = fs_1.default.statSync(parentPath);
            if (!parentStats.isDirectory())
                return null;
            return path_1.default.join(fs_1.default.realpathSync.native(parentPath), path_1.default.basename(resolvedPath));
        }
        catch {
            return null;
        }
    }
}
function isPathWithinRoot(root, targetPath) {
    const resolvedRoot = path_1.default.resolve(root);
    const resolvedTarget = path_1.default.resolve(targetPath);
    const relativePath = path_1.default.relative(resolvedRoot, resolvedTarget);
    return (relativePath === '' ||
        (!!relativePath && !relativePath.startsWith('..') && !path_1.default.isAbsolute(relativePath)));
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
