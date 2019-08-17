import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as io from '@actions/io'
import { promisify } from 'util'
import { exec } from 'child_process'
import * as path from 'path'

const execP = promisify(exec)

export async function run(): Promise<void> {
    try {
      let toolPath: string
      toolPath = tc.find('aws', '*')

      if (!toolPath) {
        const downloadUrl = `https://s3.amazonaws.com/aws-cli/awscli-bundle.zip`
        const downloadPath = await tc.downloadTool(downloadUrl)
        // const extPath = await tc.extractZip(downloadPath)
        const extPath = path.join(downloadPath, '..', 'unpacked')
        const installPath = `${extPath}/.local/lib/aws`
        const binPath = `${installPath}/bin`

        await io.mkdirP(extPath)
        await execP(`unzip ${downloadPath} -d ${extPath}`)
        await execP(`${extPath}/awscli-bundle/install -i ${installPath}`)

        new Promise(async (resolve, reject)=> {
          exec(`${binPath}/aws --version`, async (err, stout, sterr) => {
            const response = err ? stout : sterr
            const regex = /(\d+\.)(\d+\.)(\d+)/g
            const cliVersion = response.match(regex)
            if (cliVersion !== null) {
              const cachedPath = await tc.cacheDir(binPath, 'aws', cliVersion[0])
              core.addPath(cachedPath)
              resolve()
            } else {
              reject()
            }
          })
        })
      }
    } catch (err) {
      console.error(err)
    }
}

run()
