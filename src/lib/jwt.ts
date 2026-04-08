interface JWTPayload {
  sub: string
  username: string
  exp: number
}

export function jwtDecode(token: string): JWTPayload {
  const base64 = token.split('.')[1]
  const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
  return JSON.parse(json) as JWTPayload
}
