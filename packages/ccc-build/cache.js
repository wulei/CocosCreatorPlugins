const fs = require("fs-extra");
const path = require("path");
const md5Hex = require("md5-hex");
const os = require("os");

class Cache {
  constructor(options) {
    this.options = {
      directory: path.join(os.tmpdir(), "tinypng-cache") // 缓存存放的目录
    };
    this.setOptions(options);
  }
  setOptions(options) {
    this.options = Object.assign({}, this.options, options || {});
    // 创建缓存存放目录
    fs.ensureDirSync(this.options.directory);
  }
  has(filePath) {
    let contents = fs.readFileSync(filePath);
    const ext = filePath.substring(filePath.lastIndexOf(".") + 1);
    const filename = md5Hex(contents) + "." + ext;
    return fs.readdirSync(this.options.directory).indexOf(filename) !== -1;
  }
  get(filePath) {
    let contents = fs.readFileSync(filePath);
    const ext = filePath.substring(filePath.lastIndexOf(".") + 1);
    const filename = md5Hex(contents) + "." + ext;
    const filepath = path.join(this.options.directory, filename);
    const compressed = fs.readFileSync(filepath, {
      encoding: null
    });
    if (compressed) {
      contents = compressed;
    }
    return contents;
  }
  set(filePath, compressed) {
    // 缓存写入硬盘
    let contents = fs.readFileSync(filePath);
    const ext = filePath.substring(filePath.lastIndexOf(".") + 1);
    const filename = md5Hex(contents) + "." + ext;
    const filepath = path.join(this.options.directory, filename);
    fs.outputFileSync(filepath, compressed, {
      encoding: null
    });
  }
}

module.exports = new Cache();
