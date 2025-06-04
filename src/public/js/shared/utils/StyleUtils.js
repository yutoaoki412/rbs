/**
 * スタイルユーティリティ - インラインCSSの統一管理
 * インラインスタイルをCSSクラスベースに移行するための統一ユーティリティ
 * @version 1.0.0
 */

export class StyleUtils {
  /**
   * 表示・非表示の制御
   * @param {HTMLElement} element - 対象要素
   * @param {boolean} show - 表示するか
   * @param {string} displayType - 表示タイプ（'block', 'flex', etc.）
   */
  static toggle(element, show, displayType = 'block') {
    if (!element) return;
    
    if (show) {
      element.classList.remove('hidden', 'd-none');
      element.classList.add('visible');
      if (displayType === 'flex') {
        element.classList.add('d-flex');
      } else if (displayType === 'grid') {
        element.classList.add('d-grid');
      } else {
        element.classList.add('d-block');
      }
    } else {
      element.classList.remove('visible', 'd-block', 'd-flex', 'd-grid');
      element.classList.add('hidden');
    }
  }

  /**
   * フェードアニメーション
   * @param {HTMLElement} element - 対象要素
   * @param {boolean} fadeIn - フェードインするか
   * @param {number} duration - アニメーション時間（ms）
   */
  static fadeToggle(element, fadeIn, duration = 300) {
    if (!element) return;
    
    element.style.transition = `opacity ${duration}ms ease`;
    
    if (fadeIn) {
      element.classList.remove('fade-out');
      element.classList.add('fade-in');
      element.style.opacity = '1';
    } else {
      element.classList.remove('fade-in');
      element.classList.add('fade-out');
      element.style.opacity = '0';
    }
  }

  /**
   * スライドアニメーション
   * @param {HTMLElement} element - 対象要素
   * @param {boolean} open - 開くか
   * @param {number} duration - アニメーション時間（ms）
   */
  static slideToggle(element, open, duration = 400) {
    if (!element) return;
    
    if (open) {
      element.classList.remove('slide-up');
      element.classList.add('slide-down');
      element.style.maxHeight = element.scrollHeight + 'px';
      element.style.overflow = 'hidden';
      element.style.transition = `max-height ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    } else {
      element.classList.remove('slide-down');
      element.classList.add('slide-up');
      element.style.maxHeight = '0';
      element.style.overflow = 'hidden';
      element.style.transition = `max-height ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    }
  }

  /**
   * ローディング状態の制御
   * @param {HTMLElement} element - 対象要素
   * @param {boolean} loading - ローディング中か
   */
  static setLoadingState(element, loading) {
    if (!element) return;
    
    if (loading) {
      element.classList.add('loading-state');
      element.setAttribute('aria-busy', 'true');
    } else {
      element.classList.remove('loading-state');
      element.setAttribute('aria-busy', 'false');
    }
  }

  /**
   * エラー状態の制御
   * @param {HTMLElement} element - 対象要素
   * @param {boolean} error - エラー状態か
   * @param {string} message - エラーメッセージ
   */
  static setErrorState(element, error, message = '') {
    if (!element) return;
    
    if (error) {
      element.classList.add('error-state');
      element.setAttribute('aria-invalid', 'true');
      if (message) {
        element.setAttribute('title', message);
      }
    } else {
      element.classList.remove('error-state');
      element.setAttribute('aria-invalid', 'false');
      element.removeAttribute('title');
    }
  }

  /**
   * 無効状態の制御
   * @param {HTMLElement} element - 対象要素
   * @param {boolean} disabled - 無効にするか
   */
  static setDisabledState(element, disabled) {
    if (!element) return;
    
    if (disabled) {
      element.classList.add('disabled-state');
      element.setAttribute('disabled', 'true');
      element.setAttribute('aria-disabled', 'true');
    } else {
      element.classList.remove('disabled-state');
      element.removeAttribute('disabled');
      element.setAttribute('aria-disabled', 'false');
    }
  }

  /**
   * 成功状態の制御
   * @param {HTMLElement} element - 対象要素
   * @param {boolean} success - 成功状態か
   */
  static setSuccessState(element, success) {
    if (!element) return;
    
    if (success) {
      element.classList.add('success-state');
    } else {
      element.classList.remove('success-state');
    }
  }

