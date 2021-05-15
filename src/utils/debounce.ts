// @ts-nocheck

/**
 * 简单的函数防抖
 */
export function debounce(func, waitTime) {
  let timeout: NodeJS.Timeout
  return function() {
    const context = this,
      args = arguments
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(function() {
      func.apply(context, args)
    }, waitTime)
  }
}
