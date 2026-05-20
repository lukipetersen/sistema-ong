// Validación de CUIL/CUIT según algoritmo ANSES
export function validarCuil(cuil: string): boolean {
  const soloNumeros = cuil.replace(/[-\s]/g, '')
  if (soloNumeros.length !== 11) return false
  if (!/^\d{11}$/.test(soloNumeros)) return false

  const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  let suma = 0
  for (let i = 0; i < 10; i++) {
    suma += parseInt(soloNumeros[i]) * multiplicadores[i]
  }
  const resto = suma % 11
  const verificador = parseInt(soloNumeros[10])

  if (resto === 0) return verificador === 0
  if (resto === 1) return false
  return verificador === 11 - resto
}

export function formatearCuil(cuil: string): string {
  const soloNumeros = cuil.replace(/[-\s]/g, '')
  if (soloNumeros.length !== 11) return cuil
  return `${soloNumeros.slice(0, 2)}-${soloNumeros.slice(2, 10)}-${soloNumeros.slice(10)}`
}
