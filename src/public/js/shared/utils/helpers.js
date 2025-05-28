/**
 * RBS陸上教室 共通ヘルパー関数
 * アプリケーション全体で使用する汎用的な関数
 */

/**
 * DOM操作ヘルパー
 */
export const DOM = {
  /**
   * 要素を取得
   */
  $(selector, context = document) {
    return context.querySelector(selector);
  },

  /**
   * 複数要素を取得
   */
  $$(selector, context = document) {
    return context.querySelectorAll(selector);
  },

  /**
   * 要素を作成
   */
  create(tag, options = {}) {
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
    
    return element;
  },

  /**
   * 要素の表示/非表示を切り替え
   */
  toggle(element, force = null) {
    if (!element) return;
    
    if (force !== null) {
      element.style.display = force ? '' : 'none';
    } else {
      element.style.display = element.style.display === 'none' ? '' : 'none';
    }
  },

  /**
   * クラスの追加/削除を切り替え
   */
  toggleClass(element, className, force = null) {
    if (!element) return;
    
    if (force !== null) {
      element.classList.toggle(className, force);
    } else {
      element.classList.toggle(className);
    }
  },

  /**
   * 要素が表示されているかチェック
   */
  isVisible(element) {
    if (!element) return false;
    return element.offsetParent !== null;
  }
};

/**
 * 文字列操作ヘルパー
 */
export const Str = {
  /**
   * 文字列をケバブケースに変換
   */
  kebabCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
  },

  /**
   * 文字列をキャメルケースに変換
   */
  camelCase(str) {
    return str
      .replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
  },

  /**
   * 文字列を切り詰め
   */
  truncate(str, length = 100, suffix = '...') {
    if (str.length <= length) return str;
    return str.slice(0, length) + suffix;
  },

  /**
   * HTMLエスケープ
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * HTMLアンエスケープ
   */
  unescapeHtml(str) {
    const div = document.createElement('div');
    div.innerHTML = str;
    return div.textContent || div.innerText || '';
  }
};

/**
 * 日付操作ヘルパー
 */
export const Date = {
  /**
   * 日付をフォーマット
   */
  format(date, format = 'YYYY/MM/DD') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    const second = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hour)
      .replace('mm', minute)
      .replace('ss', second);
  },

  /**
   * 相対時間を取得
   */
  relative(date) {
    const now = new Date();
    const target = new Date(date);
    const diff = now - target;
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return '今';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分前`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}時間前`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}日前`;
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}ヶ月前`;
    return `${Math.floor(seconds / 31536000)}年前`;
  },

  /**
   * 日付が今日かチェック
   */
  isToday(date) {
    const today = new Date();
    const target = new Date(date);
    return today.toDateString() === target.toDateString();
  }
};

/**
 * パフォーマンスヘルパー
 */
export const Performance = {
  /**
   * デバウンス処理
   */
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * スロットル処理
   */
  throttle(func, limit = 100) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * 処理時間を測定
   */
  async measure(name, func) {
    const startTime = performance.now();
    const result = await func();
    const endTime = performance.now();
    console.log(`⏱️ ${name}: ${(endTime - startTime).toFixed(2)}ms`);
    return result;
  }
};

/**
 * 検証ヘルパー
 */
export const Validation = {
  /**
   * メールアドレスの検証
   */
  email(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  },

  /**
   * 電話番号の検証
   */
  phone(phone) {
    const pattern = /^[\d-+().\s]+$/;
    return pattern.test(phone);
  },

  /**
   * URLの検証
   */
  url(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * 空でないかチェック
   */
  required(value) {
    return value !== null && value !== undefined && value.toString().trim() !== '';
  },

  /**
   * 長さチェック
   */
  length(value, min = 0, max = Infinity) {
    const length = value ? value.toString().length : 0;
    return length >= min && length <= max;
  }
};

/**
 * ユーティリティヘルパー
 */
export const Utils = {
  /**
   * UUID生成
   */
  generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
  },

  /**
   * ディープコピー
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (typeof obj === 'object') {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
    return obj;
  },

  /**
   * 配列をシャッフル
   */
  shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  },

  /**
   * 配列から重複を削除
   */
  unique(array) {
    return [...new Set(array)];
  },

  /**
   * オブジェクトが空かチェック
   */
  isEmpty(obj) {
    if (obj === null || obj === undefined) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  },

  /**
   * スムーススクロール
   */
  smoothScrollTo(target, duration = 500) {
    const element = typeof target === 'string' ? DOM.$(target) : target;
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
  },

  /**
   * ページトップへスクロール
   */
  scrollToTop(duration = 500) {
    this.smoothScrollTo({ offsetTop: 0 }, duration);
  },

  /**
   * ローディング表示
   */
  showLoading(message = '読み込み中...') {
    const overlay = DOM.create('div', {
      className: 'loading-overlay',
      innerHTML: `
        <div class="loading-content">
          <div class="spinner"></div>
          <p>${message}</p>
        </div>
      `
    });

    document.body.appendChild(overlay);
    return overlay;
  },

  /**
   * ローディング非表示
   */
  hideLoading() {
    const overlay = DOM.$('.loading-overlay');
    if (overlay) {
      overlay.remove();
    }
  }
};

/**
 * すべてのヘルパーをまとめたオブジェクト
 */
const helpers = {
  DOM,
  Str,
  Date,
  Performance,
  Validation,
  Utils
};

export default helpers; 