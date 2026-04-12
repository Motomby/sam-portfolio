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
