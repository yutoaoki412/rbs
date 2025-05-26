// モバイルメニュー切り替え
function toggleMobileMenu() {
  const navLinks = document.querySelector('.nav-links');
  navLinks.classList.toggle('active');
}

// ページトップへスクロール
function scrollToTop(event) {
  event.preventDefault();
  
  // モバイルメニューを閉じる
  const navLinks = document.querySelector('.nav-links');
  if (navLinks.classList.contains('active')) {
    navLinks.classList.remove('active');
  }
  
  // ページトップへスムーススクロール
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// ナビゲーションリンク全体にクリックイベントを追加（外部リンク用）
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', function() {
    // 外部リンクの場合もメニューを閉じる
    const navLinks = document.querySelector('.nav-links');
    if (navLinks.classList.contains('active')) {
      navLinks.classList.remove('active');
    }
  });
});

// スムーススクロール
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    
    // モバイルメニューを閉じる
    const navLinks = document.querySelector('.nav-links');
    if (navLinks.classList.contains('active')) {
      navLinks.classList.remove('active');
    }
    
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      // ヘッダー高さ + スティッキーバナー高さ + 余白を計算
      const header = document.querySelector('header');
      const statusBanner = document.querySelector('.status-banner');
      const headerHeight = header ? header.offsetHeight : 90;
      const bannerHeight = statusBanner ? statusBanner.offsetHeight : 70;
      const totalOffset = headerHeight + bannerHeight + 20; // 20pxの余白を追加
      
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - totalOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  });
});

// 開催状況の開閉
function toggleStatus() {
  const statusBanner = document.querySelector('.status-banner');
  statusBanner.classList.toggle('active');
}

// FAQ開閉
function toggleFaq(element) {
  const faqItem = element.parentElement;
  const isActive = faqItem.classList.contains('active');
  
  // 全てのFAQを閉じる
  document.querySelectorAll('.faq-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // クリックされたFAQを開く
  if (!isActive) {
    faqItem.classList.add('active');
  }
}

// スクロールアニメーション
const observerOptions = {
  threshold: 0.15,
  rootMargin: '0px 0px -80px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-on-scroll');
      
      // 特別なアニメーションを追加
      if (entry.target.classList.contains('feature-number')) {
        entry.target.classList.add('animate-bounce');
      }
      
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// アニメーション対象要素を監視
document.querySelectorAll('.feature-card, .reason-item, .price-card, .faq-item, .news-item, .bottom-message, .feature-number').forEach(el => {
  observer.observe(el);
});

// ページロード時のヒーローアニメーションと位置調整
window.addEventListener('load', function() {
  const heroContent = document.querySelector('.hero-content');
  const heroVideo = document.querySelector('#hero-video');
  
  heroContent.style.opacity = '0';
  heroContent.style.transform = 'translateY(50px)';
  
  // 動画の読み込み完了後にアニメーション開始
  if (heroVideo) {
    // 動画が正常に読み込まれた場合
    heroVideo.addEventListener('loadeddata', function() {
      setTimeout(() => {
        heroContent.style.transition = 'opacity 1.2s ease-out, transform 1.2s ease-out';
        heroContent.style.opacity = '1';
        heroContent.style.transform = 'translateY(0)';
      }, 200);
    });
    
    // 動画読み込みを試行し、エラーの場合は即座にフォールバック
    heroVideo.load();
    
    // 動画エラー時のフォールバック
    heroVideo.addEventListener('error', function() {
      console.log('動画の読み込みでエラーが発生しました。グラデーション背景を使用します。');
      heroVideo.style.display = 'none';
      // グラデーション背景はすでにCSSで設定済み
      // 動画エラー時もアニメーションを開始
      setTimeout(() => {
        heroContent.style.transition = 'opacity 1.2s ease-out, transform 1.2s ease-out';
        heroContent.style.opacity = '1';
        heroContent.style.transform = 'translateY(0)';
      }, 200);
    });
    
    // 動画が1秒以内に読み込まれない場合はフォールバック
    setTimeout(() => {
      if (heroVideo.readyState === 0) {
        console.log('動画の読み込みがタイムアウトしました。');
        heroVideo.style.display = 'none';
        setTimeout(() => {
          heroContent.style.transition = 'opacity 1.2s ease-out, transform 1.2s ease-out';
          heroContent.style.opacity = '1';
          heroContent.style.transform = 'translateY(0)';
        }, 200);
      }
    }, 1000);
    
    // モバイルでのバッテリー節約のため、画面外では動画を停止
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          heroVideo.play();
        } else {
          heroVideo.pause();
        }
      });
    });
    videoObserver.observe(heroVideo);
    
    // ページ非表示時には動画を停止
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        heroVideo.pause();
      } else {
        if (heroVideo.closest('#hero').style.display !== 'none') { // ヒーローセクションが表示されている場合のみ再生
          heroVideo.play();
        }
      }
    });
  } else {
    setTimeout(() => {
      heroContent.style.transition = 'opacity 1.2s ease-out, transform 1.2s ease-out';
      heroContent.style.opacity = '1';
      heroContent.style.transform = 'translateY(0)';
    }, 200);
  }
  
  // 初期のスティッキーバナー位置設定
  const header = document.querySelector('header');
  const statusBanner = document.querySelector('.status-banner');
  if (statusBanner && header) {
    const headerHeight = header.offsetHeight;
    statusBanner.style.top = `${headerHeight + 8}px`; // 初期位置を調整 (8pxは仮の値)
  }
});

