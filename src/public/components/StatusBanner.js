/**
 * ステータスバナーコンポーネント
 * レッスンの開催状況を表示
 */
class StatusBanner {
  constructor() {
    this.config = {
      storageKey: 'rbs_lesson_status',
      statusTexts: {
        normal: '通常開催',
        cancelled: '中止',
        indoor: '室内開催',
        postponed: '延期'
      },
      statusColors: {
        normal: '#28a745',
        cancelled: '#dc3545',
        indoor: '#ffc107',
        postponed: '#17a2b8'
      }
    };
  }

  /**
   * ステータスバナーを生成
   */
  generateHTML() {
    const today = new Date().toISOString().split('T')[0];
    const statusData = this.getLessonStatus(today);
    
    if (!statusData || this.isNormalStatus(statusData)) {
      return ''; // 通常開催の場合は表示しない
    }

    return `
      <div class="status-banner" id="status-banner">
        <div class="container">
          <div class="status-content">
            <div class="status-icon">
              ${this.getStatusIcon(statusData)}
            </div>
            <div class="status-info">
              <h3 class="status-title">${today} のレッスン状況</h3>
              <div class="status-courses">
                ${this.generateCourseStatus('ベーシックコース（年長〜小3）', statusData.basic)}
                ${this.generateCourseStatus('アドバンスコース（小4〜小6）', statusData.advance)}
              </div>
            </div>
            <button class="status-close" onclick="statusBanner.hideBanner()" aria-label="閉じる">
              ×
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * コース別ステータスを生成
   */
  generateCourseStatus(courseName, courseData) {
    if (courseData.status === 'normal') {
      return ''; // 通常開催は表示しない
    }

    const statusText = this.config.statusTexts[courseData.status];
    const statusColor = this.config.statusColors[courseData.status];

    return `
      <div class="course-status">
        <div class="course-info">
          <span class="course-name">${courseName}</span>
          <span class="course-status-text" style="color: ${statusColor}">
            ${statusText}
          </span>
        </div>
        ${courseData.message ? `<div class="course-message">${courseData.message}</div>` : ''}
      </div>
    `;
  }

  /**
   * ステータスアイコンを取得
   */
  getStatusIcon(statusData) {
    const hasImportantStatus = statusData.basic.status === 'cancelled' || 
                              statusData.advance.status === 'cancelled';
    
    if (hasImportantStatus) {
      return '⚠️';
    }
    
    const hasIndoorStatus = statusData.basic.status === 'indoor' || 
                           statusData.advance.status === 'indoor';
    
    if (hasIndoorStatus) {
      return '🏠';
    }
    
    return 'ℹ️';
  }

  /**
   * レッスン状況データを取得
   */
  getLessonStatus(date) {
    try {
      const data = localStorage.getItem(this.config.storageKey);
      if (!data) return null;
      
      const allStatus = JSON.parse(data);
      return allStatus[date] || null;
    } catch (error) {
      console.error('レッスン状況の取得に失敗:', error);
      return null;
    }
  }

  /**
   * 通常開催かどうかをチェック
   */
  isNormalStatus(statusData) {
    return statusData.basic.status === 'normal' && 
           statusData.advance.status === 'normal';
  }

  /**
   * ページに挿入
   */
  insertIntoPage() {
    const html = this.generateHTML();
    if (!html) return;

    // 既存のバナーを削除
    const existingBanner = document.getElementById('status-banner');
    if (existingBanner) {
      existingBanner.remove();
    }

    // ヘッダーの後に挿入
    const header = document.querySelector('.header');
    if (header) {
      header.insertAdjacentHTML('afterend', html);
      
      // アニメーション効果
      const banner = document.getElementById('status-banner');
      if (banner) {
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(-100%)';
        
        setTimeout(() => {
          banner.style.transition = 'all 0.3s ease';
          banner.style.opacity = '1';
          banner.style.transform = 'translateY(0)';
        }, 100);
      }
    }
  }

  /**
   * バナーを非表示
   */
  hideBanner() {
    const banner = document.getElementById('status-banner');
    if (banner) {
      banner.style.transition = 'all 0.3s ease';
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(-100%)';
      
      setTimeout(() => {
        banner.remove();
      }, 300);
    }
  }

  /**
   * 自動更新を開始
   */
  startAutoUpdate() {
    // 30秒ごとに更新をチェック
    setInterval(() => {
      this.insertIntoPage();
    }, 30000);
  }
}

// グローバルに公開
window.StatusBanner = StatusBanner;

// インスタンスを作成（グローバル関数用）
const statusBanner = new StatusBanner(); 