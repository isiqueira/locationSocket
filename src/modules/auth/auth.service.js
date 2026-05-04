// TODO (#15): validate credentials against database
export function validateCredentials(username, password) {
  return username === 'admin' && password === 'password';
}
