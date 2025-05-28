/**
 * ステータスバナーコンポーネント
 * レッスンの開催状況を表示
 */
class StatusBanner extends Component {
  /**
   * @param {Object} dependencies - 依存関係
   * @param {Object} dependencies.lessonStatusManager - レッスンステータス管理
   * @param {Object} config - 設定オプション
   */
  constructor(dependencies = {}, config = {}) {
    super({
      animationDuration: 300,
      autoUpdateInterval: 30000,
      insertionTarget: '.header',
      autoInit: false,
      ...config
    });
    
    this.lessonStatusManager = dependencies.lessonStatusManager;
    this.autoUpdateTimer = null;
    this.isVisible = false;
    
    // 依存関係の検証
    this.validateDependencies();
    
    // 初期化
    this.init();
  }

  /**
   * 依存関係を検証
   */
  validateDependencies() {
    if (!this.lessonStatusManager) {
      console.warn('StatusBanner: LessonStatusManagerが提供されていません');
    }
  }

  /**
   * 初期化処理
   */
  doInit() {
    // イベントリスナーを設定
    this.setupEventListeners();
  }

  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    // レッスンステータス更新イベントを監視
    eventBus.on('lessonStatus:updated', () => {
      this.insertIntoPage();
    });
    
    // ページ初期化完了時にバナーを表示
    eventBus.on('page:initialized', () => {
      this.insertIntoPage();
    });
  }

  /**
   * ステータスバナーを生成
   * @returns {string} 生成されたHTML文字列
   */
  generateHTML() {
    try {
      if (!this.lessonStatusManager) {
        console.warn('StatusBanner: LessonStatusManagerが利用できません');
        return '';
      }

      const today = this.lessonStatusManager.getTodayDate();
      const statusData = this.lessonStatusManager.getLessonStatus(today);
      
      console.log('StatusBanner: 今日のレッスン状況:', statusData);
      console.log('StatusBanner: 通常開催判定:', this.lessonStatusManager.isNormalStatus(statusData));
      
      if (!statusData || this.lessonStatusManager.isNormalStatus(statusData)) {
        console.log('StatusBanner: 通常開催のためバナーを表示しません');
        return '';
      }

      return this.buildBannerHTML(statusData, today);
    } catch (error) {
      console.error('StatusBanner: HTML生成エラー:', error);
      this.emit('statusBanner:error', { error, phase: 'generateHTML' });
      return '';
    }
  }

  /**
   * バナーHTMLを構築
   * @param {Object} statusData - ステータスデータ
   * @param {string} today - 今日の日付
   * @returns {string} バナーHTML
   */
  buildBannerHTML(statusData, today) {
    const globalMessage = statusData.globalMessage ? 
      `<p class="global-message">${RBSHelpers.sanitizeString(statusData.globalMessage)}</p>` : '';
    const courseStatusHTML = [
      this.generateCourseStatus(statusData.courses.basic),
      this.generateCourseStatus(statusData.courses.advance)
    ].filter(html => html).join('');
    return `
      <div class="status-banner" id="status-banner" role="banner" aria-live="polite">
        <div class="container">
          <div class="status-content">
            <div class="status-info">
              <h3 class="status-title">${RBSHelpers.sanitizeString(today)} のレッスン状況</h3>
              ${globalMessage}
              <div class="status-courses">
                ${courseStatusHTML}
              </div>
            </div>
            <button 
              class="status-close" 
              onclick="statusBanner.hideBanner()" 
              aria-label="ステータスバナーを閉じる"
              type="button"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * コース別ステータスを生成
   * @param {Object} courseData - コースデータ
   * @returns {string} コースステータスHTML
   */
  generateCourseStatus(courseData) {
    try {
      if (!courseData) {
        return '';
      }

      if (courseData.status === 'scheduled' && !courseData.message) {
        return '';
      }

      const statusText = this.lessonStatusManager.getStatusText(courseData.status);
      const statusColor = this.lessonStatusManager.getStatusColor(courseData.status);
      const courseMessage = courseData.message ? 
        `<div class="course-message">${RBSHelpers.sanitizeString(courseData.message)}</div>` : '';

      return `
        <div class="course-status">
          <div class="course-info">
            <span class="course-name">${RBSHelpers.sanitizeString(courseData.name)}</span>
            <span class="course-time">${RBSHelpers.sanitizeString(courseData.time)}</span>
            <span class="course-status-text" style="color: ${statusColor}">
              ${RBSHelpers.sanitizeString(statusText)}
            </span>
          </div>
          ${courseMessage}
        </div>
      `;
    } catch (error) {
      console.error('StatusBanner: コースステータス生成エラー:', error);
      return '';
    }
  }

  /**
   * ページに挿入
   * @returns {Promise<boolean>} 挿入成功かどうか
   */
  async insertIntoPage() {
    try {
      const html = this.generateHTML();
      if (!html) {
        this.emit('statusBanner:noContent');
        eventBus.emit('statusBanner:noContent');
        return false;
      }

      // 既存のバナーを削除
      await this.removeExistingBanner();

      // 新しいバナーを挿入
      const insertionTarget = RBSHelpers.getElement(this.config.insertionTarget);
      if (!insertionTarget) {
        throw new Error(`挿入先要素が見つかりません: ${this.config.insertionTarget}`);
      }

      insertionTarget.insertAdjacentHTML('afterend', html);
      this.element = RBSHelpers.getElement('#status-banner');
      
      if (this.element) {
        await this.animateIn();
        this.isVisible = true;
        this.emit('statusBanner:shown', { element: this.element });
        eventBus.emit('statusBanner:shown', { element: this.element });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('StatusBanner: ページ挿入エラー:', error);
      this.emit('statusBanner:error', { error, phase: 'insertIntoPage' });
      eventBus.emit('statusBanner:error', { error, phase: 'insertIntoPage' });
      return false;
    }
  }

  /**
   * 既存のバナーを削除
   * @returns {Promise<void>}
   */
  async removeExistingBanner() {
    const existingBanner = RBSHelpers.getElement('#status-banner');
    if (existingBanner) {
      await this.animateOut(existingBanner);
      existingBanner.remove();
    }
  }

  /**
   * アニメーションイン
   * @returns {Promise<void>}
   */
  animateIn() {
    return new Promise((resolve) => {
      if (!this.element) {
        resolve();
        return;
      }

      this.element.style.opacity = '0';
      this.element.style.transform = 'translateY(-100%)';
      
      // フォーストリフロー
      this.element.offsetHeight;
      
      this.element.style.transition = `all ${this.config.animationDuration}ms ease`;
      this.element.style.opacity = '1';
      this.element.style.transform = 'translateY(0)';
      
      setTimeout(resolve, this.config.animationDuration);
    });
  }

  /**
   * アニメーションアウト
   * @param {Element} element - アニメーション対象要素
   * @returns {Promise<void>}
   */
  animateOut(element) {
    return new Promise((resolve) => {
      if (!element) {
        resolve();
        return;
      }

      element.style.transition = `all ${this.config.animationDuration}ms ease`;
      element.style.opacity = '0';
      element.style.transform = 'translateY(-100%)';
      
      setTimeout(resolve, this.config.animationDuration);
    });
  }

  /**
   * バナーを非表示
   * @returns {Promise<void>}
   */
  async hideBanner() {
    try {
      if (!this.element || !this.isVisible) {
        return;
      }

      await this.animateOut(this.element);
      this.element.remove();
      this.element = null;
      this.isVisible = false;
      
      this.emit('statusBanner:hidden');
      eventBus.emit('statusBanner:hidden');
    } catch (error) {
      console.error('StatusBanner: バナー非表示エラー:', error);
    }
  }

  /**
   * 自動更新を開始
   */
  startAutoUpdate() {
    try {
      this.stopAutoUpdate(); // 既存のタイマーをクリア
      
      this.autoUpdateTimer = setInterval(() => {
        this.insertIntoPage().catch(error => {
          console.error('StatusBanner: 自動更新エラー:', error);
        });
      }, this.config.autoUpdateInterval);
      
      this.emit('statusBanner:autoUpdateStarted');
      eventBus.emit('statusBanner:autoUpdateStarted');
    } catch (error) {
      console.error('StatusBanner: 自動更新開始エラー:', error);
    }
  }

  /**
   * 自動更新を停止
   */
  stopAutoUpdate() {
    if (this.autoUpdateTimer) {
      clearInterval(this.autoUpdateTimer);
      this.autoUpdateTimer = null;
      this.emit('statusBanner:autoUpdateStopped');
      eventBus.emit('statusBanner:autoUpdateStopped');
    }
  }

  /**
   * バナーの表示状態を取得
   * @returns {boolean} 表示中かどうか
   */
  isShown() {
    return this.isVisible && this.element !== null;
  }

  /**
   * クリーンアップ処理
   */
  cleanup() {
    this.stopAutoUpdate();
    super.cleanup();
  }

  /**
   * コンポーネントを破棄
   */
  destroy() {
    this.stopAutoUpdate();
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.isVisible = false;
    
    super.destroy();
  }
}

// グローバルに公開
window.StatusBanner = StatusBanner;

// 後方互換性のためのグローバルインスタンス
// 実際の使用時は依存性注入を推奨
let statusBanner;

// LessonStatusManagerが利用可能になったら初期化
document.addEventListener('DOMContentLoaded', () => {
  if (typeof LessonStatusManager !== 'undefined') {
    const lessonStatusManager = new LessonStatusManager();
    statusBanner = new StatusBanner({ lessonStatusManager });
  } else {
    // フォールバック: 依存関係なしで初期化
    statusBanner = new StatusBanner();
  }
  
  // グローバルに公開（HTMLから呼び出されるため）
  window.statusBanner = statusBanner;
}); 