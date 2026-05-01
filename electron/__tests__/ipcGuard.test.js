"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const vitest_1 = require("vitest");
const mockedAppPaths = vitest_1.vi.hoisted(() => ({
    paths: {
        home: '/home/testuser',
        userData: '/home/testuser/Library/Application Support',
        temp: '/tmp',
        desktop: '/home/testuser/Desktop',
        documents: '/home/testuser/Documents',
        downloads: '/home/testuser/Downloads',
    },
}));
// Mock electron app before importing ipcGuard
vitest_1.vi.mock('electron', () => ({
    app: {
        getPath: (name) => {
            return mockedAppPaths.paths[name] || mockedAppPaths.paths.temp;
        },
    },
}));
const ipcGuard_1 = require("../lib/ipcGuard");
(0, vitest_1.describe)('validateFilePath', () => {
    let testRoot;
    let outsideRoot;
    let homeDir;
    let userDataDir;
    let tempDir;
    let desktopDir;
    let documentsDir;
    let downloadsDir;
    (0, vitest_1.beforeAll)(() => {
        testRoot = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'ipc-guard-safe-'));
        outsideRoot = fs_1.default.mkdtempSync(path_1.default.join(process.cwd(), '.ipc-guard-outside-'));
        homeDir = path_1.default.join(testRoot, 'home');
        userDataDir = path_1.default.join(homeDir, 'Library', 'Application Support');
        tempDir = path_1.default.join(testRoot, 'tmp');
        desktopDir = path_1.default.join(homeDir, 'Desktop');
        documentsDir = path_1.default.join(homeDir, 'Documents');
        downloadsDir = path_1.default.join(homeDir, 'Downloads');
        for (const dir of [homeDir, userDataDir, tempDir, desktopDir, documentsDir, downloadsDir]) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        fs_1.default.writeFileSync(path_1.default.join(homeDir, 'doc.md'), '# Home');
        fs_1.default.writeFileSync(path_1.default.join(desktopDir, 'notes.md'), '# Desktop');
        fs_1.default.mkdirSync(path_1.default.join(homeDir, 'notes'), { recursive: true });
        fs_1.default.writeFileSync(path_1.default.join(homeDir, 'notes', 'doc.md'), '# Nested');
        fs_1.default.writeFileSync(path_1.default.join(documentsDir, 'readme.md'), '# Documents');
        fs_1.default.writeFileSync(path_1.default.join(downloadsDir, 'report.md'), '# Downloads');
        fs_1.default.writeFileSync(path_1.default.join(outsideRoot, 'secret.md'), '# Secret');
        fs_1.default.symlinkSync(path_1.default.join(outsideRoot, 'secret.md'), path_1.default.join(homeDir, 'escape.md'));
        fs_1.default.symlinkSync(outsideRoot, path_1.default.join(homeDir, 'escape-dir'));
        fs_1.default.symlinkSync(path_1.default.join(documentsDir, 'readme.md'), path_1.default.join(homeDir, 'safe-link.md'));
        mockedAppPaths.paths.home = homeDir;
        mockedAppPaths.paths.userData = userDataDir;
        mockedAppPaths.paths.temp = tempDir;
        mockedAppPaths.paths.desktop = desktopDir;
        mockedAppPaths.paths.documents = documentsDir;
        mockedAppPaths.paths.downloads = downloadsDir;
    });
    (0, vitest_1.afterAll)(() => {
        fs_1.default.rmSync(testRoot, { recursive: true, force: true });
        fs_1.default.rmSync(outsideRoot, { recursive: true, force: true });
    });
    (0, vitest_1.it)('rejects paths with parent traversal', () => {
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)('/etc/passwd/../../../secret')).toBe(false);
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)(path_1.default.join(homeDir, '..', 'secret'))).toBe(false);
    });
    (0, vitest_1.it)('rejects paths with null bytes', () => {
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)(`${path_1.default.join(homeDir, 'doc.md')}\0.exe`)).toBe(false);
    });
    (0, vitest_1.it)('rejects relative paths', () => {
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)('relative/path.md')).toBe(false);
    });
    (0, vitest_1.it)('allows paths within home directory', () => {
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)(path_1.default.join(homeDir, 'doc.md'))).toBe(true);
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)(path_1.default.join(desktopDir, 'notes.md'))).toBe(true);
    });
    (0, vitest_1.it)('allows safe roots themselves and their child paths', () => {
        fs_1.default.writeFileSync(path_1.default.join(tempDir, 'doc.md'), '# Temp');
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)(homeDir)).toBe(true);
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)(path_1.default.join(homeDir, 'notes', 'doc.md'))).toBe(true);
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)(tempDir)).toBe(true);
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)(path_1.default.join(tempDir, 'doc.md'))).toBe(true);
    });
    (0, vitest_1.it)('allows paths within documents/downloads', () => {
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)(path_1.default.join(documentsDir, 'readme.md'))).toBe(true);
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)(path_1.default.join(downloadsDir, 'report.md'))).toBe(true);
    });
    (0, vitest_1.it)('rejects paths that only share a safe root prefix', () => {
        const homeSibling = `${homeDir}2`;
        const tempSibling = `${tempDir}file`;
        fs_1.default.mkdirSync(homeSibling, { recursive: true });
        fs_1.default.mkdirSync(tempSibling, { recursive: true });
        fs_1.default.writeFileSync(path_1.default.join(homeSibling, 'doc.md'), '# Sibling');
        fs_1.default.writeFileSync(path_1.default.join(tempSibling, 'doc.md'), '# Sibling');
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)(path_1.default.join(homeSibling, 'doc.md'))).toBe(false);
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)(path_1.default.join(tempSibling, 'doc.md'))).toBe(false);
    });
    (0, vitest_1.it)('rejects paths outside safe roots', () => {
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)('/etc/passwd')).toBe(false);
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)('/root/.bashrc')).toBe(false);
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)('/usr/bin/ls')).toBe(false);
    });
    (0, vitest_1.it)('rejects existing symlinks that resolve outside safe roots', () => {
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)(path_1.default.join(homeDir, 'escape.md'))).toBe(false);
    });
    (0, vitest_1.it)('rejects new export paths whose existing parent symlink resolves outside safe roots', () => {
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)(path_1.default.join(homeDir, 'escape-dir', 'export.md'))).toBe(false);
    });
    (0, vitest_1.it)('allows symlinks that resolve within safe roots', () => {
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)(path_1.default.join(homeDir, 'safe-link.md'))).toBe(true);
    });
    (0, vitest_1.it)('allows new export paths when their real parent directory is safe', () => {
        const exportDir = path_1.default.join(homeDir, 'exports');
        fs_1.default.mkdirSync(exportDir, { recursive: true });
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)(path_1.default.join(exportDir, 'new-export.md'))).toBe(true);
    });
    (0, vitest_1.it)('rejects new export paths when the parent directory does not exist', () => {
        (0, vitest_1.expect)((0, ipcGuard_1.validateFilePath)(path_1.default.join(homeDir, 'missing-parent', 'new-export.md'))).toBe(false);
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
