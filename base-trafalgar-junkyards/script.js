const cards = [...document.querySelectorAll('.part-card')];
const search = document.querySelector('#part-search');
const filters = [...document.querySelectorAll('.filter')];
const empty = document.querySelector('#empty-results');
let activeFilter = 'all';

function updateParts() {
  const query = search.value.trim().toLowerCase();
  let shown = 0;
  cards.forEach(card => {
    const matchesFilter = activeFilter === 'all' || card.dataset.category === activeFilter;
    const matchesQuery = !query || `${card.dataset.search} ${card.querySelector('h3').textContent}`.toLowerCase().includes(query);
    card.hidden = !(matchesFilter && matchesQuery);
    if (!card.hidden) shown++;
  });
  empty.hidden = shown > 0;
}

filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(item => item.classList.toggle('active', item === button));
  activeFilter = button.dataset.filter;
  updateParts();
}));
search.addEventListener('input', updateParts);

const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  nav.classList.toggle('open', !isOpen);
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menuButton.setAttribute('aria-expanded', 'false');
  nav.classList.remove('open');
}));

document.querySelector('#year').textContent = new Date().getFullYear();
document.querySelector('#contact-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = new FormData(form);
  const address = 'ADD_YARD_EMAIL_HERE'; // Replace with the yard's real email before publishing.
  const note = document.querySelector('#form-note');
  if (address === 'ADD_YARD_EMAIL_HERE') {
    note.textContent = 'To enable enquiries, add the yard’s email address in script.js. The form is ready to use once that address is set.';
    note.classList.add('error');
    return;
  }
  const subject = encodeURIComponent(`Base Trafalgar enquiry: ${values.get('topic')}`);
  const body = encodeURIComponent([
    `Name: ${values.get('name')}`,
    `Reply to: ${values.get('reply')}`,
    `Enquiry: ${values.get('topic')}`,
    `Vehicle: ${values.get('vehicle') || 'Not provided'}`,
    '', values.get('message')
  ].join('\n'));
  window.location.href = `mailto:${address}?subject=${subject}&body=${body}`;
});

