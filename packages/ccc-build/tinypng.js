const request = require("request");
const download = require("download");
const fs = require("fs");
const exec = require("child_process").execSync;

let cache;

module.exports = function(filePath, cachePath, callback) {
  // 启用缓存
  if (cachePath) {
    cache = require("./cache");
    // 自定义缓存
    cache.setOptions({
      directory: cachePath
    });
  }
  if (/\.(png|jpg|jpeg|PNG|JPG|JPEG)$/i.test(filePath)) {
    // 只压缩png和jpg文件
    // 提取文件
    extract(filePath, function(error, result) {
      if (error) {
        Editor.error(error);
        callback(error);
      } else {
        callback(null, result);
      }
    });
  } else {
    Editor.error(filePath + "不是png或jpg图片.");
    callback(filePath + "不是png或jpg图片.");
  }
};

/**
 * 提取文件，如果缓存中存在，那么从缓存里面提取，否则去服务器压缩
 * @param {VinylFile} file 等待压缩的文件
 * @param {Function} callback 回调
 */
function extract(filePath, callback) {
  // 先从缓存中取
  if (cache && cache.has(filePath)) {
    const result = cache.get(filePath);
    Editor.log(filePath + "使用缓存.");
    // 更新缓存文件时间，可以删除非这一批
    cache && cache.set(filePath, result);
    return callback(null, result);
  }
  // 压缩文件
  compress(filePath, function(error, result) {
    if (error) {
      callback(filePath + "压缩文件失败." + error);
    } else {
      // 存到缓存
      cache && cache.set(filePath, result);
      Editor.log(filePath + "压缩成功.");
      callback(null, result);
    }
  });
}

/**
 * 去tinypng压缩文件
 * @param {VinylFile} file 等待压缩的文件
 * @param {Function} callback 回调
 */
function compress(filePath, callback) {
  if (/\.(png|PNG)$/i.test(filePath)) {
    let exe_cmd = `/usr/local/bin/pngquant -f --ext .png-c --speed 1 --quality 60-80 ${filePath}`;
    try {
      exec(exe_cmd, { timeout: 3000 });
      const data = fs.readFileSync(filePath + "-c");
      fs.unlink(filePath + "-c");
      return callback(null, data);
    } catch (e) {
      Editor.error(e);
      tiny(filePath, callback);
    }
  } else if (/\.(jpg|jpeg|JPG|JPEG)$/i.test(filePath)) {
    tiny(filePath, callback);
  }
}

function tiny(filePath, callback) {
  request(
    {
      url: "https://tinypng.com/web/shrink",
      method: "POST",
      headers: {
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Connection: "keep-alive",
        Host: "tinypng.com",
        Referer: "https://tinypng.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36"
      },
      body: fs.readFileSync(filePath)
    },
    function(error, rsp) {
      if (error) {
        return callback(error);
      }
      let fileURL;
      try {
        fileURL = JSON.parse(rsp.body).output.url;
      } catch (e) {
        return callback("解析不到下载URL" + JSON.stringify(rsp));
      }
      if (fileURL) {
        download(fileURL)
          .then(function(data) {
            callback(null, data);
          })
          .catch(callback);
        return;
      } else {
        return callback("未获取到压缩后的下载URL.");
      }
    }
  );
}
