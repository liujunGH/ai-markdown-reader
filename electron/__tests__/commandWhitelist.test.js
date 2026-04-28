"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const commandWhitelist_1 = require("../lib/commandWhitelist");
(0, vitest_1.describe)('validateCommand', () => {
    (0, vitest_1.it)('allows whitelisted commands', () => {
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('echo hello').allowed).toBe(true);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('ls -la').allowed).toBe(true);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('cat file.txt').allowed).toBe(true);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('pwd').allowed).toBe(true);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('date').allowed).toBe(true);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('grep pattern file.txt').allowed).toBe(true);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('head -n 10 file.txt').allowed).toBe(true);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('tail -f log.txt').allowed).toBe(true);
    });
    (0, vitest_1.it)('rejects dangerous commands', () => {
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('rm -rf /').allowed).toBe(false);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('mv a b').allowed).toBe(false);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('sudo ls').allowed).toBe(false);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('dd if=/dev/zero').allowed).toBe(false);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('mkfs.ext4 /dev/sda1').allowed).toBe(false);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('bash script.sh').allowed).toBe(false);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('sh -c "echo hi"').allowed).toBe(false);
    });
    (0, vitest_1.it)('rejects commands with shell metacharacters', () => {
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('ls; rm file').allowed).toBe(false);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('ls && rm file').allowed).toBe(false);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('ls | cat').allowed).toBe(false);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('echo $(rm)').allowed).toBe(false);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('echo `rm`').allowed).toBe(false);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('ls > file').allowed).toBe(false);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('ls < file').allowed).toBe(false);
    });
    (0, vitest_1.it)('rejects commands not in whitelist', () => {
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('unknown-command').allowed).toBe(false);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('python script.py').allowed).toBe(false);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('node app.js').allowed).toBe(false);
    });
    (0, vitest_1.it)('rejects empty commands', () => {
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('').allowed).toBe(false);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('   ').allowed).toBe(false);
    });
    (0, vitest_1.it)('handles multi-line scripts', () => {
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('echo hello\nls -la').allowed).toBe(true);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('echo hello\nrm file').allowed).toBe(false);
    });
    (0, vitest_1.it)('allows common safe utilities', () => {
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('wc -l file.txt').allowed).toBe(true);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('sort file.txt').allowed).toBe(true);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('uniq file.txt').allowed).toBe(true);
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('awk \'{print $1}\' file.txt').allowed).toBe(false); // braces blocked
        (0, vitest_1.expect)((0, commandWhitelist_1.validateCommand)('find . -name test.txt').allowed).toBe(true);
    });
});
(0, vitest_1.describe)('ALLOWED_COMMANDS', () => {
    (0, vitest_1.it)('contains expected safe commands', () => {
        (0, vitest_1.expect)(commandWhitelist_1.ALLOWED_COMMANDS.has('echo')).toBe(true);
        (0, vitest_1.expect)(commandWhitelist_1.ALLOWED_COMMANDS.has('ls')).toBe(true);
        (0, vitest_1.expect)(commandWhitelist_1.ALLOWED_COMMANDS.has('cat')).toBe(true);
    });
    (0, vitest_1.it)('does not contain dangerous commands', () => {
        (0, vitest_1.expect)(commandWhitelist_1.ALLOWED_COMMANDS.has('rm')).toBe(false);
        (0, vitest_1.expect)(commandWhitelist_1.ALLOWED_COMMANDS.has('sudo')).toBe(false);
    });
});
(0, vitest_1.describe)('DANGEROUS_COMMANDS', () => {
    (0, vitest_1.it)('contains expected dangerous commands', () => {
        (0, vitest_1.expect)(commandWhitelist_1.DANGEROUS_COMMANDS.has('rm')).toBe(true);
        (0, vitest_1.expect)(commandWhitelist_1.DANGEROUS_COMMANDS.has('mv')).toBe(true);
        (0, vitest_1.expect)(commandWhitelist_1.DANGEROUS_COMMANDS.has('sudo')).toBe(true);
        (0, vitest_1.expect)(commandWhitelist_1.DANGEROUS_COMMANDS.has('bash')).toBe(true);
        (0, vitest_1.expect)(commandWhitelist_1.DANGEROUS_COMMANDS.has('sh')).toBe(true);
    });
});
