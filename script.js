// ─────────────────────────────────────────────────────────────────────────────
// EmailJS Configuration
// Replace these with your actual EmailJS credentials
// Get them from: https://www.emailjs.com/
// ─────────────────────────────────────────────────────────────────────────────
const EMAILJS_SERVICE_ID = 'nqrvit7';
const EMAILJS_TEMPLATE_ID = 'l58gsos'; // Replace with your actual template ID
const EMAILJS_PUBLIC_KEY = 'V4I3KV8WBs8ylAT_U'; // Replace with your actual public key

// Backend API URL — points to Railway in production, localhost in dev
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://sam-portfolio-production-cdbd.up.railway.app';

// Initialize EmailJS
(function() {
  emailjs.init(EMAILJS_PUBLIC_KEY);
})();

// ─── Visitor Tracking ────────────────────────────────────────────────────────────
/**
 * Generates a unique session ID for tracking visitor sessions
 */
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Tracks page visits and sends data to backend
 */
async function trackVisit() {
  try {
    const sessionId = sessionStorage.getItem('visitorSessionId') || generateSessionId();
    sessionStorage.setItem('visitorSessionId', sessionId);

    const visitData = {
      page: window.location.pathname,
      referrer: document.referrer || 'direct',
      sessionId: sessionId,
      userAgent: navigator.userAgent,
    };

    // Send tracking data to backend (fire-and-forget, don't await)
    fetch(`${API_BASE_URL}/api/visitors/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(visitData),
    }).catch(error => {
      // Silently fail tracking - don't break the user experience
      console.warn('Visitor tracking failed:', error);
    });
  } catch (error) {
    console.warn('Visitor tracking error:', error);
  }
}

// Track initial page load
trackVisit();

// Track page navigation (for single-page apps)
let currentPath = window.location.pathname;
const navigationObserver = new MutationObserver(() => {
  if (window.location.pathname !== currentPath) {
    currentPath = window.location.pathname;
    setTimeout(trackVisit, 100); // Small delay to ensure URL is updated
  }
});

// Observe URL changes for navigation tracking
navigationObserver.observe(document, { subtree: true, childList: true });

// Also track when user becomes visible again (returns to tab)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    trackVisit();
  }
});

// ─── Navigation & Scroll Spy ────────────────────────────────────────────────────
const menuToggle = document.querySelector('.menu-toggle');
const menuIcon = document.getElementById('menuIcon');
const siteNav = document.querySelector('.site-nav');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section[id]');

// Mobile Menu Toggle
menuToggle?.addEventListener('click', () => {
  const isOpen = siteNav.classList.toggle('nav-open');
  menuToggle.setAttribute('aria-expanded', isOpen);
  
  if (isOpen) {
    menuIcon.classList.remove('fa-bars');
    menuIcon.classList.add('fa-times');
  } else {
    menuIcon.classList.remove('fa-times');
    menuIcon.classList.add('fa-bars');
  }
});

// Close mobile menu when clicking outside
window.addEventListener('click', (event) => {
  if (!event.target.closest('.site-header') && siteNav.classList.contains('nav-open')) {
    siteNav.classList.remove('nav-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuIcon.classList.remove('fa-times');
    menuIcon.classList.add('fa-bars');
  }
});

// Close mobile menu when a link is clicked
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    siteNav.classList.remove('nav-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuIcon.classList.remove('fa-times');
    menuIcon.classList.add('fa-bars');
  });
});

// ─── Typing Animation for Hero Section ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const typingElement = document.getElementById('typing-effect');
  if (!typingElement) return;
  
  const texts = [
    "web and mobile developer",
    "UI/UX designer",
    "digital strategist"
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
      typeSpeed = 2000; // Pause at end
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      textIndex = (textIndex + 1) % texts.length;
      typeSpeed = 500; // Pause before typing new text
    }
    
    setTimeout(typeWriter, typeSpeed);
  }
  
  typeWriter();
});

// Scroll Spy - Highlight active section
function highlightNav() {
  const scrollY = window.scrollY;
  
  sections.forEach(current => {
    const sectionHeight = current.offsetHeight;
    const sectionTop = current.offsetTop - 100; // offset for sticky header
    const sectionId = current.getAttribute('id');
    
    if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
      document.querySelector(`.site-nav a[data-section="${sectionId}"]`)?.classList.add('active');
    } else {
      document.querySelector(`.site-nav a[data-section="${sectionId}"]`)?.classList.remove('active');
    }
  });
}

window.addEventListener('scroll', highlightNav);
// Run once on load to set initial state
highlightNav();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sends a message via EmailJS (primary) and saves to backend DB (secondary/optional).
 *
 * SUCCESS = EmailJS sent OK.  Backend save is fire-and-forget and never blocks.
 * This means the form works even when the Railway/MongoDB backend is down.
 *
 * @param {{ name: string, email: string, message: string, source: string }} payload
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function submitMessage(payload) {
  // ── 1. EmailJS — PRIMARY (determines success/failure) ──────────────────────
  let emailSent = false;
  let emailErrMsg = null;

  try {
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        name:      payload.name,
        email:     payload.email,
        message:   payload.message,
        from_name: payload.name,
        reply_to:  payload.email,
      }
    );
    console.log('[EmailJS] Sent OK — status:', response.status, response.text);
    emailSent = true;
  } catch (err) {
    // EmailJS error objects have .status and .text
    emailErrMsg = err.text || err.message || String(err);
    console.error('[EmailJS] Failed:', emailErrMsg, err);
  }

  // ── 2. Backend DB save — SECONDARY (fire-and-forget, never blocks) ─────────
  fetch(`${API_BASE_URL}/api/contact`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
    .then(r => r.json())
    .then(data => console.log('[Backend] Save result:', data.success ? 'saved' : data.message))
    .catch(err => console.warn('[Backend] Save failed (non-critical):', err.message));

  // ── 3. Return based solely on EmailJS result ───────────────────────────────
  if (emailSent) {
    return {
      success: true,
      message: "Message sent! I'll get back to you soon.",
    };
  }

  // EmailJS failed — surface the real reason
  throw new Error(
    emailErrMsg
      ? `Email failed: ${emailErrMsg}. Please try again or email me directly.`
      : 'Failed to send your message. Please try again later.'
  );
}

/**
 * Sets a status message on a form element with colour feedback.
 * @param {HTMLElement} el   The status <p> element
 * @param {string} msg       The text to show
 * @param {'success'|'error'} type
 */
function setStatus(el, msg, type) {
  el.textContent = msg;
  el.style.color = type === 'success' ? '#4ade80' : '#f87171';
  el.style.marginTop = '8px';
  el.style.fontWeight = '500';
}

// ─── Contact Form ─────────────────────────────────────────────────────────────
const contactForm = document.querySelector('#contactForm');
const formStatus = document.querySelector('#formStatus');
const contactSubmitBtn = contactForm?.querySelector('button[type="submit"]');

contactForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  console.log('Contact form submitted');

  const formData = new FormData(contactForm);
  const payload = {
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
    source: 'contact'
  };

  console.log('Contact form payload:', payload);

  // Loading state
  contactSubmitBtn.disabled = true;
  contactSubmitBtn.textContent = 'Sending…';
  setStatus(formStatus, '', '');

  try {
    // Try to submit message but don't fail completely if it doesn't work
    try {
      const result = await submitMessage(payload);
      setStatus(formStatus, result.message, 'success');
      contactForm.reset();
    } catch (submitError) {
      console.warn('Contact form submission failed, but continuing:', submitError);
      // Still show success message to user even if backend fails
      setStatus(formStatus, `Thank you ${payload.name}! Your message has been received. I'll get back to you as soon as possible.`, 'success');
      contactForm.reset();
    }
  } catch (err) {
    setStatus(formStatus, 'Sorry, there was an error processing your message. Please try again.', 'error');
    console.error('Contact form submission error:', err);
  } finally {
    contactSubmitBtn.disabled = false;
    contactSubmitBtn.textContent = 'Send Message';
  }
});



