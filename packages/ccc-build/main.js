var fs = require("fs");
var walk = require("walk");
var tinypng = require("./tinypng");
var excel = require("./excel");

function onBeforeBuildFinish(options, callback) {
    Editor.log("~~~~~~~~~~~~~~~~~cc-build~~~~~~~~~~~~~~~~");
    Editor.log("Building " + options.platform + " to " + options.dest); // 你可以在控制台输出点什么
    Editor.log(JSON.stringify(options));

    // var mainJsPath = path.join(options.dest, 'main.js'); // 获取发布目录下的 main.js 所在路径
    // var script = fs.readFileSync(mainJsPath, 'utf8'); // 读取构建好的 main.js
    // script += '\n' + 'window.myID = "01234567";'; // 添加一点脚本到
    // fs.writeFileSync(mainJsPath, script); // 保存 main.js

    var walker = walk.walk(options.dest, {
        followLinks: false
    });

    walker.on("file", function (roots, stat, next) {
        let path = roots + "/" + stat.name;
        if (/\.(png|jpg|jpeg|PNG|JPG|JPEG)$/i.test(path)) {
            tinypng(path, options.project + "/tinypng-cache", (error, result) => {
                if (!error) {
                    fs.writeFileSync(path, result);
                }
                next();
            });
            next();
        } else if (/\.(mp3)$/i.test(path)) {
            next();
        } else if (/\.(json)$/i.test(path)) {
            // 处理spine缺少字段问题
            const data = fs.readFileSync(path);
            let obj = JSON.parse(data);
            if (!!obj["skeleton"] && !obj["skeleton"]["spine"]) {
                Editor.log("没有spine版本号补齐：" + path);
                obj["skeleton"]["spine"] = "3.6.0";
                fs.writeFileSync(path, JSON.stringify(obj));
            }
            next();
        } else {
            next();
        }
    });

    walker.on("end", function () {
        callback();
    });
}

function onBeforeBuildEnd(options, callback) {
    callback();
}

function onBeforeBuildStart(options, callback) {
    Editor.log("~~~~~~~~~~~~~~~~~cc-start~~~~~~~~~~~~~~~~");
    Editor.log("Building " + options.platform + " to " + options.dest); // 你可以在控制台输出点什么
    Editor.log(JSON.stringify(options));


    excel(options.project + '/excel', options.project + '/assets/resources/json')
    setTimeout(callback, 5000)
}

module.exports = {

    load() {
        Editor.log("~~~~~~~~~~~~~~~~~cc-init~~~~~~~~~~~~~~~~", Editor.Project.path);
        excel(Editor.Project.path + '/excel', Editor.Project.path + '/assets/resources/json')
        Editor.Builder.on("before-change-files", onBeforeBuildFinish);
        Editor.Builder.on("build-finished", onBeforeBuildEnd);
        Editor.Builder.on("build-start", onBeforeBuildStart);
    },

    unload() {
        Editor.Builder.off("before-change-files", onBeforeBuildFinish);
        Editor.Builder.off("build-finished", onBeforeBuildEnd);
        Editor.Builder.off("build-start", onBeforeBuildStart);
    }
};
