/**
 * レッスン状況管理システム
 * 管理画面とフロントエンドで統一的にレッスン状況を管理
 */
class LessonStatusManager {
  constructor() {
    this.storageKey = 'rbs_lesson_status';
    
    // 統一されたステータス定義
    this.statusDefinitions = {
      'scheduled': {
        key: 'scheduled',
        displayText: '通常開催',
        adminText: '開催',
        color: '#1abc9c', // primary-teal
        backgroundColor: 'var(--primary-teal)',
        icon: '✅',
        cssClass: 'scheduled'
      },
      'cancelled': {
        key: 'cancelled',
        displayText: '中止',
        adminText: '中止',
        color: '#e74c3c',
        backgroundColor: '#e74c3c',
        icon: '❌',
        cssClass: 'cancelled'
      },
      'indoor': {
        key: 'indoor',
        displayText: '室内開催',
        adminText: '室内開催',
        color: '#f39c12', // secondary-yellow
        backgroundColor: 'var(--secondary-yellow)',
        icon: '🏠',
        cssClass: 'indoor'
      },
      'postponed': {
        key: 'postponed',
        displayText: '延期',
        adminText: '延期',
        color: '#3498db',
        backgroundColor: 'var(--primary-blue)',
        icon: '⏰',
        cssClass: 'postponed'
      }
    };
    
    this.defaultStatus = {
      date: null,
      globalStatus: 'scheduled',
      globalMessage: '',
      courses: {
        basic: {
          name: 'ベーシックコース（年長〜小3）',
          time: '17:00-17:50',
          status: 'scheduled',
          message: ''
        },
        advance: {
          name: 'アドバンスコース（小4〜小6）',
          time: '18:00-18:50', 
          status: 'scheduled',
          message: ''
        }
      },
      lastUpdated: null
    };
  }

