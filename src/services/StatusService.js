/**
 * StatusService
 * レッスン状況の管理と更新を行うサービスクラス
 * 統一されたクラス設計とエラーハンドリングを実装
 */
class StatusService {
  constructor(options = {}) {
    this.options = {
      storageKey: 'rbs_lesson_status',
      updateInterval: 5000, // 5秒ごとに更新
      maxRetries: 3,
      retryDelay: 2000,
      apiEndpoint: null, // 将来的なAPI連携用
      ...options
    };

    // 状態管理
    this.state = {
      isInitialized: false,
      isUpdating: false,
      retryCount: 0,
      lastUpdateTime: null
    };

    // タイマー管理
    this.timers = {
      update: null,
      retry: null
    };

    // イベントハンドラーのバインド
    this.boundHandlers = {
      handleStorageChange: this.handleStorageChange.bind(this),
      handleVisibilityChange: this.handleVisibilityChange.bind(this)
    };

    this.init();
  }

  /**
   * サービスを初期化
   */
  async init() {
    try {
      this.bindEvents();
      this.startPeriodicUpdate();
      this.state.isInitialized = true;
      
      this.dispatchEvent('status-service:initialized', { service: this });
      
    } catch (error) {
      this.handleError('サービスの初期化に失敗', error);
    }
  }

  /**
   * イベントリスナーを設定
   */
  bindEvents() {
    // ストレージ変更の監視
    window.addEventListener('storage', this.boundHandlers.handleStorageChange);
    
    // ページ可視性変更の監視
    document.addEventListener('visibilitychange', this.boundHandlers.handleVisibilityChange);
  }

  /**
   * ストレージ変更処理
   */
  handleStorageChange(event) {
    if (event.key === this.options.storageKey) {
      this.dispatchEvent('status-service:storage-changed', {
        oldValue: event.oldValue,
        newValue: event.newValue
      });
    }
  }

  /**
   * ページ可視性変更処理
   */
  handleVisibilityChange() {
    if (!document.hidden) {
      // ページが再表示されたときに即座に更新をチェック
      this.updateLessonStatus();
    }
  }

  /**
   * 定期更新を開始
   */
  startPeriodicUpdate() {
    this.stopPeriodicUpdate();
    
    // 初回実行
    this.updateLessonStatus();
    
    // 定期実行
    this.timers.update = setInterval(() => {
      this.updateLessonStatus();
    }, this.options.updateInterval);
    
    this.dispatchEvent('status-service:periodic-update-started');
  }

  /**
   * 定期更新を停止
   */
  stopPeriodicUpdate() {
    if (this.timers.update) {
      clearInterval(this.timers.update);
      this.timers.update = null;
    }
    
    if (this.timers.retry) {
      clearTimeout(this.timers.retry);
      this.timers.retry = null;
    }
    
    this.dispatchEvent('status-service:periodic-update-stopped');
  }

  /**
   * レッスン状況を更新
   */
  async updateLessonStatus() {
    if (this.state.isUpdating) return;

    try {
      this.state.isUpdating = true;
      
      // LocalStorageからレッスン状況を取得
      const storedData = localStorage.getItem(this.options.storageKey);
      
      let data;
      if (storedData) {
        data = JSON.parse(storedData);
        console.log('LocalStorageからレッスン状況を読み込みました:', data);
      } else {
        console.log('レッスン状況データが見つかりません。デフォルト状況を使用します。');
        this.setDefaultStatus();
        return;
      }
      
      // データ形式を内部形式に変換
      const statusData = this.convertApiDataToInternalFormat(data);
      
      // 状況をページに適用
      this.applyStatusToPage(statusData);
      
      // 最終更新時刻を更新
      this.updateLastUpdated(data.lastUpdated);
      
      // リトライカウントをリセット
      this.state.retryCount = 0;
      this.state.lastUpdateTime = new Date();
      
      this.dispatchEvent('status-service:updated', { data: statusData });
      
    } catch (error) {
      this.handleUpdateError(error);
    } finally {
      this.state.isUpdating = false;
    }
  }

  /**
   * APIデータを内部形式に変換
   */
  convertApiDataToInternalFormat(apiData) {
    return {
      overall: {
        status: apiData.overallStatus || 'scheduled',
        note: apiData.overallNote || ''
      },
      lessons: apiData.lessons || [
        {
          timeSlot: '17:00-17:50',
          courseName: 'ベーシックコース（年長〜小3）',
          status: 'scheduled',
          note: ''
        },
        {
          timeSlot: '18:00-18:50',
          courseName: 'アドバンスコース（小4〜小6）',
          status: 'scheduled',
          note: ''
        }
      ],
      lastUpdated: apiData.lastUpdated || new Date().toISOString()
    };
  }

