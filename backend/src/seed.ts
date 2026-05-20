import 'dotenv/config'
import bcrypt from 'bcryptjs'
import prisma from './lib/prisma'

async function seed() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Crear sede principal
  const sede = await prisma.sede.upsert({
    where: { id: 'sede-principal' },
    update: {},
    create: {
      id: 'sede-principal',
      nombre: 'Sede Principal',
      direccion: 'Av. Corrientes 1234',
      localidad: 'Buenos Aires',
      provincia: 'Buenos Aires',
      codigoPostal: '1043',
    },
  })
  console.log(`✅ Sede creada: ${sede.nombre}`)

  // Crear usuario administrador
  const passwordHash = await bcrypt.hash('admin1234', 12)
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@ong.org' },
    update: {},
    create: {
      cuil: '20-12345678-5',
      nombre: 'Administrador',
      apellido: 'Sistema',
      email: 'admin@ong.org',
      password: passwordHash,
      rol: 'ADMINISTRADOR',
      sedeId: sede.id,
    },
  })
  console.log(`✅ Usuario admin creado: ${admin.email}`)

  // Configuración inicial de la ONG
  const configuraciones = [
    { clave: 'nombre_org', valor: 'Flor Vida Club' },
    { clave: 'cuit_org', valor: '30-12345678-9' },
    { clave: 'direccion_org', valor: 'Av. Corrientes 1234, CABA' },
    { clave: 'telefono_org', valor: '011-4567-8901' },
    { clave: 'email_org', valor: 'info@ong.org' },
    { clave: 'moneda', valor: 'ARS' },
    { clave: 'zona_horaria', valor: 'America/Argentina/Buenos_Aires' },
  ]

  for (const config of configuraciones) {
    await prisma.configuracionOrg.upsert({
      where: { clave: config.clave },
      update: { valor: config.valor },
      create: config,
    })
  }
  console.log('✅ Configuración inicial creada')

  console.log('\n🎉 Seed completado exitosamente')
  console.log('──────────────────────────────────')
  console.log('📧 Email admin:    admin@ong.org')
  console.log('🔑 Contraseña:     admin1234')
  console.log('⚠️  Cambiá la contraseña al ingresar por primera vez')
  console.log('──────────────────────────────────\n')
}

seed()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
