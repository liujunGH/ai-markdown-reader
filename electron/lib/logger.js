"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
exports.setLogLevel = setLogLevel;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
let globalMinLevel = 'info';
function getLogDir() {
    try {
        return path_1.default.join(electron_1.app.getPath('userData'), 'logs');
    }
    catch {
        return path_1.default.join(process.cwd(), 'logs');
    }
}
function rotateIfNeeded(logFile) {
    try {
        const stats = fs_1.default.statSync(logFile);
        if (stats.size < 1024 * 1024)
            return; // 1MB
    }
    catch {
        return; // file doesn't exist
    }
    // Rotate: .4 -> delete, .3 -> .4, .2 -> .3, .1 -> .2, -> .1
    for (let i = 4; i >= 1; i--) {
        const src = i === 1 ? logFile : `${logFile}.${i - 1}`;
        const dst = `${logFile}.${i}`;
        try {
            if (fs_1.default.existsSync(dst))
                fs_1.default.unlinkSync(dst);
            if (fs_1.default.existsSync(src))
                fs_1.default.renameSync(src, dst);
        }
        catch {
            // ignore rotation errors
        }
    }
}
function writeLog(level, scope, message, meta, correlationId) {
    if (LEVELS[level] < LEVELS[globalMinLevel])
        return;
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    const cid = correlationId ? ` [${correlationId}]` : '';
    const line = `[${timestamp}] [${level.toUpperCase()}] [main] [${scope}]${cid} ${message}${metaStr}\n`;
    try {
        const logDir = getLogDir();
        if (!fs_1.default.existsSync(logDir)) {
            fs_1.default.mkdirSync(logDir, { recursive: true });
        }
        const logFile = path_1.default.join(logDir, 'app.log');
        rotateIfNeeded(logFile);
        fs_1.default.appendFileSync(logFile, line);
    }
    catch {
        // silently fail to avoid recursive logging issues
    }
}
function createLogger(scope) {
    return {
        debug: (message, meta, correlationId) => writeLog('debug', scope, message, meta, correlationId),
        info: (message, meta, correlationId) => writeLog('info', scope, message, meta, correlationId),
        warn: (message, meta, correlationId) => writeLog('warn', scope, message, meta, correlationId),
        error: (message, meta, correlationId) => writeLog('error', scope, message, meta, correlationId),
    };
}
function setLogLevel(level) {
    globalMinLevel = level;
}
