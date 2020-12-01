var configFile = ".focusbe/config.json";
var Config = {
  get() {
    var configPath = Editor.url("db://" + configFile);
    if (!isExits(configPath)) {
      writeConfig(configPath, defaultConfig);
      return defaultConfig;
    }
    try {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch (error) {
      return null;
    }
  },
  set(config) {
    var oldConfig = this.get();
    if(!oldConfig){
      Editor.error('配置获取失败');
      return;
    }
    var configPath = Editor.url("db://"+configFile);
    isExits(configPath);
    return fs.writeFileSync(writeConfig, JSON.stringify(config));
  },
};
