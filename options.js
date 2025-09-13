document.addEventListener('DOMContentLoaded', function () {
  const saveBtn = document.getElementById('save');
  const status = document.getElementById('status');

  function refreshStatus() {
    chrome.storage.sync.get(["username", "password"], function (items) {
      if (items.username) {
        saveBtn.textContent = "Update";
        status.textContent = 'Credentials saved.';
      } else {
        saveBtn.textContent = "Save";
        status.textContent = 'Credentials not saved.';
      }
    });
  }

  function persistCredentials() {
    const userVal = document.getElementById('un').value;
    const passVal = document.getElementById('pd').value;

    saveBtn.disabled = true;
    chrome.storage.sync.set({ username: userVal, password: passVal }, function () {
      saveBtn.disabled = false;
      status.textContent = 'Saved ✓';
      document.getElementById('un').value = "";
      document.getElementById('pd').value = "";
      refreshStatus();
    });
  }

  document.querySelector('.login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    persistCredentials();
  });

  refreshStatus();
});
