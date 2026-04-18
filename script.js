// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// Change this to your deployed backend URL when you push to production
// e.g. 'https://sammy-portfolio-backend.up.railway.app'
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE_URL = 'https://sam-portfolio-production-451d.up.railway.app';

// ─── Mobile Navigation ────────────────────────────────────────────────────────
const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');

menuToggle?.addEventListener('click', () => {
  siteNav.classList.toggle('nav-open');
});

window.addEventListener('click', (event) => {
  if (!event.target.closest('.site-header')) {
    siteNav.classList.remove('nav-open');
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Submits a message to the backend API.
 * @param {{ name: string, email: string, message: string, source: string }} payload
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function submitMessage(payload) {
  const res = await fetch(`${API_BASE_URL}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    // Surface the first validation error or the general message
    const errMsg =
      data.errors?.[0]?.message || data.message || 'Something went wrong.';
    throw new Error(errMsg);
  }
  return data;
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

  const formData = new FormData(contactForm);
  const payload = {
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
    source: 'contact',
  };

  // Loading state
  contactSubmitBtn.disabled = true;
  contactSubmitBtn.textContent = 'Sending…';
  setStatus(formStatus, '', '');

  try {
    const result = await submitMessage(payload);
    setStatus(formStatus, result.message, 'success');
    contactForm.reset();
  } catch (err) {
    setStatus(formStatus, err.message, 'error');
  } finally {
    contactSubmitBtn.disabled = false;
    contactSubmitBtn.textContent = 'Send Message';
  }
});

// ─── Chat Widget ──────────────────────────────────────────────────────────────
const chatButton = document.getElementById('chatButton');
const chatModal = document.getElementById('chatModal');
const closeChat = document.getElementById('closeChat');
const chatForm = document.getElementById('chatForm');
const chatBody = document.querySelector('.chat-body');
const chatSubmitBtn = chatForm?.querySelector('button[type="submit"]');

chatButton?.addEventListener('click', () => {
  chatModal.classList.toggle('show');
});

closeChat?.addEventListener('click', () => {
  chatModal.classList.remove('show');
});

window.addEventListener('click', (event) => {
  if (
    chatModal &&
    !chatModal.contains(event.target) &&
    !chatButton.contains(event.target)
  ) {
    chatModal.classList.remove('show');
  }
});

chatForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(chatForm);
  const payload = {
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
    source: 'chat',
  };

  // Loading state
  chatSubmitBtn.disabled = true;
  chatSubmitBtn.textContent = 'Sending…';

  try {
    await submitMessage(payload);

    // Show success message in chat body
    chatBody.innerHTML = `
      <div style="text-align:center; padding: 16px 0;">
        <p style="font-size: 1.4rem; margin-bottom: 8px;">✅</p>
        <p style="font-weight: 600;">Message sent!</p>
        <p style="font-size: 0.875rem; opacity: 0.8;">Thanks, ${payload.name}! I'll reply to ${payload.email} soon.</p>
      </div>
    `;
    chatForm.style.display = 'none';
    chatForm.reset();

    // Auto-close after 3 seconds
    setTimeout(() => {
      chatModal.classList.remove('show');
      // Reset chat UI for next open
      setTimeout(() => {
        chatBody.innerHTML = '<p>Hi! How can I help you today?</p>';
        chatForm.style.display = '';
      }, 400);
    }, 3000);
  } catch (err) {
    // Show inline error in chat body
    const errEl = document.createElement('p');
    errEl.style.cssText = 'color:#f87171; font-size:0.875rem; margin-top:8px;';
    errEl.textContent = err.message;
    chatBody.appendChild(errEl);
    setTimeout(() => errEl.remove(), 4000);
  } finally {
    chatSubmitBtn.disabled = false;
    chatSubmitBtn.textContent = 'Send';
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