  /**
   * 状況をページに適用
   */
  applyStatusToPage(statusData) {
    try {
      // 全体開催状況の更新
      this.updateOverallStatus(statusData);
      
      // レッスン状況の更新
      this.updateLessonItems(statusData);
      
      // 最終更新時刻の更新
      this.updateLastUpdated(statusData.lastUpdated);
      
      // 全体のステータスインジケーターを更新
      this.updateMainStatusIndicator(statusData);
      
      this.dispatchEvent('status-service:page-updated', { data: statusData });
      
    } catch (error) {
      this.handleError('開催状況の更新中にエラーが発生しました', error);
    }
  }

  /**
   * 全体開催状況を更新
   */
  updateOverallStatus(statusData) {
    try {
      const statusBanner = document.querySelector('.status-banner');
      const statusHeader = document.querySelector('.status-header');
      
      if (!statusData.overall || statusData.overall.status === 'scheduled') {
        // 通常開催の場合はバナーを非表示
        if (statusBanner) {
          statusBanner.style.display = 'none';
        }
        if (statusHeader) {
          statusHeader.style.display = 'none';
        }
        return;
      }
      
      const statusInfo = this.getStatusInfo(statusData.overall.status);
      const fullText = statusInfo.text + (statusData.overall.note ? ` (${statusData.overall.note})` : '');
      
      // ステータスバナーの更新
      if (statusBanner) {
        statusBanner.style.background = statusInfo.bgColor;
        statusBanner.style.color = statusInfo.textColor;
        statusBanner.style.display = 'block';
        
        statusBanner.innerHTML = `
          <div class="status-content">
            <span class="status-icon">${statusInfo.icon}</span>
            <span class="status-text">${fullText}</span>
            <button class="status-close" onclick="this.parentElement.parentElement.style.display='none'">×</button>
          </div>
        `;
        
        // ボックスシャドウの調整
        const shadowColor = this.hexToRgba(statusInfo.bgColor, 0.3);
        statusBanner.style.boxShadow = `0 8px 25px ${shadowColor}`;
      }
      
      // ステータスヘッダーの更新
      if (statusHeader) {
        statusHeader.style.background = statusInfo.bgColor;
        statusHeader.style.color = statusInfo.textColor;
        statusHeader.style.display = 'block';
        
        statusHeader.innerHTML = `
          <div class="status-content">
            <span class="status-icon">${statusInfo.icon}</span>
            <span class="status-text">${fullText}</span>
          </div>
        `;
      }
      
      // 個別レッスン状況の更新
      this.updateLessonItems(statusData);
      
      // メインステータスインジケーターの更新
      this.updateMainStatusIndicator(statusData);
      
    } catch (error) {
      this.handleError('全体開催状況の更新に失敗', error);
    }
  }

  /**
   * 個別レッスン状況を更新
   */
  updateLessonItems(statusData) {
    if (!statusData.lessons || !Array.isArray(statusData.lessons)) return;
    
    statusData.lessons.forEach((lesson, index) => {
      this.updateSingleLessonItem(
        lesson.timeSlot,
        lesson.courseName,
        lesson.status,
        lesson.note
      );
    });
  }

  /**
   * 単一レッスン項目を更新
   */
  updateSingleLessonItem(timeSlot, courseName, status, note) {
    try {
      const statusItems = document.querySelectorAll('.status-item');
      const targetItem = Array.from(statusItems).find(item => {
        const timeElement = item.querySelector('.status-item-time');
        return timeElement && timeElement.textContent.includes(timeSlot);
      });
      
      if (!targetItem) return;
      
      const statusInfo = this.getStatusInfo(status);
      const statusBadge = targetItem.querySelector('.status-item-badge');
      const statusText = targetItem.querySelector('.status-text');
      
      if (statusBadge) {
        statusBadge.style.background = statusInfo.bgColor;
        statusBadge.style.color = statusInfo.textColor;
        statusBadge.textContent = statusInfo.text;
        statusBadge.className = `status-item-badge ${status}`;
      }
      
      if (statusText && note) {
        statusText.textContent = note;
        statusText.style.color = status === 'cancelled' ? statusInfo.bgColor : 'inherit';
      }
      
    } catch (error) {
      this.handleError('レッスン項目の更新に失敗', error);
    }
  }

