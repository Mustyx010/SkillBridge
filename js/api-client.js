(() => {
  const baseUrl = (window.SKILLBRIDGE_API_BASE_URL || 'https://skillbridge-api.tb-skillbridge-backend.workers.dev').replace(/\/+$/, '');
  const apiLabel = baseUrl;

  const readSession = () => {
    for (const storage of [sessionStorage, localStorage]) {
      try {
        const session = JSON.parse(storage.getItem('skillbridge_session') || 'null');
        if (session?.token || session?.offline) return session;
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

  const setOfflineSession = (user, remember = false) => {
    const storage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;
    otherStorage.removeItem('skillbridge_session');
    storage.setItem('skillbridge_session', JSON.stringify({ user, offline: true }));
    if (user?.fullName || user?.name) {
      localStorage.setItem('skillbridge_user', JSON.stringify({
        name: user.fullName || user.name,
        email: user.email,
        id: user.id,
      }));
    }
  };

  const makeUnavailableError = (message) => {
    const error = new Error(message);
    error.code = 'API_UNAVAILABLE';
    return error;
  };

  const clearSession = () => {
    localStorage.removeItem('skillbridge_session');
    sessionStorage.removeItem('skillbridge_session');
  };

  const request = async (path, options = {}) => {
    const { auth = true, body, headers = {}, ...requestOptions } = options;
    const requestHeaders = new Headers(headers);
    const session = readSession();
    if (session?.offline) {
      throw makeUnavailableError('You are browsing in local preview mode. This action is not synced to the API.');
    }
    const token = auth ? session?.token : null;
    if (token) requestHeaders.set('Authorization', `Bearer ${token}`);

    let requestBody = body;
    if (body !== undefined && !(body instanceof FormData)) {
      requestHeaders.set('Content-Type', 'application/json');
      requestBody = JSON.stringify(body);
    }

    let response;
    let responseText;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55_000);
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
        throw makeUnavailableError(`The SkillBridge API request timed out at ${apiLabel}.`);
      }
      throw makeUnavailableError(`Could not reach SkillBridge API at ${apiLabel}. Check that the backend is available and allows this site's origin through CORS.`);
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
      const error = new Error(message);
      if ([502, 503, 504].includes(response.status)) error.code = 'API_UNAVAILABLE';
      throw error;
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
    setOfflineSession,
    isUnavailable: (error) => error?.code === 'API_UNAVAILABLE',
    clearSession,
    showStatus,
    unwrap: (response) => response?.data ?? response,
  };
})();
