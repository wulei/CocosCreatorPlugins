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

Editor.Panel.extend({
  style:
    fs.readFileSync(
      Editor.url("packages://" + packageName + "/panel/index.css", "utf8")
    ) + "",
  template:
    fs.readFileSync(
      Editor.url("packages://" + packageName + "/panel/index.html", "utf8")
    ) + "",

  $: {
    logTextArea: "#logTextArea"
  },

  ready() {
    let logCtrl = this.$logTextArea;
    let logListScrollToBottom = function() {
      setTimeout(function() {
        logCtrl.scrollTop = logCtrl.scrollHeight;
      }, 10);
    };

    excelItem.init();
    this.plugin = new window.Vue({
      el: this.shadowRoot,
      created() {
        this._initPluginCfg();
      },
      init() {},
      data: {
        logView: "",
        excelRootPath: null,

        isMergeJson: false,
        isMergeExcelJson: false,
        isMergeJavaScript: false,
        isExportJson: false, // 是否导出Json
        isExportJs: false, // 是否导出Js
        isFormatJson: false, // 是否格式化Json
        isExportClient: false, // 是否导出客户端
        isExportServer: false, // 是否导出服务端
        isJsonAllCfgFileExist: false, // 是否单一配置文件存在
        jsonSavePath: null, // json保存文件夹路径
        jsonAllCfgFileName: null, // json配置文件名
        useZip: false, // 是否使用zip

        jsSavePath: null, // 插件资源目录
        jsFileName: null, //js配置合并为一个文件的文件名
        isJsFileExist: false,
        isFormatJsCode: false,
        excelArray: [],
        excelFileArr: [],

        importProjectCfgPath: null
      },
      methods: {
        ////////////////////////////导入到项目////////////////////////////////////////////
        onBtnClickSelectProjectJsonCfgPath() {
          let res = Editor.Dialog.openFile({
            title: "选择项目配置存放目录",
            defaultPath: path.join(Editor.projectInfo.path, "assets"),
            properties: ["openDirectory"]
          });
          if (res !== -1) {
            let dir = res[0];
            if (dir !== this.importProjectCfgPath) {
              this.importProjectCfgPath = dir;
              this._saveConfig();
            }
          }
        },
        onBtnClickImportProjectJsonCfg_Server() {
          this._importJsonCfg("server");
        },
        onBtnClickImportProjectJsonCfg_Client() {
          this._importJsonCfg("client");
        },
        _importJsonCfg(typeDir) {
          if (!fs.existsSync(this.importProjectCfgPath)) {
            this._addLog("导入项目路径不存在:" + this.importProjectCfgPath);
            return;
          }

          if (!this.isExportJson) {
            this._addLog(
              "[Warning] 您未勾选导出Json配置,可能导入的配置时上个版本的!"
            );
          }
          let importPath = Editor.assetdb.remote.fspathToUrl(
            this.importProjectCfgPath
          );
          if (importPath.indexOf("db://assets") >= 0) {
            // 检索所有的json配置
            let clientDir = path.join(this.jsonSavePath, typeDir);
            if (!fs.existsSync(clientDir)) {
              this._addLog("配置目录不存在:" + clientDir);
              return;
            }
            let pattern = path.join(clientDir, "**/*.json");
            if (this.useZip) {
              pattern = path.join(clientDir, "**/*.txt");
            } else {
              pattern = path.join(clientDir, "**/*.json");
            }
            let files = Globby.sync(pattern);
            this._addLog("一共导入文件数量: " + files.length);
            for (let i = 0; i < files.length; i++) {}
            Editor.assetdb.import(
              files,
              importPath,
              function(err, results) {
                results.forEach(function(result) {
                  console.log(result.path);
                  // result.uuid
                  // result.parentUuid
                  // result.url
                  // result.path
                  // result.type
                });
              }.bind(this)
            );
          } else {
            this._addLog("非项目路径,无法导入 : " + this.importProjectCfgPath);
          }
        },
        ////////////////////////////////////////////////////////////////////////
        _cleanLog() {
          this.logView = "";
        },
        _addLog(str) {
          let time = new Date();
          // this.logView = "[" + time.toLocaleString() + "]: " + str + "\n" + this.logView;
          this.logView += "[" + time.toLocaleString() + "]: " + str + "\n";
          logListScrollToBottom();
        },
        _saveConfig() {
          let data = {
            excelRootPath: this.excelRootPath,
            jsFileName: this.jsFileName,
            jsonAllFileName: this.jsonAllCfgFileName,
            isMergeJson: this.isMergeJson,
            isMergeExcelJson: this.isMergeExcelJson,
            isMergeJavaScript: this.isMergeJavaScript,
            isFormatJsCode: this.isFormatJsCode,
            isFormatJson: this.isFormatJson,
            isExportJson: this.isExportJson,
            isExportJs: this.isExportJs,
            isExportClient: this.isExportClient,
            isExportServer: this.isExportServer,
            importProjectCfgPath: this.importProjectCfgPath,
            useZip: this.useZip
          };
          CfgUtil.saveCfgByData(data);
        },
        onBtnClickFreshExcel() {
          this._onAnalyzeExcelDirPath(this.excelRootPath);
        },
        _watchDir(event, filePath) {
          return;
          console.log("监控文件....");
          console.log(event, filePath);
          let ext = path.extname(filePath);
          if (ext === ".xlsx" || ext === ".xls") {
            this._onAnalyzeExcelDirPath(this.excelRootPath);
          }
        },
        _initPluginCfg() {
          console.log("initCfg");
          CfgUtil.initCfg(
            function(data) {
              if (data) {
                this.excelRootPath = data.excelRootPath || "";
                if (fs.existsSync(this.excelRootPath)) {
                  this._onAnalyzeExcelDirPath(this.excelRootPath);
                  chokidar
                    .watch(this.excelRootPath, {
                      usePolling: true
                      // interval: 1000,
                      // awaitWriteFinish: {
                      //     stabilityThreshold: 2000,
                      //     pollInterval: 100
                      // },
                    })
                    .on("all", this._watchDir.bind(this));
                } else {
                }
                this.jsFileName = data.jsFileName || "GameJsCfg";
                this.jsonAllCfgFileName = data.jsonAllFileName || "GameJsonCfg";
                this.isMergeJson = data.isMergeJson || false;
                this.isMergeExcelJson = data.isMergeExcelJson || false;
                this.isMergeJavaScript = data.isMergeJavaScript || false;
                this.isFormatJsCode = data.isFormatJsCode || false;
                this.isFormatJson = data.isFormatJson || false;
                this.isExportJson = data.isExportJson || false;
                this.isExportJs = data.isExportJs || false;
                this.isExportClient = data.isExportClient || false;
                this.isExportServer = data.isExportServer || false;
                this.importProjectCfgPath = data.importProjectCfgPath || null;
                this.useZip = data.useZip || false;
                this.checkJsFileExist();
                this.checkJsonAllCfgFileExist();
              } else {
                this.jsFileName = "GameJsCfg";
                this.jsonAllCfgFileName = "GameJsonCfg";
              }
            }.bind(this)
          );
          this._initCfgSavePath(); // 默认json路径
        },
        _initCfgSavePath() {
          let projectPath = Editor.projectInfo.path;
          let pluginResPath = path.join(projectPath, "plugin-resource");
          if (!fs.existsSync(pluginResPath)) {
            fs.mkdirSync(pluginResPath);
          }

          let pluginResPath1 = path.join(pluginResPath, "json");
          if (!fs.existsSync(pluginResPath1)) {
            fs.mkdirSync(pluginResPath1);
          }
          this.jsonSavePath = pluginResPath1;
          this._initCSDir(this.jsonSavePath);

          let pluginResPath2 = path.join(pluginResPath, "js");
          if (!fs.existsSync(pluginResPath2)) {
            fs.mkdirSync(pluginResPath2);
          }
          this.jsSavePath = pluginResPath2;
          this._initCSDir(this.jsSavePath);
        },
        // 初始化client-server目录
        _initCSDir(saveDir) {
          let clientDir = path.join(saveDir, dirClientName);
          if (!fs.existsSync(clientDir)) {
            fs.mkdirSync(clientDir);
          }
          let serverDir = path.join(saveDir, dirServerName);
          if (!fs.existsSync(serverDir)) {
            fs.mkdirSync(serverDir);
          }
        },
        onBtnClickFormatJson() {
          this.isFormatJson = !this.isFormatJson;
          this._saveConfig();
        },
        // 是否合并json
        onBtnClickMergeJson() {
          this.isMergeJson = !this.isMergeJson;
          this._saveConfig();
        },
        onBtnClickMergeExcelJson() {
          this.isMergeExcelJson = !this.isMergeExcelJson;
          this._saveConfig();
        },
        onBtnClickMergeJavaScript() {
          this.isMergeJavaScript = !this.isMergeJavaScript;
          this._saveConfig();
        },
        // 打开合并的json
        onBtnClickJsonAllCfgFile() {
          let saveFileFullPath1 = path.join(
            this.jsonSavePath,
            dirClientName,
            this.jsonAllCfgFileName + ".json"
          );
          let saveFileFullPath2 = path.join(
            this.jsonSavePath,
            dirServerName,
            this.jsonAllCfgFileName + ".json"
          );
          if (fs.existsSync(saveFileFullPath1)) {
            Electron.shell.openItem(saveFileFullPath1);
            Electron.shell.beep();
          } else if (fs.existsSync(saveFileFullPath2)) {
            Electron.shell.openItem(saveFileFullPath2);
            Electron.shell.beep();
          } else {
            // this._addLog("目录不存在：" + this.resourceRootDir);
            this._addLog(
              "目录不存在:" + saveFileFullPath1 + " or:" + saveFileFullPath2
            );
            return;
          }
        },
        checkJsonAllCfgFileExist() {
          let saveFileFullPath1 = path.join(
            this.jsonSavePath,
            dirClientName,
            this.jsonAllCfgFileName + ".json"
          );
          let saveFileFullPath2 = path.join(
            this.jsonSavePath,
            dirServerName,
            this.jsonAllCfgFileName + ".json"
          );
          if (
            fs.existsSync(saveFileFullPath1) ||
            fs.existsSync(saveFileFullPath2)
          ) {
            this.isJsonAllCfgFileExist = true;
          } else {
            this.isJsonAllCfgFileExist = false;
          }
        },
        onBtnClickFormatJsCode() {
          this.isFormatJsCode = !this.isFormatJsCode;
          this._saveConfig();
        },
        onBtnClickOpenExcelRootPath() {
          if (fs.existsSync(this.excelRootPath)) {
            Electron.shell.showItemInFolder(this.excelRootPath);
            Electron.shell.beep();
          } else {
            this._addLog("目录不存在：" + this.excelRootPath);
          }
        },
        onBtnClickSelectExcelRootPath() {
          let res = Editor.Dialog.openFile({
            title: "选择Excel的根目录",
            defaultPath: Editor.projectInfo.path,
            properties: ["openDirectory"]
          });
          if (res !== -1) {
            let dir = res[0];
            if (dir !== this.excelRootPath) {
              this.excelRootPath = dir;
              chokidar
                .watch(this.excelRootPath)
                .on("all", this._watchDir.bind(this));
              this._onAnalyzeExcelDirPath(dir);
              this._saveConfig();
            }
          }
        },
        // 修改js配置文件
        onJsFileNameChanged() {
          this._saveConfig();
        },
        // 修改json配置文件
        onJsonAllCfgFileChanged() {
          this._saveConfig();
        },
        onBtnClickIsExportJson() {
          this.isExportJson = !this.isExportJson;
          this._saveConfig();
        },
        onBtnClickIsExportJs() {
          this.isExportJs = !this.isExportJs;
          this._saveConfig();
        },
        onBtnClickUseZip() {
          this.useZip = !this.useZip;
          this._saveConfig();
        },
        onBtnClickExportClient() {
          this.isExportClient = !this.isExportClient;
          this._saveConfig();
        },
        onBtnClickExportServer() {
          this.isExportServer = !this.isExportServer;
          this._saveConfig();
        },
        // 查找出目录下的所有excel文件
        _onAnalyzeExcelDirPath(dir) {
          let self = this;

          // let dir = path.normalize("D:\\proj\\CocosCreatorPlugins\\doc\\excel-killer");
          if (dir) {
            // 查找json文件
            let allFileArr = [];
            let excelFileArr = [];
            // 获取目录下所有的文件
            readDirSync(dir);
            // 过滤出来.xlsx的文件
            for (let k in allFileArr) {
              let file = allFileArr[k];
              let extName = path.extname(file);
              if (extName === ".xlsx" || extName === ".xls") {
                excelFileArr.push(file);
              } else {
                this._addLog("不支持的文件类型: " + file);
              }
            }

            this.excelFileArr = excelFileArr;
            // 组装显示的数据
            let excelSheetArray = [];
            let sheetDuplicationChecker = {}; //表单重名检测
            for (let k in excelFileArr) {
              let itemFullPath = excelFileArr[k];
              // this._addLog("excel : " + itemFullPath);

              let excelData = nodeXlsx.parse(itemFullPath);
              //todo 检测重名的sheet
              for (let j in excelData) {
                let itemData = {
                  isUse: true,
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
                // console.log(itemData);

                if (excelData[j].data.length === 0) {
                  this._addLog(
                    "[Error] 空Sheet: " + itemData.name + " - " + itemData.sheet
                  );
                  continue;
                }

                if (sheetDuplicationChecker[itemData.sheet]) {
                  //  重名sheet问题
                  this._addLog("[Error ] 出现了重名sheet: " + itemData.sheet);
                  this._addLog(
                    "[Sheet1] " +
                      sheetDuplicationChecker[itemData.sheet].fullPath
                  );
                  this._addLog("[Sheet2] " + itemFullPath);
                  this._addLog("请仔细检查Excel-Sheet!");
                } else {
                  sheetDuplicationChecker[itemData.sheet] = itemData;
                  excelSheetArray.push(itemData);
                }
              }
            }
            this.excelArray = excelSheetArray;

            function readDirSync(dirPath) {
              let dirInfo = fs.readdirSync(dirPath);
              for (let i = 0; i < dirInfo.length; i++) {
                let item = dirInfo[i];
                let itemFullPath = path.join(dirPath, item);
                let info = fs.statSync(itemFullPath);
                if (info.isDirectory()) {
                  // this._addLog('dir: ' + itemFullPath);
                  readDirSync(itemFullPath);
                } else if (info.isFile()) {
                  let headStr = item.substr(0, 2);
                  if (headStr === "~$") {
                    self._addLog("检索到excel产生的临时文件:" + itemFullPath);
                  } else {
                    allFileArr.push(itemFullPath);
                  }
                  // this._addLog('file: ' + itemFullPath);
                }
              }
            }
          }
        },
        onStopTouchEvent(event) {
          event.preventDefault();
          event.stopPropagation();
          // console.log("dragOver");
        },
        onBtnClickSelectSheet(event) {
          let b = event.currentTarget.value;
          for (let k in this.excelArray) {
            this.excelArray[k].isUse = b;
          }
        },
        onBtnClickOpenJsonSavePath() {
          let saveFileFullPath1 = path.join(this.jsonSavePath, dirClientName);
          let saveFileFullPath2 = path.join(this.jsonSavePath, dirServerName);
          if (fs.existsSync(saveFileFullPath1)) {
            Electron.shell.openItem(saveFileFullPath1);
            Electron.shell.beep();
          } else if (fs.existsSync(saveFileFullPath2)) {
            Electron.shell.openItem(saveFileFullPath2);
            Electron.shell.beep();
          } else {
            // this._addLog("目录不存在：" + this.resourceRootDir);
            this._addLog(
              "目录不存在:" + saveFileFullPath1 + " or:" + saveFileFullPath2
            );
            return;
          }
        },
        onBtnClickOpenJsSavePath() {
          let saveFileFullPath1 = path.join(this.jsSavePath, dirClientName);
          let saveFileFullPath2 = path.join(this.jsSavePath, dirServerName);
          if (fs.existsSync(saveFileFullPath1)) {
            Electron.shell.openItem(saveFileFullPath1);
            Electron.shell.beep();
          } else if (fs.existsSync(saveFileFullPath2)) {
            Electron.shell.openItem(saveFileFullPath2);
            Electron.shell.beep();
          } else {
            // this._addLog("目录不存在：" + this.resourceRootDir);
            this._addLog(
              "目录不存在:" + saveFileFullPath1 + " or:" + saveFileFullPath2
            );
            return;
          }
        },

        _getJavaScriptSaveData(excelData, itemSheet, isClient) {
          let title = excelData[1];
          let desc = excelData[0];
          let target = excelData[2];
          let ruleText = excelData[3];
          let sheetFormatData = {};
          for (let i = 4; i < excelData.length; i++) {
            let lineData = excelData[i];
            if (lineData.length === 0) {
              // 空行直接跳过
              continue;
            } else {
              if (lineData.length < title.length) {
                this._addLog(
                  "[Error] 发现第" + i + "行缺少字段,跳过该行数据配置."
                );
                continue;
              } else if (lineData.length > title.length) {
                this._addLog(
                  "[Error] 发现第" + i + "行多余字段,跳过该行数据配置."
                );
                continue;
              }
            }
            let saveLineData = {};
            let canExport = false;
            for (let j = 1; j < title.length; j++) {
              canExport = false;
              if (isClient && target[j].indexOf("c") !== -1) {
                canExport = true;
              } else if (!isClient && target[j].indexOf("s") !== -1) {
                canExport = true;
              }

              if (canExport) {
                let key = title[j];
                let rule = "";

                // if (typeof ruleText[j] === 'string')
                // {
                //     rule = ruleText[j].trim();
                // }
                // else
                // {
                //     this._addLog(`[exception] ${j + 1}列规则文本异常，请检查`);
                //     continue;
                // }

                if (key === "Empty" || rule === "Empty") {
                  continue;
                }

                let value = lineData[j];
                if (value === undefined) {
                  value = "";
                  this._addLog(
                    "[Error] 发现空单元格:" +
                      itemSheet.name +
                      "*" +
                      itemSheet.sheet +
                      " => (" +
                      key +
                      "," +
                      (i + 1) +
                      ")"
                  );
                }

                // if (value) {
                //     value = this.cutString(rule, value);
                // }

                saveLineData[key] = value;
              }
            }

            canExport = false;
            if (isClient && target[0].indexOf("c") !== -1) {
              canExport = true;
            } else if (!isClient && target[0].indexOf("s") !== -1) {
              canExport = true;
            }
            if (canExport) {
              sheetFormatData[lineData[0].toString()] = saveLineData;
            }
          }
          return sheetFormatData;
        },

        _getJsonSaveData(excelData, itemSheet, isClient) {
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
              this._addLog(
                `配置表头和配置数据不匹配:${itemSheet.name} - ${
                  itemSheet.sheet
                } : 第${i + 1}行`
              );
              this._addLog("跳过该行数据");
              continue;
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
        },

        /**
         * 切割字符串数据
         * @param {string} rule 规则字符串
         * @param {string} text 数据字符串
         */
        cutString(rule, text) {
          let result = null;

          if (typeof text == "string") {
            text = text.trim();
            text = text.replace(/\n|\r/g, "");

            if (text[text.length - 1].search(/;|,/) != -1) {
              text = text.slice(0, text.length - 1);
            } else if (text[0].search(/;|,/) != -1) {
              text = text.slice(1, text.length);
            }
          }

          // {1,2};{3,4}
          // {1,[2;3]};{4,[5,6]}
          // {1,2,[String;String]};{3,4,[String;String]}
          // {1,2,String};{3,4,String}
          if (rule.search(/Array\[Object\{[a-zA-Z0-9\[\]:,"]*\}\]/) != -1) {
            result = [];

            // 替换数据中的字符串为 “String” 形式
            if (rule.search(/String/) != -1) {
              let stringData = text.match(/[^(\[|\]|;|:)|\{|\}|,]+/g);
              let noneDuplicates = [];
              let noNumberReg = /^\d+(\.\d+)?$/;
              for (let value of stringData) {
                if (!noNumberReg.test(value)) {
                  noneDuplicates.push(value);
                }
              }

              for (let value of noneDuplicates) {
                let notHead = text.search(eval(`/^[${value}]/`)) == -1;
                let searchReg = new RegExp(
                  notHead
                    ? `[^(")]${value}{1}[;|\\]|,|}]`
                    : `^${value}{1}[;|\\]|,|}]`
                );
                let index = text.search(searchReg);

                if (index != -1) {
                  index = index + (notHead ? 1 : 0);
                  text =
                    text.slice(0, index) +
                    `"${value}"` +
                    text.slice(index + value.length, text.length);
                }
              }
            }

            let array = null;
            let insideRult = rule.match(/Object\{[a-zA-Z0-9\[\]:,"]*\}/);

            if (insideRult[0].indexOf("Array") == -1) {
              let textArray = text.split(";");
              array = [];
              for (let item of textArray) {
                array.push(`{${item}}`);
              }
            } else {
              array = text.match(/{[^({|})]*}/g);
            }

            let dataArray = [];
            array.forEach(item => {
              let element = item.replace(/\{/g, "[");
              element = element.replace(/\}/g, "]");
              element = element.replace(/;/g, ",");
              element = JSON.parse(element);

              dataArray.push(element);
            });

            let keys = [];
            let reg = /"([a-zA-Z0-9]*)":/g;
            let test = reg.exec(rule);

            while (test) {
              let key = test[0].replace(/(:|\")/g, "");
              keys.push(key);

              test = reg.exec(rule);
            }

            for (let i = 0; i < dataArray.length; ++i) {
              let obj = {};
              let data = dataArray[i];

              let index = 0;
              for (let key of keys) {
                obj[key] = data[index];
                index++;
              }

              result.push(obj);
            }
          }
          // [1;2];[3;4]
          // [1;2]
          else if (
            rule.search(/Array\[Array\[Number\]\]/) === 0 ||
            rule.search(/Array\[Number\]/) === 0
          ) {
            let str = `[${text}]`;
            str = str.replace(/;/g, ",");
            result = JSON.parse(str);
          }
          // String;String
          else if (rule.search(/Array\[String\]/) === 0) {
            let newText = "";

            let textArray = text.match(/[^(\[|\]|;)]+/g);
            let index = 0;
            let edge = textArray.length;

            for (let subString of textArray) {
              newText = `${newText}"${subString}"`;
              index++;

              if (index == edge) {
                break;
              }

              newText += ",";
            }

            newText = `[${newText}]`;
            newText = newText.replace(/;/g, ",");

            try {
              result = JSON.parse(newText);
            } catch (exception) {
              debugger;
            }
          }
          // [String;String];[String;String]
          else if (rule.search(/Array\[Array\[String\]\]/) === 0) {
            result = [];

            let array = text.match(/\[[^(\[|\])]*\]/g);

            for (let item of array) {
              let textArray = item.match(/[^(\[|\]|;)]+/g);
              let newText = "";
              let index = 0;
              let edge = textArray.length - 1;
              for (let subString of textArray) {
                newText = `${newText}"${subString}"`;
                index++;

                if (index == edge) {
                  break;
                }

                newText += ",";
              }

              newText = `[${newText}]`;

              let json = JSON.parse(newText);
              result.push(json);
            }
          } else if (rule.search(/Object\{[a-zA-Z0-9\[\]:,"]*\}/) === 0) {
            result = {};

            if (rule.search(/String/) != -1) {
              let stringData = text.match(/[^(\[|\]|;|:)|\{|\}|,]+/g);
              let noneDuplicates = [];
              let noNumberReg = /^\d+(\.\d+)?$/;
              for (let value of stringData) {
                if (!noNumberReg.test(value)) {
                  noneDuplicates.push(value);
                }
              }

              for (let value of noneDuplicates) {
                let notHead = text.search(eval(`/^[${value}]/`)) == -1;
                let searchReg = new RegExp(
                  notHead
                    ? `[^(")]${value}{1}[;|\\]|,|}]`
                    : `^${value}{1}[;|\\]|,|}]`
                );
                let index = text.search(searchReg);

                if (index != -1) {
                  index = index + (notHead ? 1 : 0);
                  text =
                    text.slice(0, index) +
                    `"${value}"` +
                    text.slice(index + value.length, text.length);
                }
              }
            }

            let keys = [];
            let reg = /"([a-zA-Z0-9]*)":/g;
            let test = reg.exec(rule);

            while (test) {
              let key = test[0].replace(/(:|\")/g, "");
              keys.push(key);

              test = reg.exec(rule);
            }

            let str = `[${text}]`;
            str = str.replace(/;/g, ",");

            let json = null;
            try {
              json = JSON.parse(str);
            } catch (e) {
              debugger;
            }

            let index = 0;
            for (let key of keys) {
              result[key] = json[index];
              index++;
            }
          }
          // 1
          else if (rule.search("Number") === 0) {
            result = Number(text);
          }
          // String
          else if (rule.search("String") === 0) {
            result = text;
          }

          return result;
        },

        // 打开生成的js配置文件
        onBtnClickOpenJsFile() {
          let saveFileFullPath1 = path.join(
            this.jsSavePath,
            dirClientName,
            this.jsFileName + ".js"
          );
          let saveFileFullPath2 = path.join(
            this.jsSavePath,
            dirServerName,
            this.jsFileName + ".js"
          );
          if (fs.existsSync(saveFileFullPath1)) {
            Electron.shell.openItem(saveFileFullPath1);
            Electron.shell.beep();
          } else if (fs.existsSync(saveFileFullPath2)) {
            Electron.shell.openItem(saveFileFullPath2);
            Electron.shell.beep();
          } else {
            // this._addLog("目录不存在：" + this.resourceRootDir);
            this._addLog(
              "目录不存在:" + saveFileFullPath1 + " or:" + saveFileFullPath2
            );
          }
        },
        // 检测js配置文件是否存在
        checkJsFileExist() {
          let saveFileFullPath1 = path.join(
            this.jsSavePath,
            dirClientName,
            this.jsFileName + ".js"
          );
          let saveFileFullPath2 = path.join(
            this.jsSavePath,
            dirServerName,
            this.jsFileName + ".js"
          );
          if (
            fs.existsSync(saveFileFullPath1) ||
            fs.existsSync(saveFileFullPath2)
          ) {
            this.isJsFileExist = true;
          } else {
            this.isJsFileExist = false;
          }
        },
        // 生成配置
        async onBtnClickGen() {
          console.log("onBtnClickGen");
          // 参数校验
          if (this.excelArray.length <= 0) {
            this._addLog("未发现要生成的配置!");
            return;
          }

          if (this.isMergeJson) {
            if (
              !this.jsonAllCfgFileName ||
              this.jsonAllCfgFileName.length <= 0
            ) {
              this._addLog("请输入要保存的json文件名!");
              return;
            }
          }
          if (this.isMergeJavaScript) {
            if (!this.jsFileName || this.jsFileName.length <= 0) {
              this._addLog("请输入要保存的js文件名!");
              return;
            }
          }
          // TODO
          if (this.isExportServer === false && this.isExportClient === false) {
            this._addLog("请选择要导出的目标!");
            return;
          }

          if (this.isExportJson === false && this.isExportJs === false) {
            this._addLog("请选择要导出的类型!");
            return;
          }

          this.logView = "";
          // 删除老的配置
          let jsonSavePath1 = path.join(this.jsonSavePath, dirClientName);
          let jsonSavePath2 = path.join(this.jsonSavePath, dirServerName);
          fsExtra.emptyDirSync(jsonSavePath1);
          fsExtra.emptyDirSync(jsonSavePath2);

          let jsSavePath1 = path.join(this.jsSavePath, dirClientName);
          let jsSavePath2 = path.join(this.jsSavePath, dirServerName);
          fsExtra.emptyDirSync(jsSavePath1);
          fsExtra.emptyDirSync(jsSavePath2);

          let excels = {};
          let jsonAllSaveDataClient = {}; // 保存客户端的json数据
          let excelJsonAllSaveDataClient = {}; // 保存客户端的json数据加上excel的key
          let jsonAllSaveDataServer = {}; // 保存服务端的json数据

          let jsAllSaveDataClient = {}; // 保存客户端的js数据
          let jsAllSaveDataServer = {}; // 保存服务端的js数据

          //  这里代码写的啥，如果一个表中有1000个sheet，excel既然要解析1000次
          for (let k in this.excelArray) {
            let itemSheet = this.excelArray[k];
            if (itemSheet.isUse) {
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
                  if (this.isExportJson) {
                    // 保存为json
                    let writeFileJson = async function(pathSave, isClient) {
                      let jsonSaveData = this._getJsonSaveData(
                        sheetData,
                        itemSheet,
                        isClient
                      );

                      if (Object.keys(jsonSaveData).length > 0) {
                        //   为了项目逻辑,哎
                        let isAlone =
                          itemSheet.sheet.indexOf("event_dialogue") >= 0;
                        if (this.isMergeJson && !isAlone) {
                          // 检测重复问题
                          if (
                            jsonAllSaveDataClient[itemSheet.sheet] === undefined
                          ) {
                            jsonAllSaveDataClient[
                              itemSheet.sheet
                            ] = jsonSaveData;
                          } else {
                            this._addLog(
                              "发现重名sheet:" +
                                itemSheet.name +
                                "(" +
                                itemSheet.sheet +
                                ")"
                            );
                          }
                        } else if (this.isMergeExcelJson) {
                          if (
                            excelJsonAllSaveDataClient[itemSheet.filename] ==
                            undefined
                          ) {
                            excelJsonAllSaveDataClient[itemSheet.filename] = {};
                          }
                          if (
                            excelJsonAllSaveDataClient[itemSheet.filename][
                              itemSheet.sheet
                            ] == undefined
                          ) {
                            excelJsonAllSaveDataClient[itemSheet.filename][
                              itemSheet.sheet
                            ] = jsonSaveData;
                          } else {
                            this._addLog(
                              "发现重名sheet:" +
                                itemSheet.name +
                                "(" +
                                itemSheet.sheet +
                                ")"
                            );
                          }
                        } else {
                          let saveFileFullPath = path.join(
                            pathSave,
                            itemSheet.sheet + ".json"
                          );
                          this._onSaveJsonCfgFile(
                            jsonSaveData,
                            saveFileFullPath
                          );
                        }
                      }
                    }.bind(this);
                    if (this.isExportClient) {
                      writeFileJson(jsonSavePath1, true);
                    }
                    if (this.isExportServer) {
                      writeFileJson(jsonSavePath2, false);
                    }
                  }
                  if (this.isExportJs) {
                    // 保存为js
                    let writeFileJs = function(savePath, isClient) {
                      let sheetJsData = this._getJavaScriptSaveData(
                        sheetData,
                        itemSheet,
                        isClient
                      );
                      if (Object.keys(sheetJsData).length > 0) {
                        if (this.isMergeJavaScript) {
                          if (isClient) {
                            // 检测重复问题
                            if (
                              jsAllSaveDataClient[itemSheet.sheet] === undefined
                            ) {
                              jsAllSaveDataClient[
                                itemSheet.sheet
                              ] = sheetJsData;
                            } else {
                              this._addLog(
                                "发现重名sheet:" +
                                  itemSheet.name +
                                  "(" +
                                  itemSheet.sheet +
                                  ")"
                              );
                            }
                          } else {
                            // 检测重复问题
                            if (
                              jsAllSaveDataServer[itemSheet.sheet] === undefined
                            ) {
                              jsAllSaveDataServer[
                                itemSheet.sheet
                              ] = sheetJsData;
                            } else {
                              this._addLog(
                                "发现重名sheet:" +
                                  itemSheet.name +
                                  "(" +
                                  itemSheet.sheet +
                                  ")"
                              );
                            }
                          }
                        } else {
                          // 保存js配置
                          let fileNameFullPath = path.join(
                            savePath,
                            itemSheet.sheet + ".js"
                          );
                          this._onSaveJavaScriptCfgFile(
                            fileNameFullPath,
                            sheetJsData
                          );
                        }
                      }
                    }.bind(this);
                    if (this.isExportClient) writeFileJs(jsSavePath1, true);
                    if (this.isExportServer) writeFileJs(jsSavePath2, false);
                  }
                } else {
                  this._addLog("行数低于3行,无效sheet:" + itemSheet.sheet);
                }
              } else {
                this._addLog("未发现数据");
              }
            } else {
              console.log(
                "忽略配置: " + itemSheet.fullPath + " - " + itemSheet.sheet
              );
            }
          }
          //   =============合并excel json文件
          if (this.isMergeExcelJson) {
            console.log(excelJsonAllSaveDataClient);
            for (let k in excelJsonAllSaveDataClient) {
              let saveFileFullPath = path.join(jsonSavePath1, k + ".json");
              this._onSaveJsonCfgFile(
                excelJsonAllSaveDataClient[k],
                saveFileFullPath
              );
            }
          }
          // =====================>>>>  合并json文件   <<<=================================
          if (this.isExportJson && this.isMergeJson) {
            if (this.isExportClient) {
              let saveFileFullPath = path.join(
                jsonSavePath1,
                this.jsonAllCfgFileName + ".json"
              );
              this._onSaveJsonCfgFile(jsonAllSaveDataClient, saveFileFullPath);
            }
            if (this.isExportServer) {
              let saveFileFullPath = path.join(
                jsonSavePath2,
                this.jsonAllCfgFileName + ".json"
              );
              this._onSaveJsonCfgFile(jsonAllSaveDataServer, saveFileFullPath);
            }
            this.checkJsonAllCfgFileExist();
          }
          // =====================>>>>  合并js文件   <<<=================================
          if (this.isExportJs && this.isMergeJavaScript) {
            if (this.isExportClient) {
              this._onSaveJavaScriptCfgFile(
                path.join(jsSavePath1, this.jsFileName + ".js"),
                jsAllSaveDataClient
              );
            }
            if (this.isExportServer) {
              this._onSaveJavaScriptCfgFile(
                path.join(jsSavePath2, this.jsFileName + ".js"),
                jsAllSaveDataServer
              );
            }

            this.checkJsFileExist();
          }

          this._addLog("全部转换完成!");
        },
        // 保存为json配置
        _onSaveJsonCfgFile(data, saveFileFullPath, useZip) {
          return new Promise((resolve, reject) => {
            let str = JSON.stringify(data);
            if (this.isFormatJson) {
              str = jsonBeautifully(str);
            }
            let isZip = useZip || this.useZip;
            if (isZip) {
              let zip = new jsZip();
              zip.file(this.jsonAllCfgFileName, str);
              zip
                .generateAsync({
                  type: "base64",
                  compression: "DEFLATE",
                  compressionOptions: {
                    level: 9 // 压缩等级1~9    1压缩速度最快，9最优压缩方式
                    // [使用一张图片测试之后1和9压缩的力度不大，相差100字节左右]
                  }
                })
                .then(function(content) {
                  fs.writeFile(
                    saveFileFullPath + ".txt",
                    content
                    // new Buffer(content).toString("base64")
                  );
                });
            } else {
              let ret = fs.writeFile(saveFileFullPath, str);
            }
            this._addLog("[Json]:" + saveFileFullPath);
          });
        },
        // 保存为js配置
        _onSaveJavaScriptCfgFile(saveFileFullPath, jsSaveData) {
          // TODO 保证key的顺序一致性
          let saveStr = "module.exports = ";
          if (this.isFormatJsCode) {
            // 保存为格式化代码
            saveStr = saveStr + JSON.stringify(jsSaveData, null, "\t") + ";";
          } else {
            // 保存为单行代码
            saveStr = saveStr + JSON.stringify(jsSaveData) + ";";
          }

          fs.writeFileSync(saveFileFullPath, saveStr);
          this._addLog("[JavaScript]" + saveFileFullPath);
        }
      }
    });
  },

  messages: {
    "excel-killer:hello"(event) {}
  }
});
