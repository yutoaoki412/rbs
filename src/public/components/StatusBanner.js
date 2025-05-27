/**
 * ステータスバナーコンポーネント
 * レッスンの開催状況を表示
 */
class StatusBanner {
  constructor() {
    this.lessonStatusManager = new LessonStatusManager();
  }

  /**
   * ステータスバナーを生成
   */
  generateHTML() {
    const today = this.lessonStatusManager.getTodayDate();
    const statusData = this.lessonStatusManager.getLessonStatus(today);
    
    console.log('StatusBanner: 今日のレッスン状況:', statusData);
    console.log('StatusBanner: 通常開催判定:', this.lessonStatusManager.isNormalStatus(statusData));
    
    if (!statusData || this.lessonStatusManager.isNormalStatus(statusData)) {
      console.log('StatusBanner: 通常開催のためバナーを表示しません');
      return ''; // 通常開催の場合は表示しない
    }

    return `
      <div class="status-banner" id="status-banner">
        <div class="container">
          <div class="status-content">
            <div class="status-icon">
              ${this.lessonStatusManager.getStatusIcon(statusData.globalStatus)}
            </div>
            <div class="status-info">
              <h3 class="status-title">${today} のレッスン状況</h3>
              ${statusData.globalMessage ? `<p class="global-message">${statusData.globalMessage}</p>` : ''}
              <div class="status-courses">
                ${this.generateCourseStatus(statusData.courses.basic)}
                ${this.generateCourseStatus(statusData.courses.advance)}
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
  generateCourseStatus(courseData) {
    if (courseData.status === 'scheduled' && !courseData.message) {
      return ''; // 通常開催でメッセージがない場合は表示しない
    }

    const statusText = this.lessonStatusManager.getStatusText(courseData.status);
    const statusColor = this.lessonStatusManager.getStatusColor(courseData.status);

    return `
      <div class="course-status">
        <div class="course-info">
          <span class="course-name">${courseData.name}</span>
          <span class="course-time">${courseData.time}</span>
          <span class="course-status-text" style="color: ${statusColor}">
            ${statusText}
          </span>
        </div>
        ${courseData.message ? `<div class="course-message">${courseData.message}</div>` : ''}
      </div>
    `;
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