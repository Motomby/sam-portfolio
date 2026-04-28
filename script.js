// ─────────────────────────────────────────────────────────────────────────────
// EmailJS Configuration
// Replace these with your actual EmailJS credentials
// Get them from: https://www.emailjs.com/
// ─────────────────────────────────────────────────────────────────────────────
const EMAILJS_SERVICE_ID = 'nqrvit7';
const EMAILJS_TEMPLATE_ID = 'l58gsos'; // Replace with your actual template ID
const EMAILJS_PUBLIC_KEY = 'V4I3KV8WBs8ylAT_U'; // Replace with your actual public key

// Backend API URL for database storage
const API_BASE_URL = 'http://localhost:5000'; // Change this in production

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
 * Sends a message using both EmailJS and backend API.
 * EmailJS: Sends email notification immediately
 * Backend: Saves message to MongoDB database
 * @param {{ name: string, email: string, message: string, source: string }} payload
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function submitMessage(payload) {
  const results = [];
  
  try {
    // 1. Send email via EmailJS (fire-and-forget)
    try {
      const emailResponse = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name: payload.name,
          from_email: payload.email,
          message: payload.message,
          to_name: 'Samuel Motomby',
          reply_to: payload.email
        }
      );
      
      if (emailResponse.status === 200) {
        results.push({ type: 'email', success: true });
      }
    } catch (emailError) {
      console.warn('EmailJS failed:', emailError);
      results.push({ type: 'email', success: false, error: emailError.message });
    }
    
    // 2. Save to database via backend API
    try {
      const dbResponse = await fetch(`${API_BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const dbData = await dbResponse.json();
      
      if (dbResponse.ok) {
        results.push({ type: 'database', success: true });
      } else {
        throw new Error(dbData.message || 'Database save failed');
      }
    } catch (dbError) {
      console.warn('Database save failed:', dbError);
      results.push({ type: 'database', success: false, error: dbError.message });
    }
    
    // 3. Determine overall success
    const emailSuccess = results.find(r => r.type === 'email')?.success || false;
    const dbSuccess = results.find(r => r.type === 'database')?.success || false;
    
    if (emailSuccess && dbSuccess) {
      return {
        success: true,
        message: "Message sent successfully! I'll get back to you soon."
      };
    } else if (emailSuccess) {
      return {
        success: true,
        message: "Email sent successfully! Message saved to database failed, but I'll still receive your message."
      };
    } else if (dbSuccess) {
      return {
        success: true,
        message: "Message saved successfully! Email notification failed, but I'll still see your message."
      };
    } else {
      const errors = results.map(r => r.error).filter(Boolean);
      throw new Error(`Failed to send message: ${errors.join(', ')}`);
    }
    
  } catch (error) {
    console.error('Submit message error:', error);
    throw new Error('Failed to send message. Please try again later.');
  }
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
    source: 'contact'
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

// ─── Enhanced Chat Widget ─────────────────────────────────────────────────────
const chatButton = document.getElementById('chatButton');
const chatModal = document.getElementById('chatModal');
const closeChat = document.getElementById('closeChat');
const chatForm = document.getElementById('chatForm');
const chatBody = document.getElementById('chatBody');
const chatName = document.getElementById('chatName');
const chatEmail = document.getElementById('chatEmail');
const chatMessage = document.getElementById('chatMessage');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typingIndicator');
const saveInfoCheckbox = document.getElementById('saveInfo');

// Load saved user info
function loadSavedUserInfo() {
  const savedName = localStorage.getItem('chatName');
  const savedEmail = localStorage.getItem('chatEmail');
  
  if (savedName && savedEmail) {
    chatName.value = savedName;
    chatEmail.value = savedEmail;
    saveInfoCheckbox.checked = true;
  }
}

// Save user info
function saveUserInfo() {
  if (saveInfoCheckbox.checked) {
    localStorage.setItem('chatName', chatName.value);
    localStorage.setItem('chatEmail', chatEmail.value);
  } else {
    localStorage.removeItem('chatName');
    localStorage.removeItem('chatEmail');
  }
}

// Add message to chat body
function addMessage(content, isUser = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${isUser ? 'user-message' : 'bot-message'}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
  
  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  messageContent.innerHTML = `<p>${content}</p>`;
  
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(messageContent);
  
  chatBody.appendChild(messageDiv);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
  typingIndicator.style.display = 'flex';
  chatBody.scrollTop = chatBody.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
  typingIndicator.style.display = 'none';
}

// Quick action buttons
const quickActions = document.querySelectorAll('.quick-action');
quickActions.forEach(button => {
  button.addEventListener('click', () => {
    const message = button.dataset.message;
    chatMessage.value = message;
    chatMessage.focus();
  });
});

// Chat controls
chatButton?.addEventListener('click', () => {
  chatModal.classList.add('show');
  loadSavedUserInfo();
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

// Auto-resize textarea
chatMessage?.addEventListener('input', () => {
  chatMessage.style.height = 'auto';
  chatMessage.style.height = Math.min(chatMessage.scrollHeight, 120) + 'px';
});

// Form submission
chatForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = chatName.value.trim();
  const email = chatEmail.value.trim();
  const message = chatMessage.value.trim();

  if (!name || !email || !message) {
    addMessage('Please fill in all required fields.', false);
    return;
  }

  // Add user message to chat
  addMessage(message, true);

  // Save user info if checkbox is checked
  saveUserInfo();

  // Clear form
  chatMessage.value = '';
  chatMessage.style.height = 'auto';

  // Disable send button
  sendButton.disabled = true;
  sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  // Show typing indicator
  showTypingIndicator();

  try {
    const payload = {
      name,
      email,
      message,
      source: 'chat',
    };

    await submitMessage(payload);

    // Hide typing indicator
    hideTypingIndicator();

    // Add success message
    addMessage(`Thank you for your message, ${name}! I've received it and will get back to you at ${email} as soon as possible. 🚀`, false);

    // Reset form after successful send
    setTimeout(() => {
      if (saveInfoCheckbox.checked) {
        chatMessage.value = '';
      } else {
        chatForm.reset();
      }
    }, 1000);

  } catch (err) {
    hideTypingIndicator();
    addMessage(`Sorry, there was an error sending your message: ${err.message}. Please try again.`, false);
  } finally {
    sendButton.disabled = false;
    sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
  }
});

// Character counter for message
chatMessage?.addEventListener('input', () => {
  const maxLength = 500;
  const currentLength = chatMessage.value.length;
  
  if (currentLength > maxLength) {
    chatMessage.value = chatMessage.value.substring(0, maxLength);
  }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadSavedUserInfo();
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
