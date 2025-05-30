/**
 * DOM操作ユーティリティ
 * DOM要素の操作・検索・作成に関する汎用関数
 * @version 2.0.0
 */

/**
 * 要素を取得（シンプル版）
 * @param {string} selector - セレクター
 * @param {Document|Element} context - 検索コンテキスト
 * @returns {Element|null}
 */
export function querySelector(selector, context = document) {
  return context.querySelector(selector);
}

/**
 * 複数要素を取得
 * @param {string} selector - セレクター
 * @param {Document|Element} context - 検索コンテキスト
 * @returns {NodeList}
 */
export function querySelectorAll(selector, context = document) {
  return context.querySelectorAll(selector);
}

/**
 * 要素を作成
 * @param {string} tag - タグ名
 * @param {Object} options - オプション
 * @returns {HTMLElement}
 */
export function createElement(tag, options = {}) {
  const element = document.createElement(tag);
  
  if (options.className) {
    element.className = options.className;
  }
  
  if (options.id) {
    element.id = options.id;
  }
  
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  
  if (options.innerHTML) {
    element.innerHTML = options.innerHTML;
  }
  
  if (options.textContent) {
    element.textContent = options.textContent;
  }
  
  if (options.style) {
    Object.assign(element.style, options.style);
  }
  
  return element;
}

/**
 * 要素のテキストを設定
 * @param {Element} element - 要素
 * @param {string} text - テキスト
 */
export function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}

/**
 * 要素のHTMLを設定
 * @param {Element} element - 要素
 * @param {string} html - HTML
 */
export function setHTML(element, html) {
  if (element) {
    element.innerHTML = html;
  }
}

/**
 * 要素の表示/非表示を切り替え
 * @param {Element} element - 要素
 * @param {boolean|null} force - 強制的に表示(true)/非表示(false)
 */
export function toggleDisplay(element, force = null) {
  if (!element) return;
  
  if (force !== null) {
    element.style.display = force ? '' : 'none';
  } else {
    element.style.display = element.style.display === 'none' ? '' : 'none';
  }
}

/**
 * 要素を表示
 * @param {Element} element - 要素
 * @param {string} displayType - display タイプ
 */
export function show(element, displayType = '') {
  if (element) {
    element.style.display = displayType;
  }
}

/**
 * 要素を非表示
 * @param {Element} element - 要素
 */
export function hide(element) {
  if (element) {
    element.style.display = 'none';
  }
}

/**
 * 要素の表示/非表示を設定
 * @param {Element} element - 要素
 * @param {boolean} visible - 表示するか
 * @param {string} displayType - display タイプ
 */
export function setVisible(element, visible, displayType = '') {
  if (!element) return;
  
  if (visible) {
    element.style.display = displayType;
  } else {
    element.style.display = 'none';
  }
}

/**
 * クラスの追加/削除を切り替え
 * @param {Element} element - 要素
 * @param {string} className - クラス名
 * @param {boolean|null} force - 強制的に追加(true)/削除(false)
 */
export function toggleClass(element, className, force = null) {
  if (!element) return;
  
  if (force !== null) {
    element.classList.toggle(className, force);
  } else {
    element.classList.toggle(className);
  }
}

/**
 * クラスを追加
 * @param {Element} element - 要素
 * @param {string|string[]} classNames - クラス名
 */
export function addClass(element, classNames) {
  if (!element) return;
  
  if (Array.isArray(classNames)) {
    element.classList.add(...classNames);
  } else {
    element.classList.add(classNames);
  }
}

/**
 * クラスを削除
 * @param {Element} element - 要素
 * @param {string|string[]} classNames - クラス名
 */
export function removeClass(element, classNames) {
  if (!element) return;
  
  if (Array.isArray(classNames)) {
    element.classList.remove(...classNames);
  } else {
    element.classList.remove(classNames);
  }
}

/**
 * クラスの存在確認
 * @param {Element} element - 要素
 * @param {string} className - クラス名
 * @returns {boolean}
 */
