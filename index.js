let paperFileName = null;// 接收压缩文件名称参数
let DeployConfig = null;//配置项

const fs = require('fs');
const archiver = require('archiver');
// 初始化SSH连接
const ssh2 = require('ssh2');
let conn = new ssh2.Client();


/**
 * function inquiry
 * description: 打包文件为zip文件
 * example：inquiry()
 */
function inquiry() {
  // 创建文件输出流
  let output = fs.createWriteStream(`${paperFileName}.zip`);
  let archive = archiver('zip', {
    zlib: { level: 9 } // 设置压缩级别
  })

  // 文件输出流结束
  output.on('close', function () {
    console.log("\x1B[32m%s\x1b[0m", `
   ------------------------------------------------
                  ${archive.pointer()} 字节,已完成压缩          
   ------------------------------------------------
  `);
    deleteFolder(paperFileName);// 删除文件夹
    detectionDeploy();// 检测部署
  })

  // 数据源是否耗尽
  output.on('end', function () {
    console.log('数据源已耗尽')
  })

  // 存档警告
  archive.on('warning', function (err) {
    if (err.code === 'ENOENT') {
      console.warn('stat故障和其他非阻塞错误')
    } else {
      throw err
    }
  })

  // 存档出错
  archive.on('error', function (err) {
    throw err
  })

  // 通过管道方法将输出流存档到文件
  archive.pipe(output);

  //打包build里面的所有文件和目录
  archive.directory(paperFileName + '/', false);

  //完成归档
  archive.finalize();
}

/**
 * function detectionDeploy
 * description: 服务器部署前检测
 * example：detectionDeploy()
 */
function detectionDeploy() {
  if(Object.keys(DeployConfig).length==0){
    console.log("\x1B[33m%s\x1b[0m", '已压缩本地zip包服务器未配置无法部署');
    return;
  }
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  readline.question(`?请输入希望的部署环境  ${Object.keys(DeployConfig).join(' 或 ')} (0表示不希望压缩zip和部署) \n`, environmenttxt => {
    let environment = environmenttxt.trim();//处理首位空格
    if (environment in DeployConfig) {
      if (
        DeployConfig[environment].host &&
        DeployConfig[environment].port &&
        DeployConfig[environment].username &&
        DeployConfig[environment].password &&
        DeployConfig[environment].serverpath
      ) {
        // 参数有效
        connect(DeployConfig[environment]);
      } else {
        console.log("\x1B[33m%s\x1b[0m", 'Error:请检查传入参数是否规范')
      }
    } else if (environment == 0) {
      console.log("\x1B[33m%s\x1b[0m", 'Error:部署中断')
    } else {
      console.log("\x1B[33m%s\x1b[0m", 'Error:意料之外的环境')
    }
    readline.close();
  });
}


/**
 * function connect
 * description: 部署服务器
 * @param {object} serverConfig 
 * @param {string} serverConfig.host 服务器地址
 * @param {number} serverConfig.port 服务器端口
 * @param {string} serverConfig.username 用户名
 * @param {string} serverConfig.serverpath 服务器目录
 */
function connect(serverConfig) {
  console.log("\x1B[36m%s\x1b[0m", "-----------准备连接服务器-----------");
  conn.on('ready', () => {
    console.log("\x1B[36m%s\x1b[0m", "-----------连接服务器成功 准备上传文件-----------");
    // 保证服务器下当前目录存在(此处可以做一些备份文件相关命令)
    useExec(`mkdir -p ${serverConfig.serverpath}/ && cd ${serverConfig.serverpath}/ && rm -rf *`).then(() => {
      conn.sftp((err, sftp) => {
        sftp.fastPut(`${paperFileName}.zip`, `${serverConfig.serverpath}/${paperFileName}.zip`, {}, (err, result) => {
          console.log("\x1B[32m%s\x1b[0m", `文件上传完成 : ${paperFileName}.zip 已部署服务器 ${serverConfig.serverpath}/${paperFileName}.zip`);
          // 解压文件停止连接数据库
          useExec(`
              cd ${serverConfig.serverpath}/ && \
              unzip ${paperFileName}.zip && \
              rm -rf ${paperFileName}.zip && \
              exit
            `).then(() => {
            conn.end();
            console.log("\x1B[35m%s\x1b[0m", `部署完成喽`);
          })

        })
      })
    }).catch(err => { })
  }).on("error", err => {
    console.log("\x1B[31m%s\x1b[0m", `连接服务器失败${err.toString()}`);
  }).connect({
    host: serverConfig.host,
    port: serverConfig.port,
    username: serverConfig.username,
    password: serverConfig.password
  })
}



/**
 * function useExec
 * description: 执行linux命令函数
 * @param {string} cmd linux命令 多个用&&连接
 * @returns {Promise<void>}  在成功回调中切记在合适的时机关闭连接conn.end();
 */
function useExec(cmd) {
  // 所有错误命令直接关闭服务器连接
  return new Promise((resolve, reject) => {
    conn.exec(cmd, async (err, stream) => {
      if (err) { // 异常抛出
        console.log("\x1B[35m%s\x1b[0m", `异常抛出${err.toString()}`);
        conn.end();
        reject(err);
      }
      stream.on('close', async (code, signal) => { // 结束 code: 代码 signal: 信号
        if (code !== 0) {
          console.log("\x1B[35m%s\x1b[0m", `脚本异常退出code: ${code}，异常信号signal:${signal}`)
          conn.end();
          reject("\x1B[35m%s\x1b[0m", `脚本异常退出code: ${code}，异常信号signal:${signal}`);
        }
        // 程序执行成功
        // 自己的业务逻辑....记得conn.end();
        resolve();
      }).on('data', async data => { // 数据 程序执行中echo出的数据
        // console.log("\x1B[35m%s\x1b[0m",`echo出的数据${data.toString()}`);
      }).stderr.on('data', async data => { // 标准错误
        console.log("\x1B[35m%s\x1b[0m", `标准错误${data.toString()}`);
        conn.end();
        reject(data);
      });
    });
  })
}

// 删除文件
function deleteFolder(path) {
  let files = [];
  if (fs.existsSync(path)) {
    files = fs.readdirSync(path);
    files.forEach(function (file, index) {
      let dirPath = path + "/" + file;
      if (fs.statSync(dirPath).isDirectory()) {
        deleteFolder(dirPath);
      } else {
        fs.unlinkSync(dirPath);
      }
    });
    fs.rmdirSync(path);
  }
}

function vitePluginLvdeploy(enforce) {
  return {
    name: 'vite-plugin-lvdeploy',
    apply: 'build',
    config(userConfig, env) {
      // 当前配置 userConfig 当前环境状态 env
      paperFileName = userConfig.build.outDir || 'dist';
    },
    //  在服务启动前开始执行
    buildStart() {
      // console.log('buildStart', enforce)
    },
    //  构建结束的最终回调，类型 async, parallel
    closeBundle() {
      // console.log('closeBundle',enforce)
      DeployConfig = enforce;
      inquiry();
    },
  };
}
module.exports = vitePluginLvdeploy
vitePluginLvdeploy['default'] = vitePluginLvdeploy

