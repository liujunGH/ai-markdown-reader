"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// Mock electron app before importing ipcGuard
vitest_1.vi.mock('electron', () => ({
    app: {
        getPath: (name) => {
            const paths = {
                home: '/home/testuser',
                userData: '/home/testuser/Library/Application Support',
                temp: '/tmp',
                desktop: '/home/testuser/Desktop',
                documents: '/home/testuser/Documents',
                downloads: '/home/testuser/Downloads',
            };
            return paths[name] || '/tmp';
        },
    },
}));
const ipcGuard_1 = require("../lib/ipcGuard");
(0, vitest_1.describe)('validateFilePath', () => {
    (0, vitest_1.it)('rejects paths with parent traversal', () => {
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)('/etc/passwd/../../../secret')).toBe(false);
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)('/home/testuser/../secret')).toBe(false);
    });
    (0, vitest_1.it)('rejects paths with null bytes', () => {
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)('/home/testuser/doc.md\0.exe')).toBe(false);
    });
    (0, vitest_1.it)('rejects relative paths', () => {
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)('relative/path.md')).toBe(false);
    });
    (0, vitest_1.it)('allows paths within home directory', () => {
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)('/home/testuser/doc.md')).toBe(true);
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)('/home/testuser/Desktop/notes.md')).toBe(true);
    });
    (0, vitest_1.it)('allows paths within documents/downloads', () => {
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)('/home/testuser/Documents/readme.md')).toBe(true);
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)('/home/testuser/Downloads/report.md')).toBe(true);
    });
    (0, vitest_1.it)('rejects paths outside safe roots', () => {
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)('/etc/passwd')).toBe(false);
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)('/root/.bashrc')).toBe(false);
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)('/usr/bin/ls')).toBe(false);
    });
    (0, vitest_1.it)('rejects empty or non-string paths', () => {
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)('')).toBe(false);
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)(null)).toBe(false);
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)(undefined)).toBe(false);
    });
});
(0, vitest_1.describe)('createRateLimiter', () => {
    (0, vitest_1.it)('allows calls within limit', () => {
        const limiter = (0, ipcGuard_1.createRateLimiter)(3, 1000);
        (0, vitest_1.expect)(limiter()).toBe(true);
        (0, vitest_1.expect)(limiter()).toBe(true);
        (0, vitest_1.expect)(limiter()).toBe(true);
    });
    (0, vitest_1.it)('blocks calls exceeding limit', () => {
        const limiter = (0, ipcGuard_1.createRateLimiter)(2, 1000);
        limiter();
        limiter();
        (0, vitest_1.expect)(limiter()).toBe(false);
    });
    (0, vitest_1.it)('resets after window expires', () => {
        const limiter = (0, ipcGuard_1.createRateLimiter)(1, 50);
        limiter();
        (0, vitest_1.expect)(limiter()).toBe(false);
        // Wait for window to expire
        return new Promise(resolve => {
            setTimeout(() => {
                (0, vitest_1.expect)(limiter()).toBe(true);
                resolve(undefined);
            }, 60);
        });
    });
});
