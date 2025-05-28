/**
 * レッスン状況管理システム
 * 管理画面とフロントエンドで統一的にレッスン状況を管理
 */
class LessonStatusManager {
  constructor() {
    this.storageKey = 'rbs_lesson_status';
    this.defaultStatus = {
      date: null,
      globalStatus: 'scheduled', // scheduled, cancelled, indoor, postponed
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
   * 今日の日付を取得
   */
  getTodayDate() {
    return new Date().toISOString().split('T')[0];
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
   * 管理画面のフォームデータから変換
   */
  convertFromAdminForm(formData) {
    const globalStatus = this.getGlobalStatusFromForm();
    const globalMessage = formData.globalMessage || document.getElementById('global-message')?.value || '';
    
    return {
      globalStatus: globalStatus,
      globalMessage: globalMessage,
      courses: {
        basic: {
          status: this.mapAdminStatusToStandard(formData.basic?.status || '開催'),
          message: formData.basic?.note || ''
        },
        advance: {
          status: this.mapAdminStatusToStandard(formData.advance?.status || '開催'),
          message: formData.advance?.note || ''
        }
      }
    };
  }

  /**
   * グローバルステータスをフォームから取得
   */
  getGlobalStatusFromForm() {
    const globalStatusInput = document.querySelector('input[name="global-status"]:checked');
    if (globalStatusInput) {
      return this.mapGlobalStatusToStandard(globalStatusInput.value);
    }
    return 'scheduled';
  }

  /**
   * 管理画面のステータスを標準形式にマップ
   */
  mapAdminStatusToStandard(adminStatus) {
    const mapping = {
      '開催': 'scheduled',
      '中止': 'cancelled'
    };
    return mapping[adminStatus] || 'scheduled';
  }

  /**
   * グローバルステータスを標準形式にマップ
   */
  mapGlobalStatusToStandard(globalStatus) {
    const mapping = {
      'normal': 'scheduled',
      'scheduled': 'scheduled',
      'cancelled': 'cancelled',
      'indoor': 'indoor',
      'postponed': 'postponed'
    };
    return mapping[globalStatus] || 'scheduled';
  }

  /**
   * 標準ステータスを管理画面形式にマップ
   */
  mapStandardToAdminStatus(standardStatus) {
    const mapping = {
      'scheduled': '開催',
      'cancelled': '中止',
      'indoor': '開催',
      'postponed': '開催'
    };
    return mapping[standardStatus] || '開催';
  }

  /**
   * 管理画面のフォームに状況を設定
   */
  populateAdminForm(statusData) {
    // グローバルステータスを設定
    const globalStatusValue = this.mapStandardToGlobalStatus(statusData.globalStatus);
    const globalStatusInput = document.querySelector(`input[name="global-status"][value="${globalStatusValue}"]`);
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
   * 標準ステータスをグローバルステータスにマップ
   */
  mapStandardToGlobalStatus(standardStatus) {
    const mapping = {
      'scheduled': 'scheduled',
      'cancelled': 'cancelled',
      'indoor': 'scheduled',
      'postponed': 'scheduled'
    };
    return mapping[standardStatus] || 'scheduled';
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
   * ステータス更新イベントを発火
   */
  dispatchStatusUpdateEvent(statusData) {
    const event = new CustomEvent('lessonStatusUpdated', {
      detail: statusData
    });
    window.dispatchEvent(event);
  }

  /**
   * ステータステキストを取得
   */
  getStatusText(status) {
    const texts = {
      'scheduled': '開催予定',
      'cancelled': '中止',
      'indoor': '室内開催',
      'postponed': '延期'
    };
    return texts[status] || '未定';
  }

  /**
   * ステータスカラーを取得
   */
  getStatusColor(status) {
    const colors = {
      'scheduled': '#28a745',
      'cancelled': '#dc3545',
      'indoor': '#ffc107',
      'postponed': '#17a2b8'
    };
    return colors[status] || '#6c757d';
  }

  /**
   * ステータスアイコンを取得
   */
  getStatusIcon(status) {
    const icons = {
      'scheduled': '✅',
      'cancelled': '❌',
      'indoor': '🏠',
      'postponed': '⏰'
    };
    return icons[status] || 'ℹ️';
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
   * 古いデータをクリーンアップ
   */
  cleanupOldData(daysToKeep = 30) {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return;

      const allStatus = JSON.parse(data);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateString = cutoffDate.toISOString().split('T')[0];

      const cleanedData = {};
      Object.keys(allStatus).forEach(date => {
        if (date >= cutoffDateString) {
          cleanedData[date] = allStatus[date];
        }
      });

      localStorage.setItem(this.storageKey, JSON.stringify(cleanedData));
      console.log(`${daysToKeep}日より古いレッスン状況データをクリーンアップしました`);
    } catch (error) {
      console.error('データクリーンアップに失敗:', error);
    }
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
window.LessonStatusManager = LessonStatusManager; 