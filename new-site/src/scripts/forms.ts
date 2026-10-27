// Progressive enhancement for plain HTML forms marked [data-lead-form="<type>"].
import { submitLead } from '../lib/leads';

document.querySelectorAll<HTMLFormElement>('form[data-lead-form]').forEach((form) => {
  const status = form.querySelector<HTMLElement>('.form-status');
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      const firstInvalid = form.querySelector<HTMLElement>(':invalid');
      if (status) {
        status.textContent = firstInvalid?.getAttribute('data-error') ?? 'Please complete the highlighted fields.';
        status.dataset.state = 'error';
      }
      return;
    }
    const data: Record<string, string> = {};
    new FormData(form).forEach((v, k) => (data[k] = typeof v === 'string' ? v : ''));
    let original = '';
    if (button) {
      original = button.innerHTML; // keep icons and inner markup
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = 'Sending…';
    }
    const result = await submitLead(form.dataset.leadForm ?? 'contact', data);
    if (status) {
      status.textContent = result.message;
      status.dataset.state = result.ok ? 'ok' : 'error';
    }
    if (button) {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.innerHTML = original;
    }
    if (result.ok && result.via === 'endpoint') form.reset();
  });
});

// Pre-select "I'm interested in" from ?interest= (e.g. links from the hero).
const interest = new URLSearchParams(location.search).get('interest');
if (interest) {
  const select = document.querySelector<HTMLSelectElement>('select[name="interest"]');
  if (select && Array.from(select.options).some((o) => o.value === interest)) select.value = interest;
}