export function hasClass(element, className) {
  return element ? element.classList.contains(className) : false;
}

/**
 * 要素が表示されているかチェック
 * @param {Element} element - 要素
 * @returns {boolean}
 */
export function isVisible(element) {
  if (!element) return false;
  return element.offsetParent !== null;
}

/**
 * 要素をDOMから削除
 * @param {Element} element - 要素
 */
export function remove(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

/**
 * 要素を別の要素に追加
 * @param {Element} parent - 親要素
 * @param {Element} child - 子要素
 */
export function append(parent, child) {
  if (parent && child) {
    parent.appendChild(child);
  }
}

/**
 * 要素を別の要素の前に挿入
 * @param {Element} parent - 親要素
 * @param {Element} newElement - 新しい要素
 * @param {Element} referenceElement - 参照要素
 */
export function insertBefore(parent, newElement, referenceElement) {
  if (parent && newElement) {
    parent.insertBefore(newElement, referenceElement);
  }
}

/**
 * 属性を設定
 * @param {Element} element - 要素
 * @param {string} name - 属性名
 * @param {string} value - 属性値
 */
export function setAttribute(element, name, value) {
  if (element) {
    element.setAttribute(name, value);
  }
}

/**
 * 属性を取得
 * @param {Element} element - 要素
 * @param {string} name - 属性名
 * @returns {string|null}
 */
export function getAttribute(element, name) {
  return element ? element.getAttribute(name) : null;
}

/**
 * 属性を削除
 * @param {Element} element - 要素
 * @param {string} name - 属性名
 */
export function removeAttribute(element, name) {
  if (element) {
    element.removeAttribute(name);
  }
}

/**
 * フォーム要素の値を取得
 * @param {Element} element - フォーム要素
 * @returns {string}
 */
export function getValue(element) {
  if (!element) return '';
  
  if (element.type === 'checkbox' || element.type === 'radio') {
    return element.checked ? element.value : '';
  }
  
  return element.value || '';
}

/**
 * フォーム要素の値を設定
 * @param {Element} element - フォーム要素
 * @param {string} value - 値
 */
export function setValue(element, value) {
  if (!element) return;
  
  if (element.type === 'checkbox' || element.type === 'radio') {
    element.checked = element.value === value;
  } else {
    element.value = value;
  }
}

/**
 * スムーズスクロール
 * @param {Element|string} target - ターゲット要素またはセレクター
 * @param {number} duration - 継続時間（ミリ秒）
 */
export function smoothScrollTo(target, duration = 500) {
  const element = typeof target === 'string' ? querySelector(target) : target;
  
  if (!element) return;
  
  const targetPosition = element.offsetTop;
  const startPosition = window.pageYOffset;
  const distance = targetPosition - startPosition;
  let startTime = null;
  
  function animation(currentTime) {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const run = easeInOutQuad(timeElapsed, startPosition, distance, duration);
    window.scrollTo(0, run);
    if (timeElapsed < duration) requestAnimationFrame(animation);
  }
  
  function easeInOutQuad(t, b, c, d) {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t + b;
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
  }
  
  requestAnimationFrame(animation);
}

/**
 * ページトップにスクロール
 * @param {number} duration - 継続時間（ミリ秒）
 */
export function scrollToTop(duration = 500) {
  const startPosition = window.pageYOffset;
  let startTime = null;
  
  function animation(currentTime) {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const run = easeInOutQuad(timeElapsed, startPosition, -startPosition, duration);
    window.scrollTo(0, run);
    if (timeElapsed < duration) requestAnimationFrame(animation);
  }
  
  function easeInOutQuad(t, b, c, d) {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t + b;
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
  }
  
  requestAnimationFrame(animation);
}

// レガシーサポート（後方互換性）
export const DOM = {
  $: querySelector,
  $$: querySelectorAll,
  create: createElement,
  toggle: toggleDisplay,
  toggleClass,
  isVisible
}; 