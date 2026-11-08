export function hello(t) {
  const h = new Date().getHours()
  return t(h < 5 ? 'hello.night' : h < 12 ? 'hello.morning' : h < 18 ? 'hello.day' : 'hello.evening')
}