  /**
   * 位置の制御（fixed, absolute等）
   * @param {HTMLElement} element - 対象要素
   * @param {Object} position - 位置設定
   */
  static setPosition(element, position = {}) {
    if (!element) return;
    
    const { type = 'static', top, right, bottom, left, zIndex } = position;
    
    // 既存のposition関連クラスを削除
    element.classList.remove('position-static', 'position-relative', 'position-absolute', 'position-fixed', 'position-sticky');
    
    // 新しいpositionクラスを追加
    element.classList.add(`position-${type}`);
    
    // 位置の設定
    if (top !== undefined) element.style.top = typeof top === 'number' ? `${top}px` : top;
    if (right !== undefined) element.style.right = typeof right === 'number' ? `${right}px` : right;
    if (bottom !== undefined) element.style.bottom = typeof bottom === 'number' ? `${bottom}px` : bottom;
    if (left !== undefined) element.style.left = typeof left === 'number' ? `${left}px` : left;
    if (zIndex !== undefined) element.style.zIndex = zIndex;
  }

  /**
   * アニメーションクラスの追加
   * @param {HTMLElement} element - 対象要素
   * @param {string} animationClass - アニメーションクラス名
   * @param {number} duration - アニメーション時間（ms）
   */
  static addAnimation(element, animationClass, duration = 1000) {
    if (!element) return;
    
    element.classList.add(animationClass);
    
    setTimeout(() => {
      element.classList.remove(animationClass);
    }, duration);
  }

  /**
   * テーマクラスの制御
   * @param {HTMLElement} element - 対象要素
   * @param {string} theme - テーマ名
   */
  static setTheme(element, theme) {
    if (!element) return;
    
    // 既存のテーマクラスを削除
    element.classList.remove('theme-light', 'theme-dark', 'theme-primary', 'theme-secondary');
    
    // 新しいテーマクラスを追加
    if (theme) {
      element.classList.add(`theme-${theme}`);
    }
  }

  /**
   * レスポンシブ表示の制御
   * @param {HTMLElement} element - 対象要素
   * @param {Object} breakpoints - ブレークポイント別の表示設定
   */
  static setResponsiveDisplay(element, breakpoints = {}) {
    if (!element) return;
    
    const { mobile, tablet, desktop } = breakpoints;
    
    // 既存のレスポンシブクラスを削除
    element.classList.remove('d-mobile-none', 'd-tablet-none', 'd-desktop-none',
                             'd-mobile-block', 'd-tablet-block', 'd-desktop-block',
                             'd-mobile-flex', 'd-tablet-flex', 'd-desktop-flex');
    
    // 新しいレスポンシブクラスを追加
    if (mobile !== undefined) {
      element.classList.add(mobile ? 'd-mobile-block' : 'd-mobile-none');
    }
    if (tablet !== undefined) {
      element.classList.add(tablet ? 'd-tablet-block' : 'd-tablet-none');
    }
    if (desktop !== undefined) {
      element.classList.add(desktop ? 'd-desktop-block' : 'd-desktop-none');
    }
  }

  /**
   * CSSカスタムプロパティの設定
   * @param {HTMLElement} element - 対象要素
   * @param {Object} properties - CSS変数のオブジェクト
   */
  static setCSSProperties(element, properties = {}) {
    if (!element) return;
    
    Object.entries(properties).forEach(([key, value]) => {
      const cssVar = key.startsWith('--') ? key : `--${key}`;
      element.style.setProperty(cssVar, value);
    });
  }

  /**
   * 一時的なCSSクラスの追加（自動削除）
   * @param {HTMLElement} element - 対象要素
   * @param {string} className - クラス名
   * @param {number} duration - 削除までの時間（ms）
   */
  static addTemporaryClass(element, className, duration = 1000) {
    if (!element) return;
    
    element.classList.add(className);
    
    setTimeout(() => {
      element.classList.remove(className);
    }, duration);
  }

  /**
   * 高度なアニメーション制御
   * @param {HTMLElement} element - 対象要素
   * @param {Object} animation - アニメーション設定
   */
  static animate(element, animation = {}) {
    if (!element) return;
    
    const {
      type = 'fadeIn',
      duration = 300,
      delay = 0,
      easing = 'ease',
      callback = null
    } = animation;
    
    // 遅延実行
    setTimeout(() => {
      element.style.transition = `all ${duration}ms ${easing}`;
      element.classList.add(`animate-${type}`);
      
      // アニメーション完了後のコールバック
      if (callback) {
        setTimeout(callback, duration);
      }
      
      // アニメーションクラスの削除
      setTimeout(() => {
        element.classList.remove(`animate-${type}`);
      }, duration + 50);
    }, delay);
  }
} 