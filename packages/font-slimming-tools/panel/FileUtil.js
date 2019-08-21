'use strict';

let fs = require("fs");
let path = require("path");

let self = module.exports = {
    getDirAllFiles(dirPath, result) {
        let files = fs.readdirSync(dirPath);
        files.forEach((val, index) => {
            let fPath = path.join(dirPath, val);
            let stats = fs.statSync(fPath);
            if (stats.isDirectory()) {
                this.getDirAllFiles(fPath, result);
            } else if (stats.isFile()) {
                result.push(fPath);
            }
        });
    },
    getFileString(fileList, options) {
        let curIndex = 0;
        let totalIndex = fileList.length;
        let str = {};
        for (let key in  fileList) {
            let filePath = fileList[key];
            let b = this._isFileExit(filePath);
            if (b) {
                fs.readFile(filePath, 'utf-8', function (err, data) {
                    if (!err) {
                        self._collectString(data, str);
                    } else {
                        console.log("error: " + filePath);
                    }
                    self._onCollectStep(filePath, ++curIndex, totalIndex, str, options);
                })
            } else {
                self._onCollectStep(filePath, ++curIndex, totalIndex, str, options);
            }
        }
    },
    _onCollectStep(filePath, cur, total, str, data) {
        if (data && data.stepCb) {
            data.stepCb(filePath, cur, total);
        }
        if (cur >= total) {
            self._onCollectOver(str, data);
        }
    },
    _onCollectOver(collectObjArr, data) {
        let strArr = [];
        let str = "";
        for (let k in collectObjArr) {
            str += k;
            strArr.push(k);
        }
        // console.log("一共有" + strArr.length + "个字符, " + strArr);
        console.log("一共有" + strArr.length + "个字符");
        if (data && data.compCb) {
            data.compCb(str);
        }
    },
    _isFileExit(file) {
        try {
            fs.accessSync(file, fs.F_OK);
        } catch (e) {
            return false;
        }
        return true;
    },
    _collectString(data, collectObject) {
        for (let i in data) {
            let char = data.charAt(i);
            if (collectObject[char]) {
                collectObject[char]++;
            } else {
                collectObject[char] = 1;
            }
        }
    },

    /*
        is_fileType($('#uploadfile').val(), 'doc,pdf,txt,wps,odf,md,png,gif,jpg')
    * */
    is_fileType(filename, types) {
        types = types.split(',');
        let pattern = '\.(';
        for (let i = 0; i < types.length; i++) {
            if (0 != i) {
                pattern += '|';
            }
            pattern += types[i].trim();
        }
        pattern += ')$';
        return new RegExp(pattern, 'i').test(filename);
    }
}