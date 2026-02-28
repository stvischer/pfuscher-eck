const ACCESS_KEY  = 'accessToken'
const REFRESH_KEY = 'refreshToken'
const REMEMBER_KEY = 'rememberMe'

function store(remember) {
  return remember ? localStorage : sessionStorage
}

function other(remember) {
  return remember ? sessionStorage : localStorage
}

export const tokenStorage = {
  getAccess() {
    return localStorage.getItem(ACCESS_KEY) ?? sessionStorage.getItem(ACCESS_KEY) ?? null
  },
  getRefresh() {
    return localStorage.getItem(REFRESH_KEY) ?? sessionStorage.getItem(REFRESH_KEY) ?? null
  },
  isRemembered() {
    return localStorage.getItem(REMEMBER_KEY) === '1'
  },
  save(accessToken, refreshToken, remember) {
    store(remember).setItem(ACCESS_KEY,  accessToken)
    store(remember).setItem(REFRESH_KEY, refreshToken)
    other(remember).removeItem(ACCESS_KEY)
    other(remember).removeItem(REFRESH_KEY)
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
  },
  updateAccess(accessToken) {
    const remember = this.isRemembered()
    store(remember).setItem(ACCESS_KEY, accessToken)
  },
  updateBoth(accessToken, refreshToken) {
    const remember = this.isRemembered()
    store(remember).setItem(ACCESS_KEY,  accessToken)
    store(remember).setItem(REFRESH_KEY, refreshToken)
  },
  clear() {
    ;[localStorage, sessionStorage].forEach((s) => {
      s.removeItem(ACCESS_KEY)
      s.removeItem(REFRESH_KEY)
    })
    localStorage.removeItem(REMEMBER_KEY)
  },
}
