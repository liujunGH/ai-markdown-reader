/**
 * Command whitelist for shell code execution.
 * Only commands in this list are allowed to run.
 */
export const ALLOWED_COMMANDS = new Set([
  'echo',
  'ls',
  'll',
  'cat',
  'pwd',
  'date',
  'grep',
  'egrep',
  'fgrep',
  'head',
  'tail',
  'wc',
  'sort',
  'uniq',
  'cut',
  'tr',
  'sed',
  'awk',
  'find',
  'which',
  'whoami',
  'uname',
  'hostname',
  'id',
  'groups',
  'ps',
  'top',
  'df',
  'du',
  'free',
  'uptime',
  'env',
  'printenv',
  'true',
  'false',
  'yes',
  'seq',
  'shuf',
  'tac',
  'rev',
  'nl',
  'fold',
  'fmt',
  'expand',
  'unexpand',
  'base64',
  'md5sum',
  'sha1sum',
  'sha256sum',
  'dirname',
  'basename',
  'realpath',
  'readlink',
  'stat',
  'file',
  'type',
  'printf',
  'cal',
  'clear',
  'history',
])

/**
 * Dangerous commands that should always be rejected,
 * even if they appear inside otherwise allowed commands.
 */
export const DANGEROUS_COMMANDS = new Set([
  'rm',
  'mv',
  'cp',
  'dd',
  'mkfs',
  'fdisk',
  'parted',
  'sudo',
  'su',
  'chmod',
  'chown',
  'chgrp',
  'mount',
  'umount',
  'shutdown',
  'reboot',
  'halt',
  'poweroff',
  'init',
  'systemctl',
  'service',
  'kill',
  'killall',
  'pkill',
  'xargs',
  'eval',
  'exec',
  'source',
  '.',
  'wget',
  'curl',
  'ftp',
  'sftp',
  'scp',
  'rsync',
  'ssh',
  'telnet',
  'nc',
  'netcat',
  'nmap',
  'ping',
  'traceroute',
  'iptables',
  'ufw',
  'firewalld',
  'crontab',
  'at',
  'batch',
  'nohup',
  'disown',
  'screen',
  'tmux',
  'docker',
  'kubectl',
  'npm',
  'npx',
  'yarn',
  'pnpm',
  'pip',
  'pip3',
  'gem',
  'bundle',
  'cargo',
  'composer',
  'brew',
  'apt',
  'apt-get',
  'yum',
  'dnf',
  'pacman',
  'snap',
  'flatpak',
  'make',
  'cmake',
  'gcc',
  'g++',
  'clang',
  'python',
  'python3',
  'node',
  'nodejs',
  'ruby',
  'perl',
  'php',
  'lua',
  'java',
  'javac',
  'go',
  'rustc',
  'bash',
  'sh',
  'zsh',
  'fish',
  'csh',
  'tcsh',
  'ksh',
  'dash',
])

/**
 * Characters that are disallowed in commands to prevent injection.
 */
const DISALLOWED_CHARS = /[;&|<>()`$\{}\[\]!*`]/

/**
 * Extract the base command from a command line string.
 * Handles simple cases like `ls -la`, `cat file.txt`.
 */
function extractBaseCommand(command: string): string {
  const trimmed = command.trim()
  if (!trimmed) return ''
  // Handle command substitutions and backticks by rejecting them
  if (DISALLOWED_CHARS.test(trimmed)) {
    return ''
  }
  // Take the first word
  const firstWord = trimmed.split(/\s+/)[0]
  // Remove any path prefix
  const base = firstWord.replace(/^.*[/\\]/, '')
  return base
}

export interface CommandValidationResult {
  allowed: boolean
  reason?: string
}

/**
 * Validate a shell command against the whitelist.
 */
export function validateCommand(command: string): CommandValidationResult {
  if (!command || typeof command !== 'string') {
    return { allowed: false, reason: 'Empty command' }
  }

  const trimmed = command.trim()
  if (!trimmed) {
    return { allowed: false, reason: 'Empty command' }
  }

  // Reject if contains dangerous shell metacharacters
  if (DISALLOWED_CHARS.test(trimmed)) {
    return { allowed: false, reason: 'Command contains disallowed characters (shell metacharacters)' }
  }

  // Split by newlines to handle multi-line scripts
  const lines = trimmed.split('\n')

  for (const line of lines) {
    const baseCmd = extractBaseCommand(line)
    if (!baseCmd) continue

    if (DANGEROUS_COMMANDS.has(baseCmd)) {
      return { allowed: false, reason: `Dangerous command detected: ${baseCmd}` }
    }

    if (!ALLOWED_COMMANDS.has(baseCmd)) {
      return { allowed: false, reason: `Command not in whitelist: ${baseCmd}` }
    }
  }

  return { allowed: true }
}