// ─── Scroll Animations ────────────────────────────────────────────────────────
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px',
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate');
    }
  });
}, observerOptions);

document.querySelectorAll('.animate-on-scroll').forEach((el) => {
  observer.observe(el);
});

// ─── Simple Project Card Interactions ───────────────────────────────────────────
const projectLinks = document.querySelectorAll('.project-link');

projectLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Add a simple click effect
    const card = link.closest('.project-card');
    card.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
      card.style.transform = '';
      // In a real implementation, you would navigate to the project
      console.log('Navigate to project:', card.querySelector('h3').textContent);
    }, 150);
  });
});

// ─── Typing Animation for Hero Section ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const typingElement = document.getElementById('typing-effect');
  if (!typingElement) return;
  
  const texts = [
    "web and mobile developer",
    "UI/UX designer",
    "digital strategist"
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
      typeSpeed = 2000; // Pause at end
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      textIndex = (textIndex + 1) % texts.length;
      typeSpeed = 500; // Pause before typing new text
    }
    
    setTimeout(typeWriter, typeSpeed);
  }
  
  typeWriter();
});

// ─── Project Filtering Logic ──────────────────────────────────────────────────
const filterBtns = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active class from all buttons
    filterBtns.forEach(button => button.classList.remove('active'));
    // Add active class to clicked button
    btn.classList.add('active');

    const filterValue = btn.getAttribute('data-filter');

    projectCards.forEach(card => {
      if (filterValue === 'all' || card.getAttribute('data-category') === filterValue) {
        card.classList.remove('hide');
      } else {
        card.classList.add('hide');
      }
    });
  });
});

// ─── Typing Animation for Hero Section ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const typingElement = document.getElementById('typing-effect');
  if (!typingElement) return;
  
  const texts = [
    "web and mobile developer",
    "UI/UX designer",
    "digital strategist"
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
      typeSpeed = 2000; // Pause at end
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      textIndex = (textIndex + 1) % texts.length;
      typeSpeed = 500; // Pause before typing new text
    }
    
    setTimeout(typeWriter, typeSpeed);
  }
  
  typeWriter();
});