  /**
   * ステータス情報を取得
   */
  getStatusInfo(status) {
    const statusConfig = {
      'scheduled': {
        text: '開催予定',
        icon: '✅',
        bgColor: '#27ae60',
        textColor: 'white'
      },
      'modified': {
        text: '一部変更',
        icon: '⚠️',
        bgColor: '#f39c12',
        textColor: 'white'
      },
      'cancelled': {
        text: '中止',
        icon: '❌',
        bgColor: '#e74c3c',
        textColor: 'white'
      }
    };
    
    return statusConfig[status] || statusConfig['scheduled'];
  }

  /**
   * 最終更新時刻を更新
   */
  updateLastUpdated(lastUpdated) {
    try {
      const lastUpdatedElements = document.querySelectorAll('.last-updated');
      if (lastUpdatedElements.length === 0) return;
      
      const formattedTime = this.formatLastUpdated(lastUpdated);
      lastUpdatedElements.forEach(element => {
        element.textContent = `最終更新: ${formattedTime}`;
      });
      
    } catch (error) {
      this.handleError('最終更新時刻の更新に失敗', error);
    }
  }

  /**
   * メインステータスインジケーターを更新
   */
  updateMainStatusIndicator(statusData) {
    try {
      const indicator = document.querySelector('.main-status-indicator');
      if (!indicator) return;
      
      const overallStatus = this.getOverallStatus(statusData);
      const statusInfo = this.getStatusInfo(overallStatus);
      
      indicator.style.background = statusInfo.bgColor;
      indicator.style.color = statusInfo.textColor;
      indicator.textContent = statusInfo.text;
      
    } catch (error) {
      this.handleError('メインステータスインジケーターの更新に失敗', error);
    }
  }

  /**
   * 全体ステータスを判定
   */
  getOverallStatus(statusData) {
    if (statusData.overall && statusData.overall.status !== 'scheduled') {
      return statusData.overall.status;
    }
    
    if (statusData.lessons && statusData.lessons.length > 0) {
      const hasModified = statusData.lessons.some(lesson => lesson.status === 'modified');
      const hasCancelled = statusData.lessons.some(lesson => lesson.status === 'cancelled');
      
      if (hasCancelled) return 'cancelled';
      if (hasModified) return 'modified';
    }
    
    return 'scheduled';
  }

  /**
   * デフォルトステータスを設定
   */
  setDefaultStatus() {
    try {
      const defaultData = {
        overallStatus: 'scheduled',
        overallNote: '',
        lessons: [
          {
            timeSlot: '17:00-17:50',
            courseName: 'ベーシックコース（年長〜小3）',
            status: 'scheduled',
            note: ''
          },
          {
            timeSlot: '18:00-18:50',
            courseName: 'アドバンスコース（小4〜小6）',
            status: 'scheduled',
            note: ''
          }
        ],
        lastUpdated: new Date().toISOString()
      };
      
      // LocalStorageに保存
      localStorage.setItem(this.options.storageKey, JSON.stringify(defaultData));
      
      // ページに適用
      const statusData = this.convertApiDataToInternalFormat(defaultData);
      this.applyStatusToPage(statusData);
      
      this.dispatchEvent('status-service:default-set', { data: statusData });
      
    } catch (error) {
      this.handleError('デフォルトステータスの設定に失敗', error);
    }
  }

