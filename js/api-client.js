(() => {
  const defaultBaseUrl = 'http://localhost:3000';
  const configuredBaseUrl = window.SKILLBRIDGE_API_BASE_URL
    || localStorage.getItem('skillbridge_api_base_url')
    || defaultBaseUrl;
  const baseUrl = configuredBaseUrl.replace(/\/+$/, '');

  const readSession = () => {
    for (const storage of [sessionStorage, localStorage]) {
      try {
        const session = JSON.parse(storage.getItem('skillbridge_session') || 'null');
        if (session?.token) return session;
      } catch {
        storage.removeItem('skillbridge_session');
      }
    }
    return null;
  };

  const setSession = (user, token, remember = false) => {
    const storage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;
    otherStorage.removeItem('skillbridge_session');
    storage.setItem('skillbridge_session', JSON.stringify({ user, token }));
    if (user?.fullName) {
      localStorage.setItem('skillbridge_user', JSON.stringify({
        name: user.fullName,
        email: user.email,
        id: user.id,
      }));
    }
  };

  const clearSession = () => {
    localStorage.removeItem('skillbridge_session');
    sessionStorage.removeItem('skillbridge_session');
  };

  const request = async (path, options = {}) => {
    const { auth = true, body, headers = {}, ...requestOptions } = options;
    const requestHeaders = new Headers(headers);
    const token = auth ? readSession()?.token : null;
    if (token) requestHeaders.set('Authorization', `Bearer ${token}`);

    let requestBody = body;
    if (body !== undefined && !(body instanceof FormData)) {
      requestHeaders.set('Content-Type', 'application/json');
      requestBody = JSON.stringify(body);
    }

    let response;
    let responseText;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...requestOptions,
        headers: requestHeaders,
        body: requestBody,
        signal: controller.signal,
      });
      responseText = await response.text();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`The SkillBridge API request timed out at ${baseUrl}. Check that the backend is running.`);
      }
      throw new Error(`Could not reach SkillBridge API at ${baseUrl}. Check that the backend is running and allows this site through CORS.`);
    } finally {
      clearTimeout(timeout);
    }

    let payload = null;
    if (responseText) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        payload = { message: responseText };
      }
    }
    if (!response.ok) {
      const message = payload?.message
        || payload?.error
        || `The API request failed with status ${response.status}.`;
      if (response.status === 401 && auth) clearSession();
      throw new Error(message);
    }
    return payload;
  };

  const showStatus = (anchor, message, isError = false) => {
    const target = typeof anchor === 'string' ? document.getElementById(anchor) : anchor;
    if (!target) return;
    let status = target.parentElement?.querySelector('[data-api-status]');
    if (!status) {
      status = document.createElement('p');
      status.dataset.apiStatus = '';
      status.className = 'mt-3 text-sm';
      status.setAttribute('role', isError ? 'alert' : 'status');
      target.insertAdjacentElement('afterend', status);
    }
    status.classList.toggle('text-red-700', isError);
    status.classList.toggle('text-[#625B6D]', !isError);
    status.setAttribute('role', isError ? 'alert' : 'status');
    status.textContent = message;
  };

  window.SkillBridgeApi = {
    baseUrl,
    request,
    get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
    post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
    put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body }),
    patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body }),
    delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),
    session: readSession,
    setSession,
    clearSession,
    showStatus,
    unwrap: (response) => response?.data ?? response,
  };
})();
