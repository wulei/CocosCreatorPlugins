let packageName = "excel-killer";
let fs = require("fire-fs");
let path = require("fire-path");
let CfgUtil = Editor.require("packages://" + packageName + "/core/CfgUtil.js");
let excelItem = Editor.require(
    "packages://" + packageName + "/panel/item/excelItem.js"
);
let nodeXlsx = Editor.require(
    "packages://" + packageName + "/node_modules/node-xlsx"
);
let Electron = require("electron");
let fsExtra = Editor.require(
    "packages://" + packageName + "/node_modules/fs-extra"
);
let chokidar = Editor.require(
    "packages://" + packageName + "/node_modules/chokidar"
);
let jsZip = Editor.require("packages://" + packageName + "/node_modules/jszip");
const Globby = require("globby");

let dirClientName = "client";
let dirServerName = "server";


module.exports = function (dir, dist) {
    Editor.log(dir)
    Editor.log(dist)
    // 查找json文件
    let allFileArr = [];
    let excelFileArr = [];

    let dirInfo = fs.readdirSync(dir);
    for (let i = 0; i < dirInfo.length; i++) {
        let item = dirInfo[i];
        let itemFullPath = path.join(dir, item);
        let info = fs.statSync(itemFullPath);
        if (info.isDirectory()) {
            readDirSync(itemFullPath);
        } else if (info.isFile()) {
            let headStr = item.substr(0, 2);
            if (headStr === "~$") {
                Editor.log("检索到excel产生的临时文件:" + itemFullPath);
            } else {
                allFileArr.push(itemFullPath);
            }
        }
    }


    // 过滤出来.xlsx的文件
    for (let k in allFileArr) {
        let file = allFileArr[k];
        let extName = path.extname(file);
        if (extName === ".xlsx" || extName === ".xls") {
            excelFileArr.push(file);
        } else {
            Editor.log("不支持的文件类型: " + file);
        }
    }

    Editor.log(excelFileArr)

    // this.excelFileArr = excelFileArr;
    // 组装显示的数据
    let excelSheetArray = [];
    let sheetDuplicationChecker = {}; //表单重名检测
    for (let k in excelFileArr) {
        let itemFullPath = excelFileArr[k];
        // Editor.log("excel : " + itemFullPath);

        let excelData = nodeXlsx.parse(itemFullPath);
        for (let j in excelData) {
            let itemData = {
                fullPath: itemFullPath,
                name: "name",
                sheet: excelData[j].name
            };
            itemData.name = itemFullPath.substr(
                dir.length + 1,
                itemFullPath.length - dir.length
            );
            itemData.filename = itemFullPath.substr(
                dir.length + 1,
                itemFullPath.lastIndexOf(".") - dir.length - 1
            );
            // Editor.log(itemData);

            if (excelData[j].data.length === 0) {
                throw Error(
                    "[Error] 空Sheet: " + itemData.name + " - " + itemData.sheet
                );
            }

            if (sheetDuplicationChecker[itemData.sheet]) {
                //  重名sheet问题
                throw Error("[Error ] 出现了重名sheet: " + itemData.sheet +
                    "[Sheet1] " +
                    sheetDuplicationChecker[itemData.sheet].fullPath
                    + "[Sheet2] " + itemFullPath);
            } else {
                sheetDuplicationChecker[itemData.sheet] = itemData;
                excelSheetArray.push(itemData);
            }
        }
    }
    Editor.log(excelSheetArray)
    let excelArray = excelSheetArray

    let jsonAllCfgFileName = "GameJsonCfg"

    let excels = {};
    let jsonAllSaveDataClient = {};
    for (let k in excelArray) {
        let itemSheet = excelArray[k];
        let excelData = null;
        if (excels[itemSheet.fullPath]) {
            excelData = excels[itemSheet.fullPath];
        } else {
            excelData = nodeXlsx.parse(itemSheet.fullPath);
            excels[itemSheet.fullPath] = excelData;
        }
        let sheetData = null;
        for (let j in excelData) {
            if (excelData[j].name === itemSheet.sheet) {
                sheetData = excelData[j].data;
            }
        }
        if (sheetData) {
            if (sheetData.length > 3) {
                let jsonSaveData = _getJsonSaveData(
                    sheetData,
                    itemSheet,
                    true
                );

                if (Object.keys(jsonSaveData).length > 0) {
                    //   为了项目逻辑,哎
                    let isAlone =
                        itemSheet.sheet.indexOf("event_dialogue") >= 0;
                    if (!isAlone) {
                        // 检测重复问题
                        if (
                            jsonAllSaveDataClient[itemSheet.sheet] === undefined
                        ) {
                            jsonAllSaveDataClient[
                                itemSheet.sheet
                                ] = jsonSaveData;
                        } else {
                            throw Error(
                                "发现重名sheet:" + itemSheet.name + "(" + itemSheet.sheet + ")"
                            );
                        }
                    } else {
                        let saveFileFullPath = path.join(
                            dist,
                            itemSheet.sheet + ".json"
                        );
                        _onSaveJsonCfgFile(
                            jsonSaveData,
                            saveFileFullPath
                        );
                    }
                }
            } else {
                throw Error("行数低于3行,无效sheet:" + itemSheet.sheet);
            }
        } else {
            throw Error("未发现数据");
        }

    }
    let saveFileFullPath = path.join(
        dist,
        jsonAllCfgFileName + ".json"
    );
    _onSaveJsonCfgFile(jsonAllSaveDataClient, saveFileFullPath);
}


