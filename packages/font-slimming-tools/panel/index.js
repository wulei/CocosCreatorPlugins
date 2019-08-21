// panel/index.js, this filename needs to match the one registered in package.json
const fs = require("fs");
const path = require("path");
const {remote} = require("electron");

Editor.Panel.extend({
    // css style for panel
    style: fs.readFileSync(Editor.url('packages://font-slimming-tools/panel/index.css', 'utf8')) + "",

    // html template for panel
    template: fs.readFileSync(Editor.url('packages://font-slimming-tools/panel/index.html', 'utf8')) + "",
    // method executed when template and styles are successfully loaded and initialized

    $: {
        logListUI: '#logListUI',
    },
    ready() {
        let logCtrl = this.$logListUI;
        let msgEnd = this.$msg_end;
        let logListScrollToBottom = function () {
            setTimeout(function () {
                logCtrl.scrollTop = logCtrl.scrollHeight;
            }, 10);
        };
        window.app = new window.Vue({
            el: this.shadowRoot,
            created() {
                console.log("created");
                let CfgUtil = Editor.require("packages://font-slimming-tools/panel/CfgUtil");
                CfgUtil.initCfg(function (data) {
                    this.baseFontPath = data.baseFontPath;
                    this.outPutFontPath = data.outPutFontPath;
                }.bind(this))
            },
            init() {
                console.log("init");
            },
            data: {
                fileList: [],
                logList: [],
                baseFontPath: "",
                outPutFontPath: "",
                isShowFontDirBtn: false,
                newFontPath: "",
                progressValue: 0,
                isUseSuggestString: false,
            },
            methods: {
                _addLog(str) {
                    let time = new Date();
                    let log = "[" + time.toLocaleString() + "] " + str;
                    this.logList.push(log);
                    logListScrollToBottom();
                },
                clickUseSuggestString() {
                    this.isUseSuggestString = !this.isUseSuggestString;
                    let stringFile = Editor.url('packages://font-slimming-tools/SuggestString.txt');
                    let FileUtil = Editor.require("packages://font-slimming-tools/panel/FileUtil");
                    if (this.isUseSuggestString) {
                        if (FileUtil._isFileExit(stringFile)) {
                            this.fileList.push(stringFile);
                            this._addLog("成功加入推荐字");
                        }
                    } else {
                        for (let i = 0; i < this.fileList.length; i++) {
                            if (this.fileList[i].indexOf(stringFile) >= 0) {
                                // 删除掉
                                this.fileList.splice(i, 1);
                                this._addLog("成功删除推荐字");
                            }
                        }
                    }
                },
                drop(event) {
                    let FileUtil = Editor.require("packages://font-slimming-tools/panel/FileUtil");
                    let fs = require("fs");

                    event.preventDefault();
                    let file = event.dataTransfer.files[0].path;
                    //TODO 判断文件是否存在列表中

                    // this.fileList = [];
                    let stat = fs.lstatSync(file);
                    if (stat.isDirectory()) {
                        let b = false;
                        for (let key in this.fileList) {
                            let index = this.fileList[key].indexOf(file);
                            if (index >= 0) {
                                b = true;
                                break;
                            }
                        }
                        if (b) {
                            this._addLog("文件列表中存在该目录:" + file);
                        } else {
                            let fileArr = [];
                            FileUtil.getDirAllFiles(file, fileArr);
                            for (let key in fileArr) {
                                this.fileList.push(fileArr[key]);
                            }
                        }
                    } else if (stat.isFile()) {
                        let b = false;
                        for (let key in this.fileList) {
                            if (this.fileList[key] === file) {
                                b = true;
                                break;
                            }
                        }
                        if (b) {
                            this._addLog("文件列表中存在该文件:" + file);
                        } else {
                            this.fileList.push(file);
                        }
                    }
                    this._addLog("文件个数: " + this.fileList.length);
                    return false;
                },
                dragOver(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    // console.log("dragOver");
                },
                dragEnter(event) {
                    event.preventDefault();
                    event.stopPropagation();

                    console.log("dragEnter");
                },
                dragLeave(event) {
                    event.preventDefault();
                    console.log("dragLeave");
                },
                onCleanFileList() {
                    this.fileList = [];
                    this._addLog("成功清理文件列表");
                },
                onCollectString() {
                    console.log("collect string");
                    this.isShowFontDirBtn = false;
                    this.progressValue = 0;
                    let FileUtil = Editor.require("packages://font-slimming-tools/panel/FileUtil");
                    let options = {
                        stepCb: this._onCollectStep.bind(this),
                        compCb: this._onCollectOver.bind(this)
                    };
                    if (this.fileList.length > 0) {
                        FileUtil.getFileString(this.fileList, options);
                    } else {
                        this._addLog("列表文件中不存在文件可供检索, 请设置或者使用推荐字");
                    }
                },
                _onCollectStep(str, cur, total) {
                    // console.log("dealFile: " + str);
                    this.progressValue = cur * 1.0 / total * 1.0 * 100;
                },
                _onCollectOver(str) {
                    let fs = require("fs");
                    let path = require("path");
                    this.progressValue = 100;
                    this.isShowFontDirBtn = true;
                    this._addLog("一共发现字符:" + str.length + "个");
                    if (str.length > 0) {
                        // 检查目录
                        let FileUtil = Editor.require("packages://font-slimming-tools/panel/FileUtil");
                        let b1 = FileUtil._isFileExit(this.baseFontPath);
                        if (b1 === false) {
                            this._addLog("生成ttf失败, 字体文件不存在:" + this.baseFontPath);
                            return
                        }
                        let b2 = FileUtil._isFileExit(this.outPutFontPath);
                        if (b2 === false) {
                            this._addLog("生成ttf失败, 字体保存目录不存在:" + this.outPutFontPath);
                            return;
                        }
                        // 将要生成的字体保存起来
                        let strFile = path.join(this.outPutFontPath, "char.txt");
                        fs.writeFile(strFile, str, function (error) {
                            if (!error) {
                                window.app._addLog("保存字体文件成功: " + strFile);
                            }
                        }.bind(this));


                        let fontCarrier = Editor.require("packages://font-slimming-tools/node_modules/font-carrier");

                        let pathArr = this.baseFontPath.split('\\');
                        let fileFullName = pathArr[pathArr.length - 1];
                        // let fileName = fileFullName.split('.')[0];
                        let fileName=fileFullName.replace(/(.*\/)*([^.]+).*/ig,"$2");
                        this.newFontPath = path.join(this.outPutFontPath, "./" + fileName + "-new");
                        this._addLog("开始生成ttf文件:" + this.newFontPath + ".ttf");

                        let transFont = fontCarrier.transfer(this.baseFontPath);
                        transFont.min(str);
                        transFont.output({
                            path: this.newFontPath,
                            types: ["ttf"],
                        });
                        this._addLog("成功生成ttf文件:" + this.newFontPath + ".ttf");
                    } else {
                        this._addLog("生成ttf文件失败");
                    }
                },
                onSetOutPutFontPath() {
                    let res = Editor.Dialog.openFile({
                        title: "选择生成字体存放目录",
                        defaultPath: Editor.projectInfo.path,
                        properties: ['openDirectory'],
                    });
                    if (res != -1) {
                        this.outPutFontPath = res[0];
                        let CfgUtil = Editor.require("packages://font-slimming-tools/panel/CfgUtil");
                        CfgUtil.saveConfig(this);
                    }
                },
                onSetBaseFontPath() {
                    let res = Editor.Dialog.openFile({
                        title: "选择字体文件",
                        defaultPath: Editor.projectInfo.path,
                        properties: ['openFile'],
                    });
                    if (res != -1) {
                        let file = res[0];
                        let FileUtil = Editor.require("packages://font-slimming-tools/panel/FileUtil");
                        if (FileUtil.is_fileType(file, 'ttf')) {
                            this.baseFontPath = file;
                            let CfgUtil = Editor.require("packages://font-slimming-tools/panel/CfgUtil");
                            CfgUtil.saveConfig(this);
                        } else {
                            this.baseFontPath = "";
                            Editor.Dialog.messageBox({
                                type: 'info',
                                buttons: ["OK"],
                                title: "提示",
                                message: "必须选择ttf字体文件",
                            })
                        }
                    }
                },
                onShowFontDir() {
                    let fs = require("fs");
                    let Electron = require("electron");
                    let fontFilePath = this.newFontPath + '.ttf';
                    if (!fs.existsSync(fontFilePath)) {
                        this._addLog("目录不存在：" + fontFilePath);
                        return;
                    }

                    // Electron.shell.showItemInFolder(this.outPutFontPath);
                    Electron.shell.showItemInFolder(fontFilePath);
                    Electron.shell.beep();
                }

            }
        })

    },

    // register your ipc messages here
    messages: {
        'fontSlimming:hello'(event) {

        }
    }
});