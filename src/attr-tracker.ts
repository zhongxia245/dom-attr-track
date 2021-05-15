// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)
// import "core-js/fn/array.find"
// ...
export default class AttrTracker {
  private config: any;

  constructor(config) {
    this.config = config;
    this.init();
  }

  private init() {
    this.initDomListener();
    this.initExposeListener();
  }

  /**
   * 初始化DOM事件监听
   */
  private initDomListener() { }

  /**
   * 初始化模块曝光监听
   */
  private initExposeListener() { }

  /**
   * 移除监听
   */
  public destroy() { }

}