function _getJsonSaveData(excelData, itemSheet, isClient) {
    let title = excelData[1];
    let desc = excelData[0];
    let target = excelData[2];
    let ruleText = excelData[3];
    let ret = null;

    let saveData2 = {}; // 格式2:id作为索引
    // for (let i = 4; i < excelData.length; i++) {
    for (let i = 3; i < excelData.length; i++) {
        let lineData = excelData[i];
        if (lineData.length !== title.length) {
            throw Error(
                `配置表头和配置数据不匹配:${itemSheet.name} - ${
                    itemSheet.sheet
                } : 第${i + 1}行`
            );
        }

        let saveLineData = {};
        let canExport = false;

        // todo 将ID字段也加入到data中
        for (let j = 0; j < title.length; j++) {
            canExport = false;
            if (isClient && target[j] && target[j].indexOf("c") !== -1) {
                canExport = true;
            } else if (
                !isClient &&
                target[j] &&
                target[j].indexOf("s") !== -1
            ) {
                canExport = true;
            }

            if (canExport) {
                let key = title[j];

                // let rule = ruleText[j].trim();
                // if (key === 'Empty' || rule === 'Empty') {
                //     continue;
                // }

                let value = lineData[j];
                if (value === undefined) {
                    value = "";
                }

                // if (value) {
                //     value = this.cutString(rule, value);
                // }

                // this._addLog("" + value);
                saveLineData[key] = value;
            }

            canExport = false;
            if (isClient && target[0] && target[0].indexOf("c") !== -1) {
                canExport = true;
            } else if (
                !isClient &&
                target[0] &&
                target[0].indexOf("s") !== -1
            ) {
                canExport = true;
            }
            if (canExport) {
                saveData2[lineData[0].toString()] = saveLineData;
            }
        }
        ret = saveData2;
    }
    return ret;
}

function _onSaveJsonCfgFile(data, saveFileFullPath) {
    return new Promise((resolve, reject) => {
        let str = JSON.stringify(data);

        let zip = new jsZip();
        zip.file(this.jsonAllCfgFileName, str);
        zip.generateAsync({
            type: "base64",
            compression: "DEFLATE",
            compressionOptions: {
                level: 9 // 压缩等级1~9    1压缩速度最快，9最优压缩方式
                // [使用一张图片测试之后1和9压缩的力度不大，相差100字节左右]
            }
        }).then(function (content) {
            fs.writeFile(
                saveFileFullPath + ".txt",
                content
                // new Buffer(content).toString("base64")
            );
            resolve()
        });

    });
}