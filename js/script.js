document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('.menu-toggle');
  const menuIcon = document.getElementById('menuIcon');
  const siteNav = document.querySelector('.site-nav');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');
  const projectLinks = document.querySelectorAll('.project-link');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');
  const contactForm = document.querySelector('#contactForm');
  const formStatus = document.querySelector('#formStatus');
  const typingElement = document.getElementById('typing-effect');

  function setStatus(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.style.color = type === 'success' ? '#4ade80' : '#f87171';
    el.style.marginTop = '8px';
    el.style.fontWeight = '500';
  }

  function toggleMenu() {
    if (!siteNav || !menuToggle || !menuIcon) return;

    const isOpen = siteNav.classList.toggle('nav-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));

    menuIcon.classList.toggle('fa-bars', !isOpen);
    menuIcon.classList.toggle('fa-times', isOpen);
  }

  menuToggle?.addEventListener('click', toggleMenu);

  window.addEventListener('click', (event) => {
    if (!event.target.closest('.site-header') && siteNav?.classList.contains('nav-open')) {
      siteNav.classList.remove('nav-open');
      menuToggle?.setAttribute('aria-expanded', 'false');
      menuIcon?.classList.remove('fa-times');
      menuIcon?.classList.add('fa-bars');
    }
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      siteNav?.classList.remove('nav-open');
      menuToggle?.setAttribute('aria-expanded', 'false');
      menuIcon?.classList.remove('fa-times');
      menuIcon?.classList.add('fa-bars');
    });
  });

  function highlightNav() {
    const scrollY = window.scrollY;

    sections.forEach((section) => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 120;
      const sectionId = section.getAttribute('id');

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        const activeLink = document.querySelector(`.site-nav a[data-section="${sectionId}"]`);
        if (activeLink) {
          navLinks.forEach(l => l.classList.remove('active'));
          activeLink.classList.add('active');
        }
      }
    });
  }

  window.addEventListener('scroll', highlightNav);
  highlightNav();

  if (typingElement) {
    const texts = [
      'web and mobile developer',
      'UI/UX designer',
      'digital strategist'
    ];

    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function typeWriter() {
      const currentText = texts[textIndex];

      if (isDeleting) {
        typingElement.textContent = currentText.substring(0, charIndex - 1);
        charIndex--;
      } else {
        typingElement.textContent = currentText.substring(0, charIndex + 1);
        charIndex++;
      }

      let typeSpeed = isDeleting ? 50 : 100;

      if (!isDeleting && charIndex === currentText.length) {
        typeSpeed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % texts.length;
        typeSpeed = 500;
      }

      setTimeout(typeWriter, typeSpeed);
    }

    typeWriter();
  }

  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate');
      }
    });
  }, observerOptions);

  document.querySelectorAll('.animate-on-scroll').forEach((element) => {
    observer.observe(element);
  });

  // FAQ Accordion Toggle Handler
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach((question) => {
    question.addEventListener('click', () => {
      const faqItem = question.parentElement;
      const isOpen = faqItem.classList.contains('active');

      document.querySelectorAll('.faq-item').forEach((item) => {
        item.classList.remove('active');
        item.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
        const icon = item.querySelector('.faq-icon');
        if (icon) {
          icon.classList.remove('fa-minus');
          icon.classList.add('fa-plus');
        }
      });

      if (!isOpen) {
        faqItem.classList.add('active');
        question.setAttribute('aria-expanded', 'true');
        const icon = question.querySelector('.faq-icon');
        if (icon) {
          icon.classList.remove('fa-plus');
          icon.classList.add('fa-minus');
        }
      }
    });
  });

  projectLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const card = link.closest('.project-card');
      if (!card) return;

      card.style.transform = 'scale(0.95)';
      setTimeout(() => {
        card.style.transform = '';
      }, 150);
    });
  });

  filterBtns.forEach((button) => {
    button.addEventListener('click', () => {
      filterBtns.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');

      const filterValue = button.getAttribute('data-filter');

      projectCards.forEach((card) => {
        const matches = filterValue === 'all' || card.getAttribute('data-category') === filterValue;
        card.classList.toggle('hide', !matches);
      });
    });
  });

  contactForm?.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const name = (formData.get('name') || '').toString().trim();
    const email = (formData.get('email') || '').toString().trim();
    const message = (formData.get('message') || '').toString().trim();

    if (!name || !email || !message) {
      setStatus(formStatus, 'Please fill in all fields before sending.', 'error');
      return;
    }

    const submitButton = contactForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending…';
    }

    setTimeout(() => {
      setStatus(formStatus, `Thanks ${name}! Your message has been sent successfully.`, 'success');
      contactForm.reset();

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Send Message';
      }
    }, 800);
  });
});
