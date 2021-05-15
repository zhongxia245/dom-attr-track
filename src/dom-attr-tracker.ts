// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)
// import "core-js/fn/array.find"
// ...

import delegate from './delegate'

interface Config {
  selector: string
  debounceWait: number
  callback: (eventName: string, eventParam: Record<string, string>, type: string) => {}
}

export default class DomAttrTracker {
  private config?: Config

  constructor(config?: Config) {
    this.config = config

    this.init()
  }

  private init() {
    this.initDomListener()
    this.initExposeListener()
  }

  /**
   * 初始化DOM事件监听
   */
  private initDomListener() {
    console.log('initDomListener')
    const { selector, callback } = this.config || {}

    // 不设置则默认对body进行事件委托
    let $root: HTMLElement = document.body
    if (selector) {
      $root = document.querySelector(selector) || document.body
    }

    delegate($root, '[data-t-click]', 'click', (e: MouseEvent) => {
      console.log('click', e)
    })
  }

  /**
   * 初始化模块曝光监听
   */
  private initExposeListener() {
    console.log('initExposeListener')
  }

  /**
   * 移除监听
   */
  public destroy() {
    console.log('destroy')
  }
}
