const form = document.querySelector('#digest-form');
const state = document.querySelector('#form-state');
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button');
  const input = form.querySelector('input');
  button.disabled = true;
  button.innerHTML = '<span class="spinner"></span> Building…';
  state.className = 'state loading';
  state.textContent = 'Reading the thread and organizing the discussion. This can take up to a minute.';
  try {
    const response = await fetch('/api/digest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: input.value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to build this digest.');
    location.assign(`/hn/${data.thread_id}${data.cached ? '?cached=1' : ''}`);
  } catch (error) {
    state.className = 'state error';
    state.textContent = error.message || 'Something went wrong. Please try again.';
    button.disabled = false;
    button.innerHTML = 'Build digest <span>↗</span>';
  }
});
