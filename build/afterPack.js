const fs = require('fs')
const path = require('path')
const { Arch } = require('builder-util')

/**
 * Keep native-module build tools out of packaged applications.
 *
 * Keep only the prebuilt native module for the package's target platform and
 * architecture. This also removes node-gyp helpers, which are only needed
 * during compilation and can contain foreign architecture slices.
 */
exports.default = function verifyNativeRuntimeFiles(context) {
  const resourcesDir = context.electronPlatformName === 'darwin'
    ? path.join(
      context.appOutDir,
      `${context.packager.appInfo.productFilename}.app`,
      'Contents',
      'Resources'
    )
    : path.join(context.appOutDir, 'resources')

  const nativeModuleDir = path.join(
    resourcesDir,
    'app.asar.unpacked',
    'node_modules',
    'better-sqlite3'
  )
  const targetArch = Arch[context.arch]
  const platform = context.electronPlatformName
  const targetPrebuilds = platform === 'linux'
    ? new Set([`linux-${targetArch}.node`, `linuxmusl-${targetArch}.node`])
    : new Set([`${platform}-${targetArch}.node`])
  const prebuildDir = path.join(nativeModuleDir, 'prebuilds')
  const nativeBuildDir = path.join(nativeModuleDir, 'build')

  if (!targetArch || !fs.existsSync(prebuildDir)) {
    throw new Error(
      `Cannot verify packaged better-sqlite3 prebuilds: platform=${platform}, arch=${String(targetArch)}`
    )
  }

  for (const entry of fs.readdirSync(prebuildDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.node') && !targetPrebuilds.has(entry.name)) {
      fs.rmSync(path.join(prebuildDir, entry.name))
    }
  }

  const missingPrebuilds = [...targetPrebuilds]
    .filter(fileName => !fs.existsSync(path.join(prebuildDir, fileName)))
  if (missingPrebuilds.length > 0) {
    throw new Error(
      `Missing packaged better-sqlite3 prebuilds: ${missingPrebuilds.join(', ')}`
    )
  }

  const forbiddenArtifacts = [
    path.join(nativeBuildDir, 'node_gyp_bins'),
    path.join(nativeBuildDir, 'Release', 'test_extension.node'),
  ]
  for (const artifactPath of forbiddenArtifacts) {
    fs.rmSync(artifactPath, { recursive: true, force: true })
  }

  const bundledBuildArtifacts = forbiddenArtifacts.filter(filePath => fs.existsSync(filePath))
  if (bundledBuildArtifacts.length > 0) {
    throw new Error(
      `Packaged application contains better-sqlite3 build-only artifacts:\n${bundledBuildArtifacts.join('\n')}`
    )
  }

  const packagedPrebuilds = fs.readdirSync(prebuildDir)
    .filter(fileName => fileName.endsWith('.node'))
    .sort()
  const unexpectedPrebuilds = packagedPrebuilds
    .filter(fileName => !targetPrebuilds.has(fileName))
  if (unexpectedPrebuilds.length > 0) {
    throw new Error(
      `Packaged application contains foreign-architecture better-sqlite3 prebuilds: ${unexpectedPrebuilds.join(', ')}`
    )
  }

  console.log(
    `Verified packaged better-sqlite3 runtime files (${platform}-${targetArch}: ${packagedPrebuilds.join(', ')}).`
  )
}