  /**
   * 今日の日付を取得（YYYY-MM-DD形式）
   */
  getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * デフォルトステータスを作成
   */
  createDefaultStatus(date) {
    return {
      ...this.defaultStatus,
      date: date,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * レッスン状況を取得
   */
  getLessonStatus(date = null) {
    try {
      const targetDate = date || this.getTodayDate();
      const data = localStorage.getItem(this.storageKey);
      
      if (!data) {
        return this.createDefaultStatus(targetDate);
      }
      
      const allStatus = JSON.parse(data);
      return allStatus[targetDate] || this.createDefaultStatus(targetDate);
    } catch (error) {
      console.error('レッスン状況の取得に失敗:', error);
      return this.createDefaultStatus(date || this.getTodayDate());
    }
  }

  /**
   * レッスン状況を保存
   */
  saveLessonStatus(statusData, date = null) {
    try {
      const targetDate = date || this.getTodayDate();
      const data = localStorage.getItem(this.storageKey);
      const allStatus = data ? JSON.parse(data) : {};
      
      // データを正規化
      const normalizedData = this.normalizeStatusData(statusData, targetDate);
      
      allStatus[targetDate] = normalizedData;
      
      localStorage.setItem(this.storageKey, JSON.stringify(allStatus));
      
      // イベントを発火
      this.dispatchStatusUpdateEvent(normalizedData);
      
      console.log('レッスン状況を保存しました:', normalizedData);
      return { success: true, data: normalizedData };
    } catch (error) {
      console.error('レッスン状況の保存に失敗:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * データを正規化
   */
  normalizeStatusData(data, date) {
    const normalized = {
      date: date,
      globalStatus: data.globalStatus || 'scheduled',
      globalMessage: data.globalMessage || '',
      courses: {
        basic: {
          name: 'ベーシックコース（年長〜小3）',
          time: '17:00-17:50',
          status: data.courses?.basic?.status || data.globalStatus || 'scheduled',
          message: data.courses?.basic?.message || ''
        },
        advance: {
          name: 'アドバンスコース（小4〜小6）',
          time: '18:00-18:50',
          status: data.courses?.advance?.status || data.globalStatus || 'scheduled',
          message: data.courses?.advance?.message || ''
        }
      },
      lastUpdated: new Date().toISOString()
    };

    return normalized;
  }

  /**
   * ステータス更新イベントを発火
   */
  dispatchStatusUpdateEvent(statusData) {
    const event = new CustomEvent('lessonStatusUpdated', {
      detail: statusData,
      bubbles: true
    });
    window.dispatchEvent(event);
  }

  /**
   * 古いデータをクリーンアップ（30日以上前のデータを削除）
   */
  cleanupOldData() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return;

      const allStatus = JSON.parse(data);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      const cutoffDateString = cutoffDate.toISOString().split('T')[0];

      const cleanedData = {};
      Object.keys(allStatus).forEach(date => {
        if (date >= cutoffDateString) {
          cleanedData[date] = allStatus[date];
        }
      });

      localStorage.setItem(this.storageKey, JSON.stringify(cleanedData));
    } catch (error) {
      console.error('古いデータのクリーンアップに失敗:', error);
    }
  }

  /**
   * 管理画面のステータスを標準形式にマップ
   */
  mapAdminStatusToStandard(adminStatus) {
    // 管理画面の表示テキストから標準ステータスキーを取得
    for (const [key, definition] of Object.entries(this.statusDefinitions)) {
      if (definition.adminText === adminStatus) {
        return key;
      }
    }
    return 'scheduled'; // デフォルト
  }

  /**
   * 標準ステータスを管理画面形式にマップ
   */
  mapStandardToAdminStatus(standardStatus) {
    const definition = this.statusDefinitions[standardStatus];
    return definition ? definition.adminText : '開催';
  }

  /**
   * グローバルステータスを標準形式にマップ
   */
  mapStandardToGlobalStatus(standardStatus) {
    return standardStatus; // 既に標準形式
  }

  /**
   * 管理画面のフォームに状況を設定
   */
  populateAdminForm(statusData) {
    // グローバルステータスを設定
    const globalStatusInput = document.querySelector(`input[name="global-status"][value="${statusData.globalStatus}"]`);
    if (globalStatusInput) {
      globalStatusInput.checked = true;
    }

    // グローバルメッセージを設定
    const globalMessageField = document.getElementById('global-message');
    if (globalMessageField) {
      globalMessageField.value = statusData.globalMessage || '';
    }

    // 日付を設定
    const dateField = document.getElementById('lesson-date');
    if (dateField) {
      dateField.value = statusData.date || this.getTodayDate();
    }

    // コース別ステータスを設定
    this.setAdminCourseStatus('basic', statusData.courses.basic);
    this.setAdminCourseStatus('advance', statusData.courses.advance);
  }

  /**
   * 管理画面のコース別ステータスを設定
   */
  setAdminCourseStatus(course, courseData) {
    const adminStatus = this.mapStandardToAdminStatus(courseData.status);
    
    // ステータスラジオボタンを設定
    const statusInput = document.querySelector(`input[name="${course}-lesson"][value="${adminStatus}"]`);
    if (statusInput) {
      statusInput.checked = true;
    }

    // メッセージを設定
    const messageField = document.getElementById(`${course}-lesson-note`);
    if (messageField) {
      messageField.value = courseData.message || '';
    }
  }

  /**
   * 管理画面のフォームデータを標準形式に変換
   */
  convertFromAdminForm(formData) {
    const converted = {
      date: formData.date,
      globalStatus: formData.globalStatus || 'scheduled',
      globalMessage: formData.globalMessage || '',
      courses: {}
    };

    // コース別データを変換
    ['basic', 'advance'].forEach(course => {
      if (formData[course]) {
        converted.courses[course] = {
          status: this.mapAdminStatusToStandard(formData[course].status),
          message: formData[course].note || ''
        };
      }
    });

    return converted;
  }

  /**
   * ステータステキストを取得（LP側表示用）
   */
  getStatusText(status) {
    const definition = this.statusDefinitions[status];
    return definition ? definition.displayText : '不明';
  }

  /**
   * ステータスカラーを取得
   */
  getStatusColor(status) {
    const definition = this.statusDefinitions[status];
    return definition ? definition.color : '#6c757d';
  }

  /**
   * ステータス背景色を取得
   */
  getStatusBackgroundColor(status) {
    const definition = this.statusDefinitions[status];
    return definition ? definition.backgroundColor : '#6c757d';
  }

  /**
   * ステータスアイコンを取得
   */
  getStatusIcon(status) {
    const definition = this.statusDefinitions[status];
    return definition ? definition.icon : 'ℹ️';
  }

  /**
   * ステータスCSSクラスを取得
   */
  getStatusCssClass(status) {
    const definition = this.statusDefinitions[status];
    return definition ? definition.cssClass : 'unknown';
  }

  /**
   * 利用可能なステータス一覧を取得
   */
  getAvailableStatuses() {
    return Object.keys(this.statusDefinitions);
  }

  /**
   * ステータス定義を取得
   */
  getStatusDefinition(status) {
    return this.statusDefinitions[status] || null;
  }

  /**
   * 通常開催かどうかをチェック
   */
  isNormalStatus(statusData) {
    // グローバルステータスが通常開催で、メッセージがない場合
    const isGlobalNormal = statusData.globalStatus === 'scheduled' && !statusData.globalMessage;
    
    // 各コースが通常開催で、メッセージがない場合
    const isBasicNormal = statusData.courses.basic.status === 'scheduled' && !statusData.courses.basic.message;
    const isAdvanceNormal = statusData.courses.advance.status === 'scheduled' && !statusData.courses.advance.message;
    
    return isGlobalNormal && isBasicNormal && isAdvanceNormal;
  }

  /**
   * ステータスサマリーを取得
   */
  getStatusSummary(statusData) {
    if (this.isNormalStatus(statusData)) {
      return {
        type: 'normal',
        message: '通常通り開催予定です',
        hasSpecialNotice: false
      };
    }

    return {
      type: 'special',
      message: this.getStatusText(statusData.globalStatus),
      hasSpecialNotice: true,
      globalMessage: statusData.globalMessage
    };
  }

  /**
   * 初期化
   */
  init() {
    // 古いデータをクリーンアップ
    this.cleanupOldData();
    
    // 今日のデータが存在しない場合はデフォルトを作成
    const todayStatus = this.getLessonStatus();
    if (!todayStatus.lastUpdated) {
      this.saveLessonStatus(this.defaultStatus);
    }
  }
}

// グローバルに公開
if (typeof window !== 'undefined') {
  window.LessonStatusManager = LessonStatusManager;
} 