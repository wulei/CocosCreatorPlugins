let fs = require('fs');
const {remote} = require('electron');
let self = module.exports = {
    cfgData: {},
    saveConfig(data) {
        let configFilePath = self._getAppCfgPath();
        let saveData = {
            outPutFontPath: data.outPutFontPath,
            baseFontPath: data.baseFontPath,
        };
        fs.writeFile(configFilePath, JSON.stringify(saveData), function (error) {
            if (!error) {
                self.cfgData = saveData;
                console.log("保存配置成功!");
            }
        }.bind(this));
    },

    _getAppCfgPath() {
        return remote.app.getPath('userData') + "\\fontSlimmingConfig.json";
    },
    initCfg(cb) {
        let configFilePath = this._getAppCfgPath();
        let FileUtil = Editor.require("packages://font-slimming-tools/panel/FileUtil");
        let b = FileUtil._isFileExit(configFilePath);
        if (b) {
            fs.readFile(configFilePath, 'utf-8', function (err, data) {
                if (!err) {
                    let saveData = JSON.parse(data.toString());
                    self.cfgData = saveData;
                    if (cb) {
                        cb(saveData);
                    }
                }
            }.bind(self));
        } else {
            let saveData = {outPutFontPath: "", baseFontPath: ""};
            this.saveConfig(saveData);
            if (cb) {
                cb(saveData);
            }
        }
    }
}