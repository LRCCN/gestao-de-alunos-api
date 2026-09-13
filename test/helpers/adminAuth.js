import request from 'supertest';

// Credenciais do admin seedado; podem ser sobrescritas via .env (ver .env.example).
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@escola.com';
const ADMIN_SENHA = process.env.ADMIN_SENHA || 'admin123';

export async function loginAsAdmin(app) {
  const resposta = await request(app)
    .post('/api/auth/login')
    .send({ email: ADMIN_EMAIL, senha: ADMIN_SENHA });

  if (resposta.status !== 200) {
    throw new Error(
      `Falha ao logar como administrador: ${resposta.status} ${JSON.stringify(resposta.body)}`
    );
  }

  return resposta.body.token;
}

export default { loginAsAdmin };
