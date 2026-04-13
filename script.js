const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');
const contactForm = document.querySelector('#contactForm');
const formStatus = document.querySelector('#formStatus');

menuToggle?.addEventListener('click', () => {
  siteNav.classList.toggle('nav-open');
});

window.addEventListener('click', (event) => {
  if (!event.target.closest('.site-header')) {
    siteNav.classList.remove('nav-open');
  }
});

contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  formStatus.textContent = 'Thanks for your message! I will get back to you soon.';
  contactForm.reset();
});

// Chat widget functionality
const chatButton = document.getElementById('chatButton');
const chatModal = document.getElementById('chatModal');
const closeChat = document.getElementById('closeChat');
const chatForm = document.getElementById('chatForm');

chatButton?.addEventListener('click', () => {
  chatModal.classList.toggle('show');
});

closeChat?.addEventListener('click', () => {
  chatModal.classList.remove('show');
});

window.addEventListener('click', (event) => {
  if (!chatModal.contains(event.target) && !chatButton.contains(event.target)) {
    chatModal.classList.remove('show');
  }
});

chatForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(chatForm);
  const name = formData.get('name');
  const email = formData.get('email');
  const message = formData.get('message');

  // For now, use mailto to send the message
  const subject = `Message from ${name} via Portfolio Chat`;
  const body = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
  const mailtoLink = `mailto:motombysamuel843@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  window.location.href = mailtoLink;

  // Reset form and close modal
  chatForm.reset();
  chatModal.classList.remove('show');
});

// Scroll animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate');
    }
  });
}, observerOptions);

document.querySelectorAll('.animate-on-scroll').forEach(el => {
  observer.observe(el);
});
