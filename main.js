"use strict";
var path = require("path");
var fs = require("fs");
var fse = require("fs-extra");
const { exec } = require("child_process");
const defaultConfig = {
  useTpl: false,
};

function getConfig() {
  //获取配置
  try {
    var assetsDir = Editor.Project.path;
    var configPath = path.resolve(assetsDir, ".focusbe/config.json");
    if (!isExits(configPath)) {
      writeConfig(defaultConfig);
    }
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (error) {
    Editor.log(error);
    return null;
  }
}

function writeConfig(config) {
  try {
    var assetsDir = Editor.Project.path;
    var configPath = path.resolve(assetsDir, ".focusbe/config.json");
    isExits(configPath);
    return fse.writeJSONSync(configPath, config, { spaces: 2 });
  } catch (error) {
    Editor.log(error);
  }
}
function writeTpl() {
  try {
    var config = getConfig();
    if (!config.useTpl) {
      return;
    }
    let buildTplPath = path.resolve(Editor.Project.path, "./build-templates/web-mobile/tpl.html");
    let baseTplPath = Editor.url("packages://focusbe/template/tpl.html");
    if (!isExits(buildTplPath)) {
      //没有模板的时候复制进去，作为初始化的模板
      fse.copyFileSync(baseTplPath, buildTplPath);
    }
  } catch (error) {
    Editor.log(error);
    return false;
  }
}

function isExits(filePath, create = false) {
  //检查文件是否存在，没有就创建
  if (!filePath) {
    return false;
  }
  let parentDir = path.dirname(filePath);
  if (parentDir && !fs.existsSync(parentDir)) {
    isExits(parentDir, true);
  }
  if (!fs.existsSync(filePath)) {
    if (create) {
      fs.mkdirSync(filePath);
    }
    return false;
  } else {
    return true;
  }
}

function onBuildFinish(options, callback) {
  var config = getConfig();
  if (!config.useTpl) {
    return;
  }
  // writeTpl();
  var destFiles = fs.readdirSync(options.dest);
  var srcFiles = fs.readdirSync(path.resolve(options.dest, "src"));
  var dirs = {
    main: "",
    settings: "",
    "cocos2d-js-min": "",
    "style-mobile": "",
    "style-desktop": "",
  };
  var tplFile = "";
  destFiles.map((filename, key) => {
    if (!tplFile && filename.indexOf("tpl.") == 0) {
      tplFile = filename;
    }
    let temArr = filename.split(".");
    if (temArr.length > 0 && typeof dirs[temArr[0]] != "undefined") {
      dirs[temArr[0]] = filename;
    }
  });
  srcFiles.map((filename, key) => {
    let temArr = filename.split(".");
    if (temArr.length > 0 && typeof dirs[temArr[0]] != "undefined") {
      dirs[temArr[0]] = "src/" + filename;
    }
  });

  //获取index.html中的文件路径
  if (!tplFile) {
    Editor.error("模板文件为空");
    return;
  }

  try {
    var mainHtml = fs.readFileSync(path.resolve(options.dest, tplFile), "utf-8");
    Editor.log(mainHtml);
  } catch (error) {
    Editor.error("读取模板文件失败");
    return;
  }
  if (!mainHtml) {
    Editor.error("模板文件为空");
    return;
  }
  var vars = mainHtml.match(/\${(.+)}/gi);
  if (vars) {
    vars.map((item) => {
      let key = item.replace("${", "").replace("}", "");
      if (dirs[key]) {
        mainHtml = mainHtml.replace(item, dirs[key]);
      }
    });
  }
  fs.writeFileSync(path.resolve(options.dest, "index.html"), mainHtml, "utf-8");
  //没有MD5 删除tpl.html
  fs.unlinkSync(path.resolve(options.dest, tplFile));
  autoDeploy();
  callback();
}

function autoDeploy() {
  var config = getConfig();
  if (config.deploy && config.deploy.length > 0) {
    config.deploy.map(async (item) => {
      if (item.auto) {
        Editor.log("自动部署到" + item.path);
        try {
          var distFolder = path.resolve(Editor.Project.path, "./build/web-mobile");
          await fse.copy(distFolder, item.path);
          Editor.log(item.type);
          if (item.type == "local") {
            Editor.log('code "' + item.path + '"');
            exec('code "' + item.path + '"');
          }
        } catch (error) {
          Editor.log(item.name + "自动部署失败");
          Editor.log(error);
        }
      }
    });
  }
}

module.exports = {
  load() {
    // Editor.log(222);
    var config = getConfig();
    if (config.useTpl) {
      writeTpl();
    }
    Editor.Builder.on("build-finished", onBuildFinish);
  },

  unload() {
    Editor.Builder.removeListener("build-finished", onBuildFinish);
  },
  // updateConfig(config){

  // },
  messages: {
    usage() {
      exec("start https://github.com/focusbe/cocos-tools");
      // Editor.log("https://github.com/focusbe/cocos-tools");
    },
    config() {
      Editor.Panel.open("focusbe");
    },
    updateConfig() {
      var config = getConfig();
      Editor.Ipc.sendToPanel("focusbe", "focusbe:updateConfig", config);
    },
    saveConfig(event, newconf) {
      var config = getConfig();
      Editor.log("保存config", newconf);
      writeConfig(Object.assign(config, newconf));
      Editor.Ipc.sendToPanel("focusbe", "focusbe:updateConfig", config);
    },
    removeDeploy(event, index) {
      var config = getConfig();
      config.deploy.splice(index, 1);
      writeConfig(config);
      Editor.Ipc.sendToPanel("focusbe", "focusbe:updateConfig", config);
    },
    addDeploy(event, deployItem) {
      var config = getConfig();
      config.deploy.push(deployItem);
      writeConfig(config);
      Editor.Ipc.sendToPanel("focusbe", "focusbe:updateConfig", config);
    },
  },
};