  /**
   * 手動でステータスを更新
   */
  async manualUpdate(statusData) {
    try {
      const validation = this.validateStatusData(statusData);
      if (!validation.isValid) {
        throw new Error(`データ検証エラー: ${validation.errors.join(', ')}`);
      }
      
      // LocalStorageに保存
      const dataToStore = {
        ...statusData,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(this.options.storageKey, JSON.stringify(dataToStore));
      
      // ページに適用
      const internalData = this.convertApiDataToInternalFormat(dataToStore);
      this.applyStatusToPage(internalData);
      
      this.dispatchEvent('status-service:manual-updated', { data: internalData });
      
      return true;
    } catch (error) {
      this.handleError('手動更新に失敗', error);
      return false;
    }
  }

  /**
   * ステータスデータを検証
   */
  validateStatusData(data) {
    const errors = [];
    
    if (!data || typeof data !== 'object') {
      errors.push('データが無効です');
      return { isValid: false, errors };
    }
    
    const validStatuses = ['scheduled', 'modified', 'cancelled'];
    
    if (data.overallStatus && !validStatuses.includes(data.overallStatus)) {
      errors.push('無効な全体ステータスです');
    }
    
    if (data.lessons && Array.isArray(data.lessons)) {
      data.lessons.forEach((lesson, index) => {
        if (!lesson.timeSlot) {
          errors.push(`レッスン${index + 1}: 時間帯が必須です`);
        }
        if (!lesson.courseName) {
          errors.push(`レッスン${index + 1}: コース名が必須です`);
        }
        if (lesson.status && !validStatuses.includes(lesson.status)) {
          errors.push(`レッスン${index + 1}: 無効なステータスです`);
        }
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 最終更新時刻をフォーマット
   */
  formatLastUpdated(lastUpdated) {
    try {
      if (!lastUpdated) return 'なし';
      
      const date = new Date(lastUpdated);
      const now = new Date();
      const diffMinutes = Math.floor((now - date) / (1000 * 60));
      
      if (diffMinutes < 1) {
        return 'たった今';
      } else if (diffMinutes < 60) {
        return `${diffMinutes}分前`;
      } else if (diffMinutes < 1440) {
        const hours = Math.floor(diffMinutes / 60);
        return `${hours}時間前`;
      } else {
        return date.toLocaleDateString('ja-JP', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (error) {
      return lastUpdated;
    }
  }

  /**
   * HEXカラーをRGBAに変換
   */
  hexToRgba(hex, alpha) {
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch (error) {
      return `rgba(0, 0, 0, ${alpha})`;
    }
  }

  /**
   * 更新エラーを処理
   */
  handleUpdateError(error) {
    this.state.retryCount++;
    
    if (this.state.retryCount <= this.options.maxRetries) {
      console.warn(`レッスン状況の更新に失敗しました。リトライします (${this.state.retryCount}/${this.options.maxRetries}):`, error);
      
      this.timers.retry = setTimeout(() => {
        this.updateLessonStatus();
      }, this.options.retryDelay * this.state.retryCount);
      
    } else {
      console.error('レッスン状況の更新に失敗しました。最大リトライ回数に達しました:', error);
      this.state.retryCount = 0;
      
      this.dispatchEvent('status-service:update-failed', {
        error: error.message,
        retryCount: this.state.retryCount
      });
    }
  }

  /**
   * カスタムイベントを発火
   */
  dispatchEvent(eventName, detail = {}) {
    try {
      const event = new CustomEvent(eventName, { detail });
      document.dispatchEvent(event);
    } catch (error) {
      console.error('イベント発火エラー:', error);
    }
  }

  /**
   * エラーハンドリング
   */
  handleError(message, error) {
    console.error(`[StatusService] ${message}:`, error);
    
    this.dispatchEvent('status-service:error', {
      message,
      error: error.message
    });
  }

  /**
   * 現在の状態を取得
   */
  getState() {
    return { ...this.state };
  }

  /**
   * 現在のデータを取得
   */
  async getCurrentData() {
    try {
      const storedData = localStorage.getItem(this.options.storageKey);
      if (storedData) {
        const data = JSON.parse(storedData);
        return this.convertApiDataToInternalFormat(data);
      }
      return null;
    } catch (error) {
      this.handleError('現在のデータ取得に失敗', error);
      return null;
    }
  }

  /**
   * オプションを更新
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    
    // 更新間隔が変更された場合は定期更新を再開
    if (newOptions.updateInterval) {
      this.startPeriodicUpdate();
    }
    
    this.dispatchEvent('status-service:options-updated', { options: this.options });
  }

  /**
   * サービスを破棄
   */
  destroy() {
    try {
      // 定期更新を停止
      this.stopPeriodicUpdate();
      
      // イベントリスナーを削除
      window.removeEventListener('storage', this.boundHandlers.handleStorageChange);
      document.removeEventListener('visibilitychange', this.boundHandlers.handleVisibilityChange);
      
      // 状態をリセット
      this.state.isInitialized = false;
      
      this.dispatchEvent('status-service:destroyed');
      
    } catch (error) {
      this.handleError('サービスの破棄に失敗', error);
    }
  }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StatusService;
} else if (typeof window !== 'undefined') {
  window.StatusService = StatusService;
} 