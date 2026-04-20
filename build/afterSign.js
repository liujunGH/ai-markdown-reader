const { execSync } = require('child_process')
const path = require('path')

exports.default = function (context) {
  // Skip if a real developer ID certificate is available
  if (process.env.CSC_LINK) {
    console.log('Real certificate found, skipping ad-hoc sign.')
    return
  }

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  )

  console.log(`Ad-hoc signing: ${appPath}`)

  try {
    execSync(`codesign --deep --force --sign - "${appPath}"`, { stdio: 'inherit' })
    console.log('Ad-hoc sign completed.')
  } catch (err) {
    console.error('Ad-hoc sign failed:', err)
  }
}
