/**
 * ステータスバナーコンポーネント
 * レッスン開催状況の表示と管理
 */
class StatusBanner {
  constructor() {
    this.statusBanner = null;
    this.statusConfig = {
      'scheduled': {
        text: '本日は開催予定です',
        icon: '✅',
        bgColor: '#27ae60',
        textColor: 'white',
        priority: 1
      },
      'modified': {
        text: '本日は一部変更して開催いたします',
        icon: '⚠️',
        bgColor: '#f39c12',
        textColor: 'white',
        priority: 2
      },
      'cancelled': {
        text: '本日は中止いたします',
        icon: '❌',
        bgColor: '#e74c3c',
        textColor: 'white',
        priority: 3
      }
    };
    this.init();
  }

  init() {
    this.createStatusBanner();
    this.bindEvents();
  }

  createStatusBanner() {
    // 既存のステータスバナーを取得
    this.statusBanner = document.querySelector('.status-banner');
    
    if (!this.statusBanner) {
      this.statusBanner = this.createElement();
    }
    
    this.positionBanner();
  }

  createElement() {
    const banner = document.createElement('div');
    banner.className = 'status-banner';
    banner.style.cssText = `
      position: fixed;
      top: 120px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999;
      max-width: 800px;
      width: 90%;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      display: none;
    `;
    
    document.body.appendChild(banner);
    return banner;
  }

  positionBanner() {
    if (!this.statusBanner) return;
    
    const header = document.querySelector('header');
    if (header) {
      const headerHeight = header.offsetHeight;
      this.statusBanner.style.top = `${headerHeight + 8}px`;
    }
  }

  bindEvents() {
    // ウィンドウリサイズ時の位置調整
    window.addEventListener('resize', () => this.positionBanner());
    
    // スクロール時の表示/非表示制御
    window.addEventListener('scroll', () => this.handleScroll());
  }

  handleScroll() {
    if (!this.statusBanner) return;
    
    const scrollY = window.scrollY;
    const bannerHeight = this.statusBanner.offsetHeight;
    
    // スクロール量に応じてバナーの透明度を調整
    if (scrollY > 100) {
      this.statusBanner.style.opacity = '0.9';
    } else {
      this.statusBanner.style.opacity = '1';
    }
  }

  updateStatus(statusData) {
    if (!this.statusBanner || !statusData) return;
    
    try {
      // 全体ステータスの更新
      this.updateOverallStatus(statusData.overall);
      
      // 個別レッスンステータスの更新
      this.updateLessonStatuses(statusData.lessons);
      
      // 最終更新時刻の表示
      this.updateLastUpdated(statusData.lastUpdated);
      
    } catch (error) {
      console.error('ステータス更新エラー:', error);
      this.showError('ステータスの更新に失敗しました');
    }
  }

  updateOverallStatus(overallStatus) {
    if (!overallStatus || overallStatus.status === 'scheduled') {
      this.hideBanner();
      return;
    }
    
    const config = this.statusConfig[overallStatus.status];
    if (!config) return;
    
    const fullText = config.text + (overallStatus.note ? ` (${overallStatus.note})` : '');
    
    this.statusBanner.style.background = config.bgColor;
    this.statusBanner.style.color = config.textColor;
    this.statusBanner.style.display = 'block';
    
    this.statusBanner.innerHTML = `
      <div class="status-content">
        <span class="status-icon">${config.icon}</span>
        <span class="status-text">${fullText}</span>
        <button class="status-close" onclick="this.parentElement.parentElement.style.display='none'">×</button>
      </div>
    `;
    
    // ボックスシャドウの調整
    const shadowColor = this.hexToRgba(config.bgColor, 0.3);
    this.statusBanner.style.boxShadow = `0 8px 25px ${shadowColor}`;
    
    this.showBanner();
  }

  updateLessonStatuses(lessons) {
    if (!lessons || !Array.isArray(lessons)) return;
    
    lessons.forEach((lesson, index) => {
      this.updateSingleLessonStatus(lesson, index);
    });
  }

  updateSingleLessonStatus(lesson, index) {
    const statusItems = document.querySelectorAll('.status-item');
    const targetItem = statusItems[index];
    
    if (!targetItem) return;
    
    const config = this.statusConfig[lesson.status] || this.statusConfig['scheduled'];
    const statusIndicator = targetItem.querySelector('.status-indicator');
    const statusText = targetItem.querySelector('.status-text');
    
    if (statusIndicator) {
      statusIndicator.style.background = config.bgColor;
      statusIndicator.textContent = config.icon;
    }
    
    if (statusText) {
      let displayText = config.text;
      if (lesson.note) {
        displayText += ` (${lesson.note})`;
      }
      statusText.textContent = displayText;
      statusText.style.color = lesson.status === 'cancelled' ? config.bgColor : 'inherit';
    }
  }

  updateLastUpdated(lastUpdated) {
    if (!lastUpdated) return;
    
    const lastUpdatedElement = document.querySelector('.last-updated');
    if (lastUpdatedElement) {
      const formattedTime = this.formatDateTime(lastUpdated);
      lastUpdatedElement.textContent = `最終更新: ${formattedTime}`;
    }
  }

  showBanner() {
    if (!this.statusBanner) return;
    
    this.statusBanner.style.display = 'block';
    this.statusBanner.style.opacity = '0';
    this.statusBanner.style.transform = 'translateX(-50%) translateY(-20px)';
    
    // アニメーション
    requestAnimationFrame(() => {
      this.statusBanner.style.opacity = '1';
      this.statusBanner.style.transform = 'translateX(-50%) translateY(0)';
    });
  }

  hideBanner() {
    if (!this.statusBanner) return;
    
    this.statusBanner.style.opacity = '0';
    this.statusBanner.style.transform = 'translateX(-50%) translateY(-20px)';
    
    setTimeout(() => {
      this.statusBanner.style.display = 'none';
    }, 300);
  }

  showError(message) {
    if (!this.statusBanner) return;
    
    this.statusBanner.style.background = '#e74c3c';
    this.statusBanner.style.color = 'white';
    this.statusBanner.style.display = 'block';
    
    this.statusBanner.innerHTML = `
      <div class="status-content">
        <span class="status-icon">⚠️</span>
        <span class="status-text">${message}</span>
        <button class="status-close" onclick="this.parentElement.parentElement.style.display='none'">×</button>
      </div>
    `;
    
    this.showBanner();
    
    // 5秒後に自動で非表示
    setTimeout(() => this.hideBanner(), 5000);
  }

  // ユーティリティメソッド
  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  formatDateTime(dateTime) {
    if (!dateTime) return '';
    
    const date = new Date(dateTime);
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
  }

  // 外部から呼び出し可能なメソッド
  setStatus(status, note = '') {
    this.updateOverallStatus({ status, note });
  }

  clearStatus() {
    this.hideBanner();
  }

  isVisible() {
    return this.statusBanner && this.statusBanner.style.display !== 'none';
  }
}

// エクスポート（モジュール使用時）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StatusBanner;
}