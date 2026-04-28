import { describe, it, expect } from 'vitest'
import { validateCommand, ALLOWED_COMMANDS, DANGEROUS_COMMANDS } from '../lib/commandWhitelist'

describe('validateCommand', () => {
  it('allows whitelisted commands', () => {
    expect(validateCommand('echo hello').allowed).toBe(true)
    expect(validateCommand('ls -la').allowed).toBe(true)
    expect(validateCommand('cat file.txt').allowed).toBe(true)
    expect(validateCommand('pwd').allowed).toBe(true)
    expect(validateCommand('date').allowed).toBe(true)
    expect(validateCommand('grep pattern file.txt').allowed).toBe(true)
    expect(validateCommand('head -n 10 file.txt').allowed).toBe(true)
    expect(validateCommand('tail -f log.txt').allowed).toBe(true)
  })

  it('rejects dangerous commands', () => {
    expect(validateCommand('rm -rf /').allowed).toBe(false)
    expect(validateCommand('mv a b').allowed).toBe(false)
    expect(validateCommand('sudo ls').allowed).toBe(false)
    expect(validateCommand('dd if=/dev/zero').allowed).toBe(false)
    expect(validateCommand('mkfs.ext4 /dev/sda1').allowed).toBe(false)
    expect(validateCommand('bash script.sh').allowed).toBe(false)
    expect(validateCommand('sh -c "echo hi"').allowed).toBe(false)
  })

  it('rejects commands with shell metacharacters', () => {
    expect(validateCommand('ls; rm file').allowed).toBe(false)
    expect(validateCommand('ls && rm file').allowed).toBe(false)
    expect(validateCommand('ls | cat').allowed).toBe(false)
    expect(validateCommand('echo $(rm)').allowed).toBe(false)
    expect(validateCommand('echo `rm`').allowed).toBe(false)
    expect(validateCommand('ls > file').allowed).toBe(false)
    expect(validateCommand('ls < file').allowed).toBe(false)
  })

  it('rejects commands not in whitelist', () => {
    expect(validateCommand('unknown-command').allowed).toBe(false)
    expect(validateCommand('python script.py').allowed).toBe(false)
    expect(validateCommand('node app.js').allowed).toBe(false)
  })

  it('rejects empty commands', () => {
    expect(validateCommand('').allowed).toBe(false)
    expect(validateCommand('   ').allowed).toBe(false)
  })

  it('handles multi-line scripts', () => {
    expect(validateCommand('echo hello\nls -la').allowed).toBe(true)
    expect(validateCommand('echo hello\nrm file').allowed).toBe(false)
  })

  it('allows common safe utilities', () => {
    expect(validateCommand('wc -l file.txt').allowed).toBe(true)
    expect(validateCommand('sort file.txt').allowed).toBe(true)
    expect(validateCommand('uniq file.txt').allowed).toBe(true)
    expect(validateCommand('awk \'{print $1}\' file.txt').allowed).toBe(false) // braces blocked
    expect(validateCommand('find . -name test.txt').allowed).toBe(true)
  })
})

describe('ALLOWED_COMMANDS', () => {
  it('contains expected safe commands', () => {
    expect(ALLOWED_COMMANDS.has('echo')).toBe(true)
    expect(ALLOWED_COMMANDS.has('ls')).toBe(true)
    expect(ALLOWED_COMMANDS.has('cat')).toBe(true)
  })

  it('does not contain dangerous commands', () => {
    expect(ALLOWED_COMMANDS.has('rm')).toBe(false)
    expect(ALLOWED_COMMANDS.has('sudo')).toBe(false)
  })
})

describe('DANGEROUS_COMMANDS', () => {
  it('contains expected dangerous commands', () => {
    expect(DANGEROUS_COMMANDS.has('rm')).toBe(true)
    expect(DANGEROUS_COMMANDS.has('mv')).toBe(true)
    expect(DANGEROUS_COMMANDS.has('sudo')).toBe(true)
    expect(DANGEROUS_COMMANDS.has('bash')).toBe(true)
    expect(DANGEROUS_COMMANDS.has('sh')).toBe(true)
  })
})
