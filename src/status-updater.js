// RBS陸上教室 - 開催状況自動更新システム
// このファイルをindex.htmlで読み込むことで、管理画面で設定した内容が自動反映されます

/**
 * レッスン状況更新システム
 * 統一されたAPIエンドポイントを使用
 */
class LessonStatusUpdater {
  constructor() {
    this.storageKey = 'rbs_lesson_status';
    this.updateInterval = 5000; // 5秒ごとに更新（LocalStorageなので短縮）
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  init() {
    this.updateLessonStatus();
    // 定期的な更新を設定
    setInterval(() => {
      this.updateLessonStatus();
    }, this.updateInterval);
  }

  async updateLessonStatus() {
    try {
      // LocalStorageからレッスン状況を取得
      const storedData = localStorage.getItem(this.storageKey);
      
      let data;
      if (storedData) {
        data = JSON.parse(storedData);
        console.log('LocalStorageからレッスン状況を読み込みました:', data);
      } else {
        // データがない場合はデフォルト状況を使用
        console.log('レッスン状況データが見つかりません。デフォルト状況を使用します。');
        this.setDefaultStatus();
        return;
      }
      
      // データ形式を内部形式に変換
      const statusData = this.convertApiDataToInternalFormat(data);
      
      // ページに状況を適用
      this.applyStatusToPage(statusData);
      
      // 最終更新時刻を表示
      this.updateLastUpdated(data.lastUpdated);
      
      // リトライカウントをリセット
      this.retryCount = 0;
      
    } catch (error) {
      console.error('レッスン状況の取得に失敗:', error);
      
      this.retryCount++;
      if (this.retryCount <= this.maxRetries) {
        console.log(`リトライ ${this.retryCount}/${this.maxRetries}`);
        setTimeout(() => this.updateLessonStatus(), 2000);
      } else {
        console.error('最大リトライ回数に達しました。デフォルト状況を表示します。');
        this.setDefaultStatus();
      }
    }
  }

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
      ]
    };
  }

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
      
    } catch (error) {
      console.error('開催状況の更新中にエラーが発生しました:', error);
    }
  }

  updateOverallStatus(statusData) {
    // 全体開催状況の設定
    const overallConfig = {
      'scheduled': {
        text: '本日は開催予定です',
        icon: '✅',
        bgColor: '#27ae60', // グリーン
        textColor: 'white'
      },
      'modified': {
        text: '本日は一部変更して開催いたします',
        icon: '⚠️',
        bgColor: '#f39c12', // オレンジ
        textColor: 'white'
      },
      'cancelled': {
        text: '本日は中止いたします',
        icon: '❌',
        bgColor: '#e74c3c', // レッド
        textColor: 'white'
      }
    };

    // 全体開催状況がない場合、または開催予定の場合は表示しない
    if (!statusData.overall.status || statusData.overall.status === 'scheduled') {
      const overallInfo = document.querySelector('.weather-info');
      if (overallInfo) {
        overallInfo.style.display = 'none';
      }
      return;
    }

    const config = overallConfig[statusData.overall.status];
    const fullOverallText = config.text + (statusData.overall.note ? ` (${statusData.overall.note})` : '');

    // 全体開催状況要素を更新または作成
    let overallInfo = document.querySelector('.weather-info');
    if (!overallInfo) {
      // 要素が存在しない場合は作成
      const statusDetails = document.querySelector('.status-details');
      if (statusDetails) {
        overallInfo = document.createElement('div');
        overallInfo.className = 'weather-info';
        statusDetails.appendChild(overallInfo);
      }
    }

    if (overallInfo) {
      overallInfo.style.display = 'flex';
      overallInfo.style.background = config.bgColor;
      overallInfo.style.color = config.textColor;
      
      overallInfo.innerHTML = `
        <span class="weather-icon">${config.icon}</span>
        <span class="weather-text">${fullOverallText}</span>
      `;
      
      // ボックスシャドウも開催状況に応じて調整
      const shadowColor = this.hexToRgba(config.bgColor, 0.3);
      overallInfo.style.boxShadow = `0 8px 25px ${shadowColor}`;
    }
  }

  // ヘックスカラーをRGBAに変換するヘルパー関数
  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  updateLessonItems(statusData) {
    // ベーシックコースの更新
    this.updateSingleLessonItem(
      '17:00-17:50',
      'ベーシックコース（年長〜小3）',
      statusData.lessons[0].status,
      statusData.lessons[0].note
    );

    // アドバンスコースの更新
    this.updateSingleLessonItem(
      '18:00-18:50',
      'アドバンスコース（小4〜小6）',
      statusData.lessons[1].status,
      statusData.lessons[1].note
    );
  }

  updateSingleLessonItem(timeSlot, courseName, status, note) {
    // 該当する時間のレッスン項目を探す
    const statusItems = document.querySelectorAll('.status-item');
    
    statusItems.forEach(item => {
      const timeElement = item.querySelector('.time-slot strong');
      if (timeElement && timeElement.textContent === timeSlot) {
        // ステータスバッジを更新
        const statusBadge = item.querySelector('.status-badge');
        if (statusBadge) {
          const statusInfo = this.getStatusInfo(status);
          statusBadge.className = `status-badge ${status}`;
          statusBadge.textContent = statusInfo.text + (note ? ` (${note})` : '');
        }

        // コース名を更新
        const courseElement = item.querySelector('.course-name');
        if (courseElement) {
          courseElement.textContent = courseName;
        }
      }
    });
  }

  getStatusInfo(status) {
    const statusMap = {
      'scheduled': { text: '開催予定', class: 'scheduled' },
      'cancelled': { text: '中止', class: 'cancelled' }
    };
    
    return statusMap[status] || statusMap['scheduled'];
  }

  updateLastUpdated(lastUpdated) {
    const lastUpdatedElement = document.querySelector('.last-updated');
    if (lastUpdatedElement && lastUpdated) {
      const updateTime = new Date(lastUpdated);
      const formattedTime = updateTime.toLocaleString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      lastUpdatedElement.textContent = `最終更新: ${formattedTime}`;
    }
  }

  updateMainStatusIndicator(statusData) {
    // メインのステータスインジケーター（ヘッダー部分）を更新
    const mainIndicator = document.querySelector('.status-indicator');
    if (mainIndicator) {
      // 両方のコースが中止の場合
      if (statusData.lessons[0].status === 'cancelled' && statusData.lessons[1].status === 'cancelled') {
        mainIndicator.className = 'status-indicator cancelled';
        mainIndicator.textContent = '本日中止';
      }
      // その他の場合（開催予定）
      else {
        mainIndicator.className = 'status-indicator scheduled';
        mainIndicator.textContent = '開催予定';
      }
    }
  }

  setDefaultStatus() {
    // デフォルトの状況を設定（管理画面で設定されていない場合）
    const defaultStatus = {
      overall: {
        status: 'scheduled',
        note: ''
      },
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
      ]
    };

    this.applyStatusToPage(defaultStatus);
  }

  // 手動で状況を更新するメソッド（デバッグ用）
  manualUpdate(statusData) {
    localStorage.setItem(this.storageKey, JSON.stringify({
      ...statusData,
      lastUpdated: new Date().toISOString()
    }));
    this.updateLessonStatus();
  }
}

// インスタンスを作成して自動実行
const lessonStatusUpdater = new LessonStatusUpdater();

// グローバルに公開（デバッグ用）
window.LessonStatusUpdater = lessonStatusUpdater; 