/**
 * Raka Kenatra Adyaksa - Main App Script
 * Manages photo uploading, LocalStorage persistence, contact messaging, and UI interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Dino Game
  const game = new RakaDinoGame('gameCanvas');
  window.dinoGame = game;

  // 2. Photo Management (Profile & Game synchronization)
  const defaultPhotoPath = 'assets/images/profile.jpg';
  const photoInput = document.getElementById('photoInput');
  const resetPhotoBtn = document.getElementById('resetPhotoBtn');
  const avatarImages = document.querySelectorAll('.avatar-img, .interactive-avatar-preview');

  // Load custom photo if previously saved
  const savedPhoto = localStorage.getItem('raka_custom_photo');
  if (savedPhoto) {
    applyProfilePhoto(savedPhoto, false);
  }

  function applyProfilePhoto(src, showToast = true) {
    avatarImages.forEach(img => {
      img.src = src;
    });

    if (window.dinoGame) {
      window.dinoGame.updateAvatar(src);
    }

    if (showToast) {
      showToastNotice('✅ Foto profil & karakter game berhasil diperbarui!');
    }
  }

  if (photoInput) {
    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Mohon pilih file gambar yang valid (JPG, PNG, WebP).');
        return;
      }

      // Max 5MB check
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran gambar maksimal 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target.result;
        try {
          localStorage.setItem('raka_custom_photo', base64Data);
        } catch (err) {
          console.warn('LocalStorage quota reached, picture active in session only.');
        }
        applyProfilePhoto(base64Data, true);
      };
      reader.readAsDataURL(file);
    });
  }

  if (resetPhotoBtn) {
    resetPhotoBtn.addEventListener('click', () => {
      localStorage.removeItem('raka_custom_photo');
      applyProfilePhoto(defaultPhotoPath, false);
      showToastNotice('🔄 Foto telah direset ke foto asli!');
    });
  }

  // 3. Contact Form Submission (Direct Message Redirect & Auto-Copy to Clipboard)
  const contactForm = document.getElementById('contactForm');
  const btnSendTiktok = document.getElementById('btnSendTiktok');
  const messageModalBackdrop = document.getElementById('messageModalBackdrop');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalCopiedPreview = document.getElementById('modalCopiedPreview');

  function buildFormattedMessage() {
    const nameInput = document.getElementById('senderName');
    const subjectInput = document.getElementById('messageSubject');
    const messageInput = document.getElementById('messageBody');

    const name = nameInput ? nameInput.value.trim() : '';
    const subject = subjectInput ? subjectInput.value.trim() : '';
    const msg = messageInput ? messageInput.value.trim() : '';

    if (!name || !subject || !msg) {
      alert('Mohon isi Nama, Topik, dan Pesan terlebih dahulu sebelum mengirim.');
      return null;
    }

    return `Halo Raka Kenatra! 👋\n` +
           `Nama: ${name}\n` +
           `Topik: ${subject}\n\n` +
           `Pesan:\n${msg}`;
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        // Fallback below
      }
    }
    // Fallback using invisible textarea
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (e) {
      document.body.removeChild(textArea);
      return false;
    }
  }

  function handleDirectMessageRedirect(platform) {
    const formattedMessage = buildFormattedMessage();
    if (!formattedMessage) return;

    // 1. Copy text to user clipboard
    copyTextToClipboard(formattedMessage);

    // 2. Open Direct Message target
    const instagramDmUrl = 'https://ig.me/m/raka.kenatra';
    const tiktokUrl = 'https://www.tiktok.com/@ssssshhheeessshhh';
    const targetUrl = platform === 'tiktok' ? tiktokUrl : instagramDmUrl;

    window.open(targetUrl, '_blank');

    // 3. Display confirmation modal with copied text preview
    if (modalCopiedPreview) {
      modalCopiedPreview.textContent = formattedMessage;
    }
    if (messageModalBackdrop) {
      messageModalBackdrop.classList.add('show');
    }

    showToastNotice(
      platform === 'tiktok'
        ? '📋 Pesan disalin! Tab TikTok @ssssshhheeessshhh telah dibuka. Tinggal Paste (Tempel) & kirim!'
        : '📋 Pesan disalin! Tab DM Instagram @raka.kenatra telah dibuka. Tinggal Paste (Tempel) & kirim!'
    );

    if (contactForm) {
      contactForm.reset();
    }
  }

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleDirectMessageRedirect('instagram');
    });
  }

  if (btnSendTiktok) {
    btnSendTiktok.addEventListener('click', (e) => {
      e.preventDefault();
      handleDirectMessageRedirect('tiktok');
    });
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      if (messageModalBackdrop) messageModalBackdrop.classList.remove('show');
    });
  }

  if (messageModalBackdrop) {
    messageModalBackdrop.addEventListener('click', (e) => {
      if (e.target === messageModalBackdrop) {
        messageModalBackdrop.classList.remove('show');
      }
    });
  }

  // 4. Toast Notification Helper
  function showToastNotice(message) {
    let toast = document.getElementById('toastNotice');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toastNotice';
      toast.className = 'toast-notice';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>${message}</span>`;
    toast.classList.add('show');

    clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }

  window.showToastNotice = showToastNotice;

  // 5. Header Scroll Effect & Navigation Highlighting
  const header = document.querySelector('.header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // ScrollSpy active link
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 120;

    sections.forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      const id = sec.getAttribute('id');
      const link = document.querySelector(`.nav-link[href="#${id}"]`);

      if (scrollPos >= top && scrollPos < top + height) {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        if (link) link.classList.add('active');
      }
    });
  });

  // 6. Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const navMenu = document.getElementById('navMenu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      const isOpen = navMenu.classList.contains('active');
      mobileToggle.innerHTML = isOpen ? '✕' : '☰';
    });

    // Close menu when clicking link
    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        if (mobileToggle) mobileToggle.innerHTML = '☰';
      });
    });
  }

  // 7. Theme Switcher (Layar Terang / Layar Gelap)
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const mobileThemeToggleBtn = document.getElementById('mobileThemeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const themeLabel = document.getElementById('themeLabel');

  // Check saved preference or default to dark server theme
  const savedTheme = localStorage.getItem('raka_theme') || 'dark';
  applyTheme(savedTheme, false);

  function applyTheme(theme, showToast = true) {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
      if (themeIcon) themeIcon.textContent = '🌙';
      if (themeLabel) themeLabel.textContent = 'Layar Gelap';
      if (mobileThemeToggleBtn) {
        mobileThemeToggleBtn.innerHTML = '<span class="theme-icon">🌙</span> <span class="theme-label">Ganti ke Layar Gelap</span>';
      }
    } else {
      document.body.classList.remove('light-mode');
      if (themeIcon) themeIcon.textContent = '☀️';
      if (themeLabel) themeLabel.textContent = 'Layar Terang';
      if (mobileThemeToggleBtn) {
        mobileThemeToggleBtn.innerHTML = '<span class="theme-icon">☀️</span> <span class="theme-label">Ganti ke Layar Terang</span>';
      }
    }

    if (window.dinoGame && typeof window.dinoGame.setTheme === 'function') {
      window.dinoGame.setTheme(theme);
    }

    localStorage.setItem('raka_theme', theme);

    if (showToast) {
      showToastNotice(
        theme === 'light'
          ? '☀️ Mode Layar Terang Aktif (Nuansa Bersih Putih-Biru)!'
          : '🌙 Mode Layar Gelap Aktif (Nuansa Ruang Server & Cyber)!'
      );
    }
  }

  function toggleTheme() {
    const isLight = document.body.classList.contains('light-mode');
    const newTheme = isLight ? 'dark' : 'light';
    applyTheme(newTheme, true);
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }
  if (mobileThemeToggleBtn) {
    mobileThemeToggleBtn.addEventListener('click', toggleTheme);
  }

  // 8. Certificates Showcase & Interactive Modal (Mode Lihat Saja / View-Only)
  const certificatesData = [
    {
      title: "DIGION 2026 – Data Analytics",
      badge: "Dokumen Resmi",
      year: "📅 2026",
      recipient: "Penerima: Raka Kenatra Adyaksa Putra Kholis",
      desc: "Sertifikat partisipasi dalam kompetisi DIGION 2026. Melalui kegiatan ini, saya mendapatkan pengalaman dalam bidang Data Analytics serta kesempatan untuk menunjukkan kemampuan dalam mengolah dan menganalisis data.",
      img: "assets/images/cert_1_official.png"
    },
    {
      title: "Mini Hackathon – AI Digital Innovation",
      badge: "Dokumen Resmi",
      year: "📅 48 Jam Hackathon",
      recipient: "Penerima: Raka Kenantra Adyaksya Putra",
      desc: "Sertifikat partisipasi dalam Mini Hackathon untuk mengubah ide menjadi karya digital menggunakan Artificial Intelligence (AI) dalam waktu 48 jam. Kegiatan ini memberikan pengalaman dalam mengeksplorasi ide, memanfaatkan teknologi AI, dan mengenal proses pengembangan solusi digital.",
      img: "assets/images/cert_2_official.png"
    },
    {
      title: "Knowledge & Innovation Day – Career Ready 2030",
      badge: "Dokumen Resmi",
      year: "📅 Webinar Nasional",
      recipient: "Penerima: Raka Kenatra Adyaksya P. K",
      desc: "Sertifikat partisipasi dalam webinar Knowledge & Innovation Day: Career Ready 2030. Kegiatan ini menjadi kesempatan untuk menambah wawasan mengenai inovasi, perkembangan dunia kerja, serta kesiapan menghadapi kebutuhan karier di masa depan.",
      img: "assets/images/cert_3_official.png"
    },
    {
      title: "Practical Bug Bounty: Dari Desa to NASA",
      badge: "Dokumen Resmi",
      year: "📅 Cybersecurity",
      recipient: "Penerima: Raka Kenatra Adyaksya P. K",
      desc: "Sertifikat partisipasi dalam webinar cybersecurity yang membahas Practical Bug Bounty: Dari Desa to NASA. Kegiatan ini memberikan wawasan mengenai keamanan siber, bug bounty, serta pentingnya mendeteksi potensi kebocoran data sejak dini.",
      img: "assets/images/cert_4_official.png"
    }
  ];

  const certModalBackdrop = document.getElementById('certModalBackdrop');
  const certModalBadge = document.getElementById('certModalBadge');
  const certModalTitle = document.getElementById('certModalTitle');
  const certModalImg = document.getElementById('certModalImg');
  const certModalYear = document.getElementById('certModalYear');
  const certModalRecipient = document.getElementById('certModalRecipient');
  const certModalDesc = document.getElementById('certModalDesc');
  const certModalCloseBtn = document.getElementById('certModalCloseBtn');
  const certModalCloseFooterBtn = document.getElementById('certModalCloseFooterBtn');

  function openCertModal(index) {
    const cert = certificatesData[index];
    if (!cert || !certModalBackdrop) return;

    if (certModalBadge) certModalBadge.textContent = cert.badge;
    if (certModalTitle) certModalTitle.textContent = cert.title;
    if (certModalImg) {
      certModalImg.src = cert.img;
      certModalImg.alt = cert.title;
    }
    if (certModalYear) certModalYear.textContent = cert.year;
    if (certModalRecipient) certModalRecipient.textContent = cert.recipient;
    if (certModalDesc) certModalDesc.textContent = cert.desc;

    certModalBackdrop.classList.add('show');
    certModalBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeCertModal() {
    if (!certModalBackdrop) return;
    certModalBackdrop.classList.remove('show');
    certModalBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Trigger modal from buttons
  document.querySelectorAll('.btn-cert-zoom, .btn-cert-preview').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      openCertModal(idx);
    });
  });

  // Clicking anywhere on the cert image container opens the modal
  document.querySelectorAll('.cert-image-container').forEach((container, idx) => {
    container.addEventListener('click', () => {
      openCertModal(idx);
    });
  });

  if (certModalCloseBtn) {
    certModalCloseBtn.addEventListener('click', closeCertModal);
  }
  if (certModalCloseFooterBtn) {
    certModalCloseFooterBtn.addEventListener('click', closeCertModal);
  }
  if (certModalBackdrop) {
    certModalBackdrop.addEventListener('click', (e) => {
      if (e.target === certModalBackdrop) {
        closeCertModal();
      }
    });
  }

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCertModal();
      if (messageModalBackdrop) {
        messageModalBackdrop.classList.remove('show');
      }
    }
  });
});
