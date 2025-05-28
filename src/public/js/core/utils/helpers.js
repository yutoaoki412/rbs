/**
 * 共通ヘルパー関数
 * アプリケーション全体で使用される汎用的な関数
 */

/**
 * 日付をフォーマット
 * @param {string|Date} dateString - フォーマットする日付
 * @param {string} format - フォーマット形式 (YYYY.MM.DD)
 * @returns {string} フォーマットされた日付文字列
 */
function formatDate(dateString, format = 'YYYY.MM.DD') {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date string');
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day);
  } catch (error) {
    console.error('日付フォーマットエラー:', error);
    return dateString?.toString() || '';
  }
}

/**
 * デバウンス関数
 * @param {Function} func - 実行する関数
 * @param {number} wait - 待機時間（ミリ秒）
 * @returns {Function} デバウンスされた関数
 */
function debounce(func, wait) {
  if (typeof func !== 'function') {
    throw new Error('First argument must be a function');
  }
  
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * スロットル関数
 * @param {Function} func - 実行する関数
 * @param {number} limit - 制限時間（ミリ秒）
 * @returns {Function} スロットルされた関数
 */
function throttle(func, limit) {
  if (typeof func !== 'function') {
    throw new Error('First argument must be a function');
  }
  
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 要素が表示領域内にあるかチェック
 * @param {Element} el - チェックする要素
 * @param {number} threshold - 閾値（0-1）
 * @returns {boolean} 表示領域内にあるかどうか
 */
function isElementInViewport(el, threshold = 0) {
  if (!el || !el.getBoundingClientRect) {
    return false;
  }
  
  const rect = el.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;
  
  const verticalThreshold = windowHeight * threshold;
  const horizontalThreshold = windowWidth * threshold;
  
  return (
    rect.top >= -verticalThreshold &&
    rect.left >= -horizontalThreshold &&
    rect.bottom <= windowHeight + verticalThreshold &&
    rect.right <= windowWidth + horizontalThreshold
  );
}

/**
 * スムーススクロール
 * @param {string|Element} target - スクロール先の要素またはセレクタ
 * @param {number} offset - オフセット値
 * @returns {Promise<void>} スクロール完了のPromise
 */
function smoothScrollTo(target, offset = 0) {
  return new Promise((resolve, reject) => {
    try {
      const element = typeof target === 'string' ? document.querySelector(target) : target;
      if (!element) {
        reject(new Error('Target element not found'));
        return;
      }
      
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      
      // スクロール完了を検知
      let scrollTimeout;
      const checkScrollEnd = () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          resolve();
        }, 100);
      };
      
      window.addEventListener('scroll', checkScrollEnd);
      setTimeout(() => {
        window.removeEventListener('scroll', checkScrollEnd);
        resolve();
      }, 1000); // 最大1秒でタイムアウト
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * ローカルストレージのヘルパー
 */
const storage = {
  /**
   * ローカルストレージから値を取得
   * @param {string} key - キー
   * @param {*} defaultValue - デフォルト値
   * @returns {*} 取得した値
   */
  get(key, defaultValue = null) {
    try {
      if (!key || typeof key !== 'string') {
        throw new Error('Key must be a non-empty string');
      }
      
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('ローカルストレージの読み込みエラー:', error);
      return defaultValue;
    }
  },
  
  /**
   * ローカルストレージに値を保存
   * @param {string} key - キー
   * @param {*} value - 保存する値
   * @returns {boolean} 保存成功かどうか
   */
  set(key, value) {
    try {
      if (!key || typeof key !== 'string') {
        throw new Error('Key must be a non-empty string');
      }
      
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('ローカルストレージの保存エラー:', error);
      return false;
    }
  },
  
  /**
   * ローカルストレージから値を削除
   * @param {string} key - キー
   * @returns {boolean} 削除成功かどうか
   */
  remove(key) {
    try {
      if (!key || typeof key !== 'string') {
        throw new Error('Key must be a non-empty string');
      }
      
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('ローカルストレージの削除エラー:', error);
      return false;
    }
  },
  
  /**
   * ローカルストレージをクリア
   * @returns {boolean} クリア成功かどうか
   */
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('ローカルストレージのクリアエラー:', error);
      return false;
    }
  }
};

/**
 * URLパラメータを取得
 * @param {string} name - パラメータ名
 * @returns {string|null} パラメータ値
 */
function getUrlParameter(name) {
  try {
    if (!name || typeof name !== 'string') {
      throw new Error('Parameter name must be a non-empty string');
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  } catch (error) {
    console.error('URLパラメータ取得エラー:', error);
    return null;
  }
}

/**
 * 文字列をサニタイズ
 * @param {string} str - サニタイズする文字列
 * @returns {string} サニタイズされた文字列
 */
function sanitizeString(str) {
  try {
    if (typeof str !== 'string') {
      return '';
    }
    
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  } catch (error) {
    console.error('文字列サニタイズエラー:', error);
    return '';
  }
}

/**
 * ランダムIDを生成
 * @param {number} length - ID長さ
 * @param {string} prefix - プレフィックス
 * @returns {string} 生成されたID
 */
function generateRandomId(length = 8, prefix = '') {
  try {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = prefix;
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  } catch (error) {
    console.error('ランダムID生成エラー:', error);
    return prefix + Date.now().toString();
  }
}

/**
 * 配列をシャッフル（非破壊的）
 * @param {Array} array - シャッフルする配列
 * @returns {Array} シャッフルされた新しい配列
 */
function shuffleArray(array) {
  try {
    if (!Array.isArray(array)) {
      throw new Error('Input must be an array');
    }
    
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  } catch (error) {
    console.error('配列シャッフルエラー:', error);
    return Array.isArray(array) ? [...array] : [];
  }
}

/**
 * DOM要素の存在チェック
 * @param {string|Element} selector - セレクタまたは要素
 * @returns {Element|null} 見つかった要素
 */
function getElement(selector) {
  try {
    if (typeof selector === 'string') {
      return document.querySelector(selector);
    } else if (selector instanceof Element) {
      return selector;
    }
    return null;
  } catch (error) {
    console.error('要素取得エラー:', error);
    return null;
  }
}

/**
 * 複数のDOM要素を取得
 * @param {string} selector - セレクタ
 * @returns {NodeList} 見つかった要素のリスト
 */
function getElements(selector) {
  try {
    if (typeof selector !== 'string') {
      throw new Error('Selector must be a string');
    }
    return document.querySelectorAll(selector);
  } catch (error) {
    console.error('要素リスト取得エラー:', error);
    return document.querySelectorAll(''); // 空のNodeListを返す
  }
}

// 名前空間を使用してグローバル汚染を防ぐ
window.RBSHelpers = {
  formatDate,
  debounce,
  throttle,
  isElementInViewport,
  smoothScrollTo,
  storage,
  getUrlParameter,
  sanitizeString,
  generateRandomId,
  shuffleArray,
  getElement,
  getElements
}; 