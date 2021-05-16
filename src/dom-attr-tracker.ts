// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)
// import "core-js/fn/array.find"
// ...
import { debounce, delegate, elementIsVisibleInViewport } from './utils'

const DEFAULT_CONFIG = {
  /** 监听的父元素选择器， 默认 body */
  selector: 'body',
  /** [可选] dom属性标识前缀， 默认 data-tea */
  prefixDomAttrName: 'data-tea',
  /** [可选] 事件触发到打点的等待时间, 函数防抖，避免短时间重复埋点 */
  debounceWaitTime: 300,
  /** [可选] 模块曝光 =》到打点的等待时间， 默认： 1000ms */
  exposeTime: 1000,
  /** [可选] 模块曝光的比例 1=100% , 0.5=50% ， 默认：0.5 */
  exposePercent: 1,
  /** [可选] 间隔一段时间，检查需要监听曝光的DOM元素 */
  refreshObserverTime: 2000,
  /** [必填]data-tea DOM 属性触发的事件埋点，会调用该函数，需要在这里定义如何埋点 */
  callback: (eventName: string, eventParam: { [x: string]: unknown }, type: string) => {}
}

type Config = typeof DEFAULT_CONFIG

/** 支持的事件类型 */
const SUPPORTS_EVENTS = [
  { type: 'click', useCapture: false },
  { type: 'focus', useCapture: true },
  { type: 'blur', useCapture: true }
]

export default class DomAttrTracker {
  /** 配置项 */
  private config: Config
  /** 存储事件监听的销毁方法 */
  private listenerList: Array<any>
  /** 避免频繁触发埋点上报 */
  private debounceCallback: (
    eventName: string,
    eventParam: { [x: string]: unknown },
    type: string
  ) => void

  private io: any
  private observeList: any[]

  constructor(config: Config) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.listenerList = []
    this.io = null // intersectionObserver 实例
    this.observeList = [] // intersectionObserver 观察元素列表

    this.debounceCallback = debounce(this.config.callback, this.config.debounceWaitTime)

    this.init()
  }

  private init() {
    this.initEvent()
    this.initExpose()
  }

  /**
   * 从DOM节点从获取参数
   */
  private getParams(dom: HTMLElement, type: string) {
    let params: Record<string, unknown> = {}
    Array.from(dom.attributes).forEach(item => {
      // 过滤掉不相关的属性
      if (!item.name.includes(this.config.prefixDomAttrName)) return

      let fieldName = item.name.replace(`${this.config.prefixDomAttrName}-`, '').replace(/\-/g, '_')
      params[fieldName] = item.value || ''
    })

    const { data_tea, click, focus, blur, hover, ...eventParams } = params
    const eventName = data_tea || click || focus || blur || hover || ''

    return {
      eventName: eventName as string,
      eventParams: eventParams
    }
  }

  /**
   * 初始化DOM事件监听
   */
  private initEvent() {
    const { selector, prefixDomAttrName } = this.config || {}

    // 不设置则默认对body进行事件委托
    let $root: HTMLElement = document.body
    if (selector) {
      $root = document.querySelector(selector) || document.body
    }

    // data-tea 同时监听 click, focus, blur
    SUPPORTS_EVENTS.forEach(item => {
      this.listenerList.push(
        delegate(
          $root,
          `[${prefixDomAttrName}]`,
          item.type,
          (e: MouseEvent & { delegateTarget: HTMLElement }) => {
            const params = this.getParams(e.delegateTarget, item.type)
            this.debounceCallback(params.eventName, params.eventParams, item.type)
          },
          item.useCapture
        )
      )
    })

    // 分别监听 click , focus, blur
    SUPPORTS_EVENTS.forEach(item => {
      this.listenerList.push(
        delegate(
          $root,
          `[${prefixDomAttrName}-${item.type}]`,
          item.type,
          (e: MouseEvent & { delegateTarget: HTMLElement }) => {
            const params = this.getParams(e.delegateTarget, item.type)
            this.debounceCallback(params.eventName, params.eventParams, item.type)
          },
          item.useCapture
        )
      )
    })

    // 监听mouseover，实现hover上报埋点
    this.listenerList.push(
      delegate(
        $root,
        `[${prefixDomAttrName}-hover`,
        'mouseover',
        (e: MouseEvent & { delegateTarget: HTMLElement }) => {
          const params = this.getParams(e.delegateTarget, 'mouseover')
          this.debounceCallback(params.eventName, params.eventParams, 'mouseover')
        },
        true
      )
    )
  }

  /**
   * 初始化模块曝光监听
   */
  initExpose() {
    const { exposePercent, exposeTime, refreshObserverTime } = this.config

    if (!exposePercent) return

    // 规则：曝光超过50%的内容，且2s后内容还在页面可视窗口
    this.io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!exposePercent) return

          const $module = entry.target as HTMLElement
          if (entry.intersectionRatio >= exposePercent) {
            // @ts-ignore
            if ($module.timerId) clearTimeout($module.timerId)
            // @ts-ignore
            $module.timerId = setTimeout(() => {
              if ($module) {
                // 部分展示，则认为展示
                const isShow = elementIsVisibleInViewport($module, true)
                if (isShow) {
                  const params = this.getParams($module, 'expose')
                  this.debounceCallback(params.eventName, params.eventParams, 'expose')
                }
              }
            }, exposeTime)
          }
        })
      },
      {
        threshold: [0, exposePercent] // 触发回调的时间间隔
      }
    )

    this.refreshObserver()

    // 每隔一段重新监听元素是否变动
    setInterval(() => {
      this.refreshObserver()
    }, refreshObserverTime)
  }

  // 更新观察的元素
  refreshObserver() {
    const { prefixDomAttrName } = this.config
    const modules = Array.from(document.querySelectorAll(`[${prefixDomAttrName}-expose]`))
    // 移出老元素的监听，再新增新元素的监听
    this.observeList.forEach(item => {
      if (modules.indexOf(item) === -1) {
        this.io && this.io.unobserve(item)
      }
    })
    modules.forEach((item: Element) => {
      if (this.observeList.indexOf(item) === -1) {
        this.io && this.io.observe(item)
      }
    })
    this.observeList = modules
  }

  /**
   * 移除监听
   */
  public destroy() {
    console.log('destroy')
  }
}