// ヘッダーの背景色変化とスティッキーバナー位置調整
window.addEventListener('scroll', function() {
  const header = document.querySelector('header');
  const statusBanner = document.querySelector('.status-banner');
  
  if (window.scrollY > 100) {
    header.style.background = 'rgba(255, 255, 255, 0.95)';
    header.style.backdropFilter = 'blur(10px)';
  } else {
    header.style.background = '#ffffff';
    header.style.backdropFilter = 'none';
  }
  
  // スティッキーバナーの位置をヘッダーの高さに合わせて動的調整
  if (statusBanner && header) {
    const headerHeight = header.offsetHeight; // 現在のヘッダー高さを取得
    statusBanner.style.top = `${headerHeight + 8}px`; // 8pxは仮のオフセット値
  }
});

// 動的な背景効果
function createFloatingShapes() {
  const shapes = ['🏃‍♂️', '⚡', '🎯', '🏆', '💪', '🌟'];
  const hero = document.querySelector('#hero');
  
  if (!hero) return; // hero要素がない場合は処理を中断

  setInterval(() => {
    if (Math.random() > 0.7) { // 30%の確率で実行
      const shape = document.createElement('div');
      shape.innerHTML = shapes[Math.floor(Math.random() * shapes.length)];
      shape.style.position = 'absolute';
      shape.style.fontSize = '24px';
      shape.style.opacity = '0.3';
      shape.style.left = Math.random() * 100 + '%';
      shape.style.top = Math.random() * 100 + '%';
      shape.style.pointerEvents = 'none';
      shape.style.zIndex = '0'; // ヒーローコンテンツの背後に表示
      shape.style.animation = 'fadeInOut 3s ease-out forwards';
      
      hero.appendChild(shape);
      
      setTimeout(() => {
        if (shape.parentNode) {
          shape.parentNode.removeChild(shape);
        }
      }, 3000);
    }
  }, 2000);
}

// フェードイン・アウトアニメーションのCSSルールを動的に追加
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateY(20px) scale(0.8); }
    20% { opacity: 0.3; transform: translateY(0) scale(1); }
    80% { opacity: 0.3; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-20px) scale(0.8); }
  }
`, styleSheet.cssRules.length);


// DOMContentLoaded後に関数を実行
document.addEventListener('DOMContentLoaded', () => {
  createFloatingShapes();

  // ページロード時のヒーローアニメーションと位置調整内のIntersectionObserverの重複を修正
  // IntersectionObserverはグローバルスコープで一度だけ初期化する
  const heroVideoElement = document.querySelector('#hero-video');
  if(heroVideoElement) {
    const videoObserverGlobal = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            heroVideoElement.play();
          } else {
            heroVideoElement.pause();
          }
        });
      });
      videoObserverGlobal.observe(heroVideoElement);
  }
}); 